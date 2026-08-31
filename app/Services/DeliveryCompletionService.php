<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\DeliveryTrip;
use App\Models\DeliveryTripLine;
use App\Models\FinancialLine;
use App\Models\Price;
use App\Models\Reservation;
use App\Models\WarehouseMutation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Fase 7: kurir mencatat serah-terima Mitra. Menyelesaikan trip:
 * stock-out satu kali per reservation, snapshot harga per line
 * (normal = kontrak sell_price, overcapacity = harga modal global
 * buy_price), delivery delivered, dan invoice line partner_invoice
 * dengan snapshot amount. Idempotent: retry tidak menggandakan
 * stock-out maupun invoice (firstOrCreate + unique operation index).
 */
class DeliveryCompletionService
{
    public function complete(DeliveryTrip $trip, array $data): DeliveryTrip
    {
        $disk = config('filesystems.private', 's3-private');
        $staged = null;
        try {
            $staged = $data['photo']->store('delivery-proof', $disk);

            return DB::transaction(function () use ($trip, $data, $staged) {
                $trip = DeliveryTrip::whereKey($trip->id)->lockForUpdate()->with(['lines.deliveryLine.reservation.allocation.contract', 'delivery'])->firstOrFail();
                abort_unless((int) $trip->officer_id === (int) auth()->id(), 403, 'Trip is not assigned to this officer.');
                abort_if(in_array($trip->status, ['delivered', 'cancelled'], true), 422, 'Trip already completed.');
                $delivery = Delivery::whereKey($trip->delivery_id)->lockForUpdate()->firstOrFail();
                abort_if(in_array($delivery->status, ['delivered', 'cancelled'], true), 422, 'Delivery already completed.');

                $deliveryLineIds = $trip->lines->pluck('delivery_line_id')->all();
                abort_if(count($deliveryLineIds) === 0, 422, 'Trip has no dispatchable lines.');

                // Snapshot prices + stock-out per delivered line.
                foreach ($trip->lines as $tripLine) {
                    $line = $tripLine->deliveryLine;
                    $reservation = $line?->reservation;
                    abort_if(! $reservation, 422, 'Delivery line lost its reservation.');
                    $allocation = $reservation->allocation;
                    abort_if(! $allocation, 422, 'Reservation lost its allocation.');

                    $isOvercapacity = $allocation->allocation_type === 'overcapacity';
                    $unitPrice = $isOvercapacity
                        ? app(AllocationEngine::class)->surplusPrice($line->grade)
                        : (float) ($allocation->contract->sell_price ?? 0);

                    // Snapshot on the delivery line (historical price, Fase 7).
                    $line->update([
                        'unit_price_snapshot' => $unitPrice,
                        'total_amount_snapshot' => round((float) $line->kg * $unitPrice, 2),
                    ]);

                    // Stock-out once per trip line (immutable ledger). Guard is
                    // per trip line, not per lot: one trip can dispatch the
                    // same lot through two different reservations.
                    $exists = WarehouseMutation::query()
                        ->where('type', 'stock_out')
                        ->where('reference_type', DeliveryTripLine::class)
                        ->where('reference_id', $tripLine->id)
                        ->exists();
                    if (! $exists) {
                        WarehouseMutation::create([
                            'classification_lot_id' => $reservation->classification_lot_id,
                            'type' => 'stock_out',
                            'reference_type' => DeliveryTripLine::class,
                            'reference_id' => $tripLine->id,
                            'grade' => $line->grade,
                            'intended_use' => $line->intended_use,
                            'kg' => (float) $line->kg,
                            'performed_by' => auth()->id(),
                            'occurred_at' => now(),
                            'description' => "Serah-terima Mitra (trip #{$trip->id}, reservation #{$reservation->id}).",
                        ]);
                    }

                    // Reservation lifecycle: fulfilled when fully consumed.
                    $consumed = (float) DeliveryTripLine::query()
                        ->whereHas('trip', fn ($q) => $q->whereNotIn('status', ['cancelled']))
                        ->whereHas('deliveryLine', fn ($q) => $q->where('reservation_id', $reservation->id))
                        ->sum('planned_kg');
                    $reservation->update([
                        'status' => $consumed + 0.00001 >= (float) $reservation->reserved_kg
                            ? 'fulfilled'
                            : 'partially_delivered',
                    ]);

                    // Invoice line with snapshot (normal vs overcapacity preserved).
                    // Key includes the reservation-scoped description so two
                    // lines of the same grade/kg never swallow each other.
                    $marker = $isOvercapacity ? 'harga modal' : 'normal';
                    FinancialLine::firstOrCreate(
                        [
                            'type' => 'partner_invoice',
                            'delivery_id' => $delivery->id,
                            'grade' => $line->grade,
                            'kg' => $line->kg,
                            'unit_price' => $unitPrice,
                            'description' => "Tagihan pengiriman #{$delivery->id} ({$line->grade}, {$marker}, reservation #{$reservation->id}).",
                        ],
                        [
                            'direction' => 'receivable',
                            'contract_id' => $allocation->contract_id,
                            'intended_use' => $line->intended_use,
                            'amount' => round((float) $line->kg * $unitPrice, 2),
                            'currency' => 'IDR',
                            'status' => 'issued',
                            'due_at' => now()->addDays(30),
                        ]
                    );
                }

                $trip->update(['status' => 'delivered']);
                $delivery->update([
                    'status' => 'delivered',
                    'delivered_at' => now(),
                    'received_by' => $data['received_by'],
                    'proof_path' => $staged,
                ]);

                return $trip->fresh(['lines.deliveryLine']);
            });
        } catch (\Throwable $e) {
            if ($staged) {
                Storage::disk($disk)->delete($staged);
            }
            throw $e;
        }
    }

    /**
     * Admin payment recording (D7 MVP: manual in-app recording).
     */
    public function markPaid(FinancialLine $invoice): FinancialLine
    {
        abort_unless($invoice->type === 'partner_invoice', 422, 'Only partner invoices can be marked paid.');

        // Re-check under a row lock so two concurrent pay requests cannot
        // both observe 'issued' and record the payment twice.
        return DB::transaction(function () use ($invoice) {
            $invoice = FinancialLine::whereKey($invoice->id)->lockForUpdate()->firstOrFail();
            abort_if($invoice->status === 'paid', 422, 'Invoice already paid.');

            $invoice->update(['status' => 'paid', 'paid_at' => now()]);

            return $invoice;
        });
    }
}
