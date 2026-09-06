<?php

namespace Database\Seeders;

use App\Domain\Grade;
use App\Models\Allocation;
use App\Models\ClassificationLot;
use App\Models\Contract;
use App\Models\Delivery;
use App\Models\DeliveryLine;
use App\Models\DeliveryTrip;
use App\Models\DeliveryTripLine;
use App\Models\FinancialLine;
use App\Models\Partner;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WarehouseMutation;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AllocationAndDeliverySeeder extends Seeder
{
    /**
     * Pola status 6 hari historis (indeks 0 = Senin 31 Agt, indeks 5 = Sabtu 5 Sep)
     * Harus KONSISTEN dengan IntakeAndPickupSeeder::DAY_STATUS
     *
     *  idx  Tanggal       Status     Keterangan
     *  0    31 Agt (Sen)  ideal      Hari normal, alokasi sesuai ideal
     *  1    1 Sep  (Sel)  ideal      Hari normal
     *  2    2 Sep  (Rab)  ideal      Hari normal
     *  3    3 Sep  (Kam)  ideal      Hari normal
     *  4    4 Sep  (Jum)  deficit    Stok masuk kurang dari kebutuhan minimum
     *  5    5 Sep  (Sab)  overload   Stok masuk melebihi kebutuhan maksimum
     */
    private const DAY_STATUS = ['ideal', 'ideal', 'ideal', 'ideal', 'deficit', 'overload'];

    public function run(): void
    {
        $drivers = User::where('role', 'officer')->get();
        $driver1 = $drivers->firstWhere('email', 'driver1@saycle.id') ?? $drivers->first();
        $driver2 = $drivers->firstWhere('email', 'driver2@saycle.id') ?? $drivers->get(1) ?? $driver1;
        $driver3 = $drivers->firstWhere('email', 'driver3@saycle.id') ?? $drivers->get(2) ?? $driver1;
        $driver4 = $drivers->firstWhere('email', 'driver4@saycle.id') ?? $drivers->get(3) ?? $driver1;

        $vehicles = Vehicle::all();
        $vPickup  = $vehicles->get(0) ?? $vehicles->first();
        $vElf     = $vehicles->get(1) ?? $vehicles->first();
        $vGranmax = $vehicles->get(2) ?? $vehicles->first();
        $vHino    = $vehicles->get(3) ?? $vehicles->first();

        $deliveryDrivers = [
            Grade::FIT       => ['driver' => $driver1, 'vehicle' => $vPickup],
            Grade::LESS_FIT  => ['driver' => $driver2, 'vehicle' => $vElf],
            Grade::NOT_FIT   => ['driver' => $driver4, 'vehicle' => $vHino],
        ];

        // Load semua partner beserta kontrak aktif
        $allPartners = Partner::with(['contracts' => fn ($q) => $q->where('status', 'active')])->get();

        $tz = 'Asia/Jakarta';
        $today = now()->setTimezone($tz)->startOfDay();
        $yesterday = $today->copy()->subDay();
        $weekStart = Carbon::parse('2026-08-31', $tz)->startOfDay();

        $numHistoricalDays = max(1, (int) $weekStart->diffInDays($yesterday) + 1);

        // ======================================================
        // LOOP HARI HISTORIS: 31 Agt s.d. 1 hari sebelum hari komputer
        // ======================================================
        for ($dayIdx = 0; $dayIdx < $numHistoricalDays; $dayIdx++) {
            $date    = $weekStart->copy()->addDays($dayIdx);
            $dateStr = $date->toDateString();
            $status  = self::DAY_STATUS[$dayIdx % count(self::DAY_STATUS)];

            // -------------------------------------------------------
            // 1. AMBIL LOT YANG MASUK HARI INI (hasil dari IntakeSeeder)
            // -------------------------------------------------------
            $dayLots = ClassificationLot::whereDate('classified_at', $dateStr)->get();
            if ($dayLots->isEmpty()) {
                // Seharusnya tidak terjadi jika IntakeSeeder sudah berjalan
                continue;
            }

            // -------------------------------------------------------
            // 2. FILTER MITRA AKTIF HARI INI (DINAMIS — tidak hardcode)
            // Mitra mingguan hanya muncul di hari jadwalnya sendiri.
            // -------------------------------------------------------
            $scheduledPartners = $allPartners
                ->filter(fn (Partner $p) => $p->isScheduledForDate($date))
                ->values();

            if ($scheduledPartners->isEmpty()) {
                // Fallback: pakai semua mitra (kasus edge)
                $scheduledPartners = $allPartners;
            }

            // -------------------------------------------------------
            // 3. DISTRIBUSI LOT KE MITRA AKTIF PER GRADE
            // Setiap grade dialokasikan ke mitra yang punya kontrak/preferensi grade itu,
            // dan hanya mitra yang aktif pada hari ini.
            // -------------------------------------------------------
            foreach ([Grade::FIT, Grade::LESS_FIT, Grade::NOT_FIT] as $grade) {
                $gradeLots = $dayLots->where('grade', $grade)->values();
                if ($gradeLots->isEmpty()) {
                    continue;
                }

                $totalGradeKg = (float) $gradeLots->sum('kg');

                // Cari mitra yang sesuai grade dan aktif hari ini
                // Prioritas: kontrak grade persis → preferensi grade → first available
                $candidatePartners = $scheduledPartners->filter(function (Partner $p) use ($grade) {
                    $contractMatch = $p->contracts->contains(fn ($c) => $c->grade === $grade);
                    $preferMatch   = $p->grade_preference === $grade;
                    return $contractMatch || $preferMatch;
                })->values();

                if ($candidatePartners->isEmpty()) {
                    // Tidak ada mitra khusus grade ini aktif hari ini — skip (log saja)
                    continue;
                }

                // Distribusikan lot ke semua kandidat mitra yang aktif hari ini
                // secara proporsional sesuai ideal_capacity_kg mereka
                $totalIdealKg = $candidatePartners->sum(fn (Partner $p) => (float) ($p->dailyIdealKg($date) ?: $p->ideal_capacity_kg));
                if ($totalIdealKg <= 0) {
                    // Bagikan rata ke semua kandidat
                    $totalIdealKg = $candidatePartners->count();
                }

                $remainingKg = $totalGradeKg;
                $partnerCount = $candidatePartners->count();

                foreach ($candidatePartners as $partnerIdx => $partner) {
                    $contract = $partner->contracts->firstWhere('grade', $grade)
                        ?? $partner->contracts->first();

                    // Hitung porsi proporsional untuk mitra ini
                    $partnerIdealKg = (float) ($partner->dailyIdealKg($date) ?: $partner->ideal_capacity_kg);
                    $proportion     = $totalIdealKg > 0 ? $partnerIdealKg / $totalIdealKg : (1.0 / $partnerCount);

                    // Kalau mitra terakhir, ambil sisa semuanya supaya 0 stok tersisa
                    $isLastPartner  = ($partnerIdx === $partnerCount - 1);
                    $partnerKg      = $isLastPartner ? $remainingKg : round($totalGradeKg * $proportion, 2);
                    $partnerKg      = max(0.01, $partnerKg); // minimal 0.01 kg
                    $remainingKg    -= $partnerKg;

                    // Tentukan jenis alokasi berdasarkan status hari
                    $allocationType = match ($status) {
                        'deficit'  => 'minimum',
                        'overload' => 'maximum',
                        default    => 'ideal',
                    };

                    // 3a. Buat Allocation
                    $alloc = Allocation::create([
                        'partner_id'      => $partner->id,
                        'contract_id'     => $contract?->id,
                        'grade'           => $grade,
                        'source_grade'    => $grade,
                        'intended_use'    => Grade::INTENDED_USES[$grade],
                        'allocated_kg'    => $partnerKg,
                        'allocation_type' => $allocationType,
                        'status'          => 'approved',
                        'allocation_date' => $dateStr,
                        'week_start'      => $weekStart->toDateString(),
                        'period_start'    => $dateStr,
                        'period_end'      => $dateStr,
                        'notes'           => "Alokasi {$status} {$grade} → {$partner->name} ({$dateStr})",
                        'created_at'      => $date->copy()->setHour(11)->setMinute(30),
                        'updated_at'      => $date->copy()->setHour(11)->setMinute(30),
                    ]);

                    // 3b. Buat Delivery
                    $deliveryHour = 13 + ($partnerIdx % 4);
                    $delivery = Delivery::create([
                        'partner_id'   => $partner->id,
                        'contract_id'  => $contract?->id,
                        'service_date' => $dateStr,
                        'status'       => 'delivered',
                        'scheduled_for' => $date->copy()->setHour($deliveryHour)->setMinute(0),
                        'delivered_at'  => $date->copy()->setHour($deliveryHour + 1)->setMinute(30),
                        'received_by'  => 'Petugas Penerima ' . $partner->name,
                        'proof_path'   => 'proofs/hist_' . $date->format('Ymd') . '_p' . $partner->id . '.jpg',
                        'notes'        => "Pengiriman {$status} {$grade} → {$partner->name} ({$dateStr})",
                        'created_at'   => $date->copy()->setHour(12)->setMinute(0),
                        'updated_at'   => $date->copy()->setHour($deliveryHour + 1)->setMinute(30),
                    ]);

                    if ($contract) {
                        DB::table('delivery_contracts')->insertOrIgnore([
                            'delivery_id' => $delivery->id,
                            'contract_id' => $contract->id,
                        ]);
                    }

                    $driverData = $deliveryDrivers[$grade];
                    $trip = DeliveryTrip::create([
                        'delivery_id'       => $delivery->id,
                        'vehicle_id'        => $driverData['vehicle']?->id,
                        'officer_id'        => $driverData['driver']?->id,
                        'scheduled_for'     => $date->copy()->setHour($deliveryHour)->setMinute(0),
                        'stop_order'        => $partnerIdx + 1,
                        'planned_kg'        => $partnerKg,
                        'distance_m'        => 12000.00 + ($partnerIdx * 3000),
                        'duration_s'        => 1800 + ($partnerIdx * 300),
                        'status'            => 'done',
                        'estimation_source' => 'osrm',
                        'created_at'        => $date->copy()->setHour(12)->setMinute(0),
                        'updated_at'        => $date->copy()->setHour($deliveryHour + 1)->setMinute(30),
                    ]);

                    // 3c. Ambil lot grade ini dan distribusikan ke mitra ini secara proporsional
                    $lotsForThisPartner = $this->assignLotsToPartner($gradeLots, $partnerKg, $proportion, $isLastPartner);

                    foreach ($lotsForThisPartner as ['lot' => $lot, 'kg' => $lotKg]) {
                        $reservation = Reservation::create([
                            'allocation_id'         => $alloc->id,
                            'classification_lot_id' => $lot->id,
                            'grade'                 => $grade,
                            'intended_use'          => Grade::INTENDED_USES[$grade],
                            'reserved_kg'           => $lotKg,
                            'status'                => 'completed',
                            'reserved_at'           => $date->copy()->setHour(12)->setMinute(0),
                            'created_at'            => $date->copy()->setHour(12)->setMinute(0),
                            'updated_at'            => $date->copy()->setHour(12)->setMinute(0),
                        ]);

                        $line = DeliveryLine::create([
                            'delivery_id'            => $delivery->id,
                            'reservation_id'         => $reservation->id,
                            'grade'                  => $grade,
                            'intended_use'           => Grade::INTENDED_USES[$grade],
                            'kg'                     => $lotKg,
                            'unit_price_snapshot'    => $contract?->sell_price ?? 1500.00,
                            'total_amount_snapshot'  => $lotKg * ($contract?->sell_price ?? 1500.00),
                            'created_at'             => $date->copy()->setHour(12)->setMinute(0),
                            'updated_at'             => $date->copy()->setHour(12)->setMinute(0),
                        ]);

                        DeliveryTripLine::create([
                            'trip_id'          => $trip->id,
                            'delivery_line_id' => $line->id,
                            'planned_kg'       => $lotKg,
                        ]);

                        // Keluarkan stok dari gudang (stock_out)
                        WarehouseMutation::create([
                            'delivery_id'           => $delivery->id,
                            'classification_lot_id' => $lot->id,
                            'grade'                 => $grade,
                            'intended_use'          => Grade::INTENDED_USES[$grade],
                            'type'                  => 'stock_out',
                            'kg'                    => $lotKg,
                            'reference_type'        => 'delivery',
                            'reference_id'          => $delivery->id,
                            'performed_by'          => $driverData['driver']?->id,
                            'occurred_at'           => $date->copy()->setHour($deliveryHour)->setMinute(30),
                            'description'           => "Stok keluar lot {$lot->lot_code} → {$partner->name} ({$dateStr})",
                            'created_at'            => $date->copy()->setHour($deliveryHour)->setMinute(30),
                            'updated_at'            => $date->copy()->setHour($deliveryHour)->setMinute(30),
                        ]);
                    }

                    // 3d. Financial Line
                    FinancialLine::create([
                        'type'        => 'partner_invoice',
                        'direction'   => 'receivable',
                        'delivery_id' => $delivery->id,
                        'contract_id' => $contract?->id,
                        'grade'       => $grade,
                        'intended_use' => Grade::INTENDED_USES[$grade],
                        'kg'          => $partnerKg,
                        'unit_price'  => $contract?->sell_price ?? 1500.00,
                        'amount'      => $partnerKg * ($contract?->sell_price ?? 1500.00),
                        'currency'    => 'IDR',
                        'status'      => 'paid',
                        'due_at'      => $date->copy()->setHour(17)->setMinute(0),
                        'paid_at'     => $date->copy()->setHour(18)->setMinute(0),
                        'description' => "Tagihan {$partnerKg}kg {$grade} → {$partner->name} ({$dateStr})",
                        'created_at'  => $date->copy()->setHour(12)->setMinute(0),
                        'updated_at'  => $date->copy()->setHour(18)->setMinute(0),
                    ]);
                }
            }
        }
    }

    /**
     * Assign sebagian lot (secara partial) ke mitra tertentu berdasarkan kg yang dialokasikan.
     *
     * Strategi: setiap lot bisa dibagi parsial antar mitra.
     * Namun untuk simplisitas seeder, kita "tirukan" lot ke mitra
     * dengan membuat pasangan (lot, kg) berdasarkan proporsi kg mitra.
     *
     * @param  \Illuminate\Support\Collection  $gradeLots   Semua lot grade ini hari ini
     * @param  float                           $partnerKg   Total kg yang harus diterima mitra ini
     * @param  float                           $proportion  Proporsi mitra dari total
     * @param  bool                            $isLast      Apakah mitra terakhir (ambil semua sisa)
     * @return array<array{lot: ClassificationLot, kg: float}>
     */
    private function assignLotsToPartner($gradeLots, float $partnerKg, float $proportion, bool $isLast): array
    {
        $result = [];
        $assigned = 0.0;

        foreach ($gradeLots as $lot) {
            $lotShare = round((float) $lot->kg * $proportion, 2);
            $lotShare = min($lotShare, $partnerKg - $assigned);
            if ($lotShare <= 0) {
                continue;
            }

            $result[] = ['lot' => $lot, 'kg' => $lotShare];
            $assigned += $lotShare;

            if ($assigned >= $partnerKg - 0.01) {
                break;
            }
        }

        // Jika ada gap kecil karena pembulatan, tambahkan ke lot pertama
        if (! empty($result) && abs($assigned - $partnerKg) > 0.0001) {
            $result[0]['kg'] = round($result[0]['kg'] + ($partnerKg - $assigned), 2);
        }

        return $result;
    }
}
