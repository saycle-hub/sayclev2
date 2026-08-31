<?php

namespace App\Services;

use App\Domain\Grade;
use App\Models\ClassificationLot;
use App\Models\FinancialLine;
use App\Models\Pickup;
use App\Models\Price;
use App\Models\WarehouseMutation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PickupCheckinService
{
    public function complete(Pickup $sourcePickup, array $data): Pickup
    {
        $hash = $this->hash($data);
        $this->validateGrades($data);
        $disk = config('filesystems.private', 's3-private');
        $staged = [];
        try {
            $staged[] = $data['photo']->store('pickup-evidence', $disk);
            if (isset($data['rejection_photo'])) $staged[] = $data['rejection_photo']->store('pickup-evidence', $disk);
            return DB::transaction(function () use ($sourcePickup, $data, $hash, $staged) {
                $pickup = Pickup::whereKey($sourcePickup->id)->lockForUpdate()->with('supplierReport')->firstOrFail();
                abort_unless((int) $pickup->officer_id === (int) auth()->id(), 403, 'Pickup is not assigned to this officer.');
                abort_if($pickup->completion_payload_hash && $pickup->completion_payload_hash !== $hash, 422, 'Completed pickup cannot be changed.');
                if ($pickup->completion_payload_hash === $hash && in_array($pickup->status, ['completed', 'supplier_rejected'], true)) return $pickup;
                abort_unless(in_array($pickup->status, ['assigned', 'in_progress'], true), 422, 'Invalid pickup lifecycle status.');
                $report = $pickup->supplierReport;
                abort_if(!$report, 422, 'Supplier report unavailable.');
                abort_if($report->latitude === null || $report->longitude === null, 422, 'Supplier destination unavailable.');
                abort_if($this->distance((float) $report->latitude, (float) $report->longitude, (float) $data['checkin_lat'], (float) $data['checkin_lng']) > (float) config('saycle.pickup_gps_tolerance_m', 50), 422, 'Coordinates outside pickup location tolerance.');

                if ($data['supplier_rejected'] ?? false) {
                    $pickup->update(['status' => 'supplier_rejected', 'refusal_reason' => $data['refusal_reason'], 'rejected_at' => now(), 'completed_at' => null, 'photo_path' => $staged[0], 'rejection_photo_path' => $staged[1], 'checkin_lat' => $data['checkin_lat'], 'checkin_lng' => $data['checkin_lng'], 'checked_in_at' => now(), 'actual_total_kg' => 0, 'completion_payload_hash' => $hash]);
                    $report->update(['status' => 'supplier_rejected']);
                    return $pickup;
                }

                $total = round((float) $data['actual_total_kg'], 2);
                $lots = [];
                foreach ($data['grades'] as $row) {
                    $kg = (float) $row['kg'];
                    $lots[] = ClassificationLot::firstOrCreate(['pickup_id' => $pickup->id, 'grade' => $row['grade']], ['grade' => $row['grade'], 'intended_use' => Grade::INTENDED_USES[$row['grade']], 'kg' => $kg, 'classified_at' => now(), 'classified_by' => auth()->id()]);
                }
                foreach ($lots as $lot) WarehouseMutation::firstOrCreate(['classification_lot_id' => $lot->id, 'type' => 'receipt', 'reference_type' => Pickup::class, 'reference_id' => $pickup->id], ['grade' => $lot->grade, 'intended_use' => $lot->intended_use, 'kg' => $lot->kg, 'performed_by' => auth()->id(), 'occurred_at' => now()]);
                $buyPrices = Price::query()->whereIn('grade', Grade::ALL)->get()->keyBy('grade');
                foreach ($lots as $lot) {
                    $unitPrice = (float) ($buyPrices[$lot->grade]->buy_price ?? 0);
                    FinancialLine::firstOrCreate(
                        ['type' => FinancialLine::TYPES[0], 'pickup_id' => $pickup->id, 'grade' => $lot->grade],
                        ['direction' => 'payable', 'supplier_report_id' => $pickup->supplier_report_id, 'intended_use' => $lot->intended_use, 'kg' => $lot->kg, 'unit_price' => $unitPrice, 'amount' => round($lot->kg * $unitPrice, 2), 'currency' => 'IDR', 'status' => 'issued', 'description' => "Pembayaran pemasok atas klasifikasi pickup #{$pickup->id} ({$lot->grade})."]
                    );
                }
                $pickup->update(['status' => 'completed', 'photo_path' => $staged[0], 'checkin_lat' => $data['checkin_lat'], 'checkin_lng' => $data['checkin_lng'], 'checked_in_at' => now(), 'completed_at' => now(), 'actual_total_kg' => $total, 'refusal_reason' => null, 'rejected_at' => null, 'rejection_photo_path' => null, 'completion_payload_hash' => $hash]);
                $report->update(['status' => 'picked_up']);
                return $pickup;
            });
        } catch (\Throwable $e) {
            if ($staged) Storage::disk($disk)->delete($staged);
            throw $e;
        }
    }

    private function validateGrades(array $data): void
    {
        if ($data['supplier_rejected'] ?? false) {
            abort_unless((float) ($data['actual_total_kg'] ?? 0) == 0.0, 422, 'Rejected pickup must have zero accepted kg.');
            return;
        }
        abort_if($data['refusal_reason'] ?? false, 422, 'Refusal reason requires rejection.');
        $total = round((float) ($data['actual_total_kg'] ?? 0), 2);
        $grades = collect($data['grades'] ?? []);
        abort_unless($total > 0 && round((float) $grades->sum('kg'), 2) === $total, 422, 'Classification total must equal accepted actual kg exactly.');
        abort_unless($grades->pluck('grade')->duplicates()->isEmpty(), 422, 'Duplicate grade submission.');
        foreach ($grades as $row) abort_unless(in_array($row['grade'], Grade::ALL, true) && (float) $row['kg'] > 0, 422, 'Invalid grade payload.');
    }

    private function hash(array $data): string
    {
        return hash('sha256', json_encode(collect($data)->except(['photo', 'rejection_photo'])->sortKeys()->toArray()) . '|' . hash_file('sha256', $data['photo']->getRealPath()) . (isset($data['rejection_photo']) ? '|' . hash_file('sha256', $data['rejection_photo']->getRealPath()) : ''));
    }

    private function distance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $a = sin(deg2rad($lat2 - $lat1) / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin(deg2rad($lng2 - $lng1) / 2) ** 2;
        return 6371000 * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
