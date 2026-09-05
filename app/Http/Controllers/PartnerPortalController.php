<?php

namespace App\Http\Controllers;

use App\Models\Allocation;
use App\Models\Contract;
use App\Models\Delivery;
use App\Models\FinancialLine;
use App\Models\Partner;
use App\Models\Price;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Partner self-service portal (Fase 7). Separate from PartnerController,
 * which is the admin CRUD. All pages scope data to the authenticated
 * user's partner record via partner() or firstOrFail().
 *
 * C5 fix: billing and deliveries read canonical delivery/invoice records,
 * never supplier pickups.
 */
class PartnerPortalController extends Controller
{
    public function index(Request $request): Response
    {
        $partner = $this->partner($request);

        $stats = $partner ? $this->stats($partner) : null;
        $activeContract = $partner
            ? Contract::query()
                ->where('partner_id', $partner->id)
                ->where('status', 'active')
                ->orderByDesc('start_date')
                ->orderByDesc('created_at')
                ->first()
            : null;

        return Inertia::render('partner/index', [
            'partner' => $partner ? $this->partnerSummary($partner) : null,
            'stats' => $stats,
            'contract' => $activeContract ? $this->contractRow($activeContract) : null,
            'allocations' => $partner ? $this->allocationRows($partner) : [],
        ]);
    }

    public function deliveries(Request $request): Response
    {
        $partner = $this->partner($request);

        $deliveries = collect();
        if ($partner) {
            $deliveries = Delivery::query()
                ->where('partner_id', $partner->id)
                ->with(['lines', 'trips.vehicle:id,name', 'trips.officer:id,name'])
                ->orderByDesc('service_date')
                ->limit(100)
                ->get()
                ->map(fn (Delivery $d) => $this->canonicalDeliveryRow($d));
        }

        return Inertia::render('partner/deliveries', ['deliveries' => $deliveries]);
    }

    public function contract(Request $request): Response
    {
        $partner = $this->partner($request);

        $contracts = collect();
        if ($partner) {
            $contracts = Contract::query()
                ->where('partner_id', $partner->id)
                ->orderByDesc('start_date')
                ->orderByDesc('created_at')
                ->get()
                ->map(fn (Contract $c) => $this->contractRow($c));
        }

        return Inertia::render('partner/contract', ['contracts' => $contracts]);
    }

    public function billing(Request $request): Response
    {
        $partner = $this->partner($request);

        $breakdown = collect(Price::GRADES)->map(fn (string $grade) => [
            'grade' => $grade,
            'kg' => 0.0,
            'unit_price' => 0.0,
            'total' => 0.0,
            'deliveries' => 0,
        ])->values();

        if ($partner) {
            // Invoices are created at delivery completion with snapshot prices
            // (normal contract price vs overcapacity cost price). C5: never
            // derived from supplier pickups.
            $invoices = FinancialLine::query()
                ->where('type', 'partner_invoice')
                ->where('direction', 'receivable')
                ->whereHas('delivery', fn ($q) => $q->where('partner_id', $partner->id))
                ->with('delivery:id')
                ->get();

            $byGrade = $invoices->groupBy('grade')->map(fn ($group, string $grade) => [
                'grade' => $grade,
                'kg' => round((float) $group->sum('kg'), 2),
                'unit_price' => (float) $group->avg('unit_price'),
                'deliveries' => $group->pluck('delivery_id')->unique()->count(),
                // Subtotal from the immutable snapshot amounts, never
                // recomputed from current prices.
                'total' => round((float) $group->sum('amount'), 2),
            ]);

            $breakdown = $breakdown->map(function (array $row) use ($byGrade) {
                $found = $byGrade->get($row['grade']);

                return $found ? [...$row, ...$found] : $row;
            })->values();
        }

        return Inertia::render('partner/billing', [
            'breakdown' => $breakdown,
            'grandTotal' => round($breakdown->sum('total'), 2),
            'totalKg' => round($breakdown->sum('kg'), 2),
        ]);
    }

    private function partner(Request $request): ?Partner
    {
        return Partner::query()->where('user_id', $request->user()->id)->first();
    }

    private function partnerSummary(Partner $partner): array
    {
        return [
            'id' => $partner->id,
            'name' => $partner->name,
            'grade_preference' => $partner->grade_preference,
            'frequency' => $partner->frequency,
        ];
    }

    /**
     * Overview counters: canonical delivery status counts, this week's
     * allocation, and unpaid invoice total (C5: from financial_lines,
     * never from supplier pickups).
     *
     * @return array<string, float|int>
     */
    private function stats(Partner $partner): array
    {
        $deliveryQuery = Delivery::query()->where('partner_id', $partner->id);
        $done = (clone $deliveryQuery)->where('status', 'delivered')->count();
        $pending = (clone $deliveryQuery)->whereIn('status', ['planned', 'assigned', 'in_transit'])->count();

        $weekStart = Carbon::now()->startOfWeek()->toDateString();
        $allocatedKg = (float) Allocation::query()
            ->where('partner_id', $partner->id)
            ->whereDate('week_start', $weekStart)
            ->where('status', 'approved')
            ->sum('allocated_kg');

        $billing = (float) FinancialLine::query()
            ->where('type', 'partner_invoice')
            ->where('direction', 'receivable')
            ->whereIn('status', ['issued', 'due'])
            ->whereHas('delivery', fn ($q) => $q->where('partner_id', $partner->id))
            ->sum('amount');

        return [
            'pending' => $pending,
            'done' => $done,
            'allocated_kg' => round($allocatedKg, 2),
            'billing' => round($billing, 2),
        ];
    }

    /**
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function allocationRows(Partner $partner): \Illuminate\Support\Collection
    {
        return Allocation::query()
            ->where('partner_id', $partner->id)
            ->whereDate('week_start', Carbon::now()->startOfWeek()->toDateString())
            ->orderBy('grade')
            ->get()
            ->map(fn (Allocation $a) => [
                'grade' => $a->grade,
                'allocated_kg' => (float) $a->allocated_kg,
                'allocation_type' => $a->allocation_type,
                'status' => $a->status,
            ]);
    }

    private function canonicalDeliveryRow(Delivery $d): array
    {
        return [
            'id' => $d->id,
            'status' => $d->status,
            'status_label' => $this->deliveryStatusLabel($d->status),
            'service_date' => $d->service_date?->toDateString(),
            'delivered_at' => $d->delivered_at?->toISOString(),
            'received_by' => $d->received_by,
            'lines' => $d->lines->map(fn ($line) => [
                'grade' => $line->grade,
                'intended_use' => $line->intended_use,
                'kg' => (float) $line->kg,
                'unit_price_snapshot' => $line->unit_price_snapshot !== null ? (float) $line->unit_price_snapshot : null,
                'total_amount_snapshot' => $line->total_amount_snapshot !== null ? (float) $line->total_amount_snapshot : null,
            ]),
            'trips' => $d->trips->map(fn ($trip) => [
                'status' => $trip->status,
                'vehicle' => $trip->vehicle?->name,
                'officer' => $trip->officer?->name,
            ]),
        ];
    }

    private function deliveryStatusLabel(string $status): string
    {
        return match ($status) {
            'planned' => 'Dijadwalkan',
            'assigned' => 'Ditugaskan',
            'in_transit' => 'Berjalan',
            'delivered' => 'Selesai',
            'failed' => 'Gagal',
            'cancelled' => 'Dibatalkan',
            default => $status,
        };
    }

    private function contractRow(Contract $c): array
    {
        return [
            'id' => $c->id,
            'name' => $c->name,
            'status' => $c->status,
            'grade' => $c->grade,
            'min_capacity_kg' => (float) $c->min_capacity_kg,
            'ideal_capacity_kg' => (float) $c->ideal_capacity_kg,
            'max_capacity_kg' => (float) $c->max_capacity_kg,
            'frequency' => $c->frequency,
            'receiving_days' => $c->frequency === 'harian' ? [] : ($c->receiving_days ?? []),
            'schedule_summary' => $this->scheduleSummary($c->frequency, $c->receiving_days),
            'buy_price' => (float) $c->buy_price,
            'sell_price' => (float) $c->sell_price,
            'start_date' => $c->start_date?->toDateString(),
            'end_date' => $c->end_date?->toDateString(),
        ];
    }

    private function scheduleSummary(string $frequency, ?array $days): string
    {
        if ($frequency === 'harian') return 'Setiap hari';
        $labels = ['monday' => 'Senin', 'tuesday' => 'Selasa', 'wednesday' => 'Rabu', 'thursday' => 'Kamis', 'friday' => 'Jumat', 'saturday' => 'Sabtu', 'sunday' => 'Minggu'];
        return 'Setiap '.implode(', ', array_map(fn (string $day) => $labels[$day] ?? $day, $days ?? []));
    }
}
