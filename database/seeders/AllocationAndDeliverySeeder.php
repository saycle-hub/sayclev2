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
use App\Models\Pickup;
use App\Models\Reservation;
use App\Models\SupplierReport;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AllocationAndDeliverySeeder extends Seeder
{
    public function run(): void
    {
        $drivers = User::where('role', 'officer')->get();
        $driver1 = $drivers->firstWhere('email', 'driver1@saycle.id') ?? $drivers->first();
        $driver2 = $drivers->firstWhere('email', 'driver2@saycle.id') ?? $drivers->get(1) ?? $driver1;
        $driver3 = $drivers->firstWhere('email', 'driver3@saycle.id') ?? $drivers->get(2) ?? $driver1;
        $driver4 = $drivers->firstWhere('email', 'driver4@saycle.id') ?? $drivers->get(3) ?? $driver1;

        $vehicles = Vehicle::all();
        $lots = ClassificationLot::all();

        // Find Partners & Contracts
        $composterPartner = Partner::where('name', 'like', '%Kompos%')->first();
        $composterContract = $composterPartner ? Contract::where('partner_id', $composterPartner->id)->first() : null;

        $peternakanPartner = Partner::where('name', 'like', '%Peternakan%')->first();
        $peternakanContract = $peternakanPartner ? Contract::where('partner_id', $peternakanPartner->id)->first() : null;

        $maggotPartner = Partner::where('name', 'like', '%Maggot%')->first();
        $maggotContract = $maggotPartner ? Contract::where('partner_id', $maggotPartner->id)->first() : null;

        $weekStart = now()->startOfWeek();
        $weekEnd = $weekStart->copy()->addDays(6);

        // 1. Create Weekly Allocations
        $allocations = [];
        if ($composterPartner && $composterContract) {
            $allocations[Grade::NOT_FIT] = Allocation::create([
                'partner_id' => $composterPartner->id,
                'contract_id' => $composterContract->id,
                'grade' => Grade::NOT_FIT,
                'source_grade' => Grade::NOT_FIT,
                'intended_use' => Grade::INTENDED_USES[Grade::NOT_FIT],
                'allocated_kg' => 2000.00,
                'allocation_type' => 'ideal',
                'status' => 'approved',
                'week_start' => $weekStart->toDateString(),
                'period_start' => $weekStart->toDateString(),
                'period_end' => $weekEnd->toDateString(),
                'notes' => 'Alokasi ideal limbah organik tidak layak untuk kompos',
            ]);
        }

        if ($peternakanPartner && $peternakanContract) {
            $allocations[Grade::FIT] = Allocation::create([
                'partner_id' => $peternakanPartner->id,
                'contract_id' => $peternakanContract->id,
                'grade' => Grade::FIT,
                'source_grade' => Grade::FIT,
                'intended_use' => Grade::INTENDED_USES[Grade::FIT],
                'allocated_kg' => 1500.00,
                'allocation_type' => 'minimum',
                'status' => 'approved',
                'week_start' => $weekStart->toDateString(),
                'period_start' => $weekStart->toDateString(),
                'period_end' => $weekEnd->toDateString(),
                'notes' => 'Alokasi pakan hijauan ternak Sapi Merapi',
            ]);
        }

        if ($maggotPartner && $maggotContract) {
            $allocations[Grade::LESS_FIT] = Allocation::create([
                'partner_id' => $maggotPartner->id,
                'contract_id' => $maggotContract->id,
                'grade' => Grade::LESS_FIT,
                'source_grade' => Grade::LESS_FIT,
                'intended_use' => Grade::INTENDED_USES[Grade::LESS_FIT],
                'allocated_kg' => 1200.00,
                'allocation_type' => 'ideal',
                'status' => 'approved',
                'week_start' => $weekStart->toDateString(),
                'period_start' => $weekStart->toDateString(),
                'period_end' => $weekEnd->toDateString(),
                'notes' => 'Alokasi sisa organik pakan Maggot BSF Banguntapan',
            ]);
        }

        // Create reservations linked to lots
        $reservations = [];
        foreach ($allocations as $grade => $allocation) {
            $lot = $lots->firstWhere('grade', $grade);
            $reservations[$grade] = Reservation::create([
                'allocation_id' => $allocation->id,
                'classification_lot_id' => $lot?->id,
                'grade' => $grade,
                'intended_use' => Grade::INTENDED_USES[$grade] ?? 'Pengolahan Organik',
                'reserved_kg' => (float) $allocation->allocated_kg,
                'status' => 'reserved',
                'reserved_at' => now()->subDays(1),
            ]);
        }

        // 2. Populate Scheduled Deliveries for Each Day of 1-Week Horizon
        for ($dayOffset = 0; $dayOffset < 7; $dayOffset++) {
            $serviceDate = $weekStart->copy()->addDays($dayOffset);
            $dateStr = $serviceDate->toDateString();
            $dayName = strtolower($serviceDate->englishDayOfWeek);

            // Composter (Harian)
            if ($composterPartner && $composterContract && isset($reservations[Grade::NOT_FIT])) {
                $status = $serviceDate->isPast() ? 'delivered' : ($serviceDate->isToday() ? 'in_transit' : 'assigned');
                $d = Delivery::create([
                    'partner_id' => $composterPartner->id,
                    'contract_id' => $composterContract->id,
                    'service_date' => $dateStr,
                    'status' => $status,
                    'scheduled_for' => $serviceDate->copy()->setHour(8)->setMinute(30),
                    'delivered_at' => $serviceDate->isPast() ? $serviceDate->copy()->setHour(10)->setMinute(45) : null,
                    'received_by' => $serviceDate->isPast() ? 'Budi Composter' : null,
                    'proof_path' => $serviceDate->isPast() ? 'proofs/delivery_composter.jpg' : null,
                    'notes' => "Pengiriman harian kompos organik ke PT Kompos Organik Sentolo ($dateStr)",
                ]);

                DB::table('delivery_contracts')->insertOrIgnore(['delivery_id' => $d->id, 'contract_id' => $composterContract->id]);

                $line = DeliveryLine::create([
                    'delivery_id' => $d->id,
                    'reservation_id' => $reservations[Grade::NOT_FIT]->id,
                    'grade' => Grade::NOT_FIT,
                    'intended_use' => Grade::INTENDED_USES[Grade::NOT_FIT],
                    'kg' => 190.00,
                    'unit_price_snapshot' => 1000.00,
                    'total_amount_snapshot' => 190000.00,
                ]);

                $veh = $vehicles->get(3) ?? $vehicles->first(); // Hino Dutro / Elf
                $trip = DeliveryTrip::create([
                    'delivery_id' => $d->id,
                    'vehicle_id' => $veh?->id,
                    'officer_id' => $driver4?->id,
                    'scheduled_for' => $serviceDate->copy()->setHour(8)->setMinute(30),
                    'stop_order' => 1,
                    'planned_kg' => 190.00,
                    'distance_m' => 27000.00,
                    'duration_s' => 1320,
                    'status' => $serviceDate->isPast() ? 'done' : 'assigned',
                    'estimation_source' => 'osrm',
                ]);

                DeliveryTripLine::create(['trip_id' => $trip->id, 'delivery_line_id' => $line->id, 'planned_kg' => 190.00]);

                if ($serviceDate->isPast()) {
                    FinancialLine::create([
                        'type' => 'partner_invoice',
                        'direction' => 'receivable',
                        'delivery_id' => $d->id,
                        'contract_id' => $composterContract->id,
                        'grade' => Grade::NOT_FIT,
                        'intended_use' => Grade::INTENDED_USES[Grade::NOT_FIT],
                        'kg' => 190.00,
                        'unit_price' => 1000.00,
                        'amount' => 190000.00,
                        'currency' => 'IDR',
                        'status' => 'paid',
                        'due_at' => $serviceDate,
                        'paid_at' => $serviceDate,
                        'description' => "Tagihan Pengiriman 190kg Kompos ($dateStr)",
                    ]);
                }
            }

            // Peternakan Sapi Merapi (Harian)
            if ($peternakanPartner && $peternakanContract && isset($reservations[Grade::FIT])) {
                $status = $serviceDate->isPast() ? 'delivered' : 'assigned';
                $d = Delivery::create([
                    'partner_id' => $peternakanPartner->id,
                    'contract_id' => $peternakanContract->id,
                    'service_date' => $dateStr,
                    'status' => $status,
                    'scheduled_for' => $serviceDate->copy()->setHour(10)->setMinute(0),
                    'delivered_at' => $serviceDate->isPast() ? $serviceDate->copy()->setHour(11)->setMinute(30) : null,
                    'received_by' => $serviceDate->isPast() ? 'Pak Deden Peternak' : null,
                    'notes' => "Pengiriman harian pakan ternak ke Cangkringan ($dateStr)",
                ]);

                DB::table('delivery_contracts')->insertOrIgnore(['delivery_id' => $d->id, 'contract_id' => $peternakanContract->id]);

                $line = DeliveryLine::create([
                    'delivery_id' => $d->id,
                    'reservation_id' => $reservations[Grade::FIT]->id,
                    'grade' => Grade::FIT,
                    'intended_use' => Grade::INTENDED_USES[Grade::FIT],
                    'kg' => 300.00,
                    'unit_price_snapshot' => 2500.00,
                    'total_amount_snapshot' => 750000.00,
                ]);

                $veh = $vehicles->get(0) ?? $vehicles->first(); // Pickup L300
                $trip = DeliveryTrip::create([
                    'delivery_id' => $d->id,
                    'vehicle_id' => $veh?->id,
                    'officer_id' => $driver1?->id,
                    'scheduled_for' => $serviceDate->copy()->setHour(10)->setMinute(0),
                    'stop_order' => 1,
                    'planned_kg' => 300.00,
                    'distance_m' => 18000.00,
                    'duration_s' => 3600,
                    'status' => $serviceDate->isPast() ? 'done' : 'assigned',
                    'estimation_source' => 'haversine',
                ]);

                DeliveryTripLine::create(['trip_id' => $trip->id, 'delivery_line_id' => $line->id, 'planned_kg' => 300.00]);

                if ($serviceDate->isPast()) {
                    FinancialLine::create([
                        'type' => 'partner_invoice',
                        'direction' => 'receivable',
                        'delivery_id' => $d->id,
                        'contract_id' => $peternakanContract->id,
                        'grade' => Grade::FIT,
                        'intended_use' => Grade::INTENDED_USES[Grade::FIT],
                        'kg' => 300.00,
                        'unit_price' => 2500.00,
                        'amount' => 750000.00,
                        'currency' => 'IDR',
                        'status' => 'issued',
                        'due_at' => $serviceDate->copy()->addDays(7),
                        'paid_at' => null,
                        'description' => "Tagihan Pakan Ternak 300kg ($dateStr)",
                    ]);
                }
            }

            // Maggot BSF (Mingguan on Monday, Wednesday, Friday)
            if (in_array($dayName, ['monday', 'wednesday', 'friday'], true) && $maggotPartner && $maggotContract && isset($reservations[Grade::LESS_FIT])) {
                $d = Delivery::create([
                    'partner_id' => $maggotPartner->id,
                    'contract_id' => $maggotContract->id,
                    'service_date' => $dateStr,
                    'status' => $serviceDate->isPast() ? 'delivered' : 'planned',
                    'scheduled_for' => $serviceDate->copy()->setHour(13)->setMinute(0),
                    'notes' => "Pengiriman mingguan pakan Maggot BSF Banguntapan ($dateStr)",
                ]);

                DB::table('delivery_contracts')->insertOrIgnore(['delivery_id' => $d->id, 'contract_id' => $maggotContract->id]);

                $line = DeliveryLine::create([
                    'delivery_id' => $d->id,
                    'reservation_id' => $reservations[Grade::LESS_FIT]->id,
                    'grade' => Grade::LESS_FIT,
                    'intended_use' => Grade::INTENDED_USES[Grade::LESS_FIT],
                    'kg' => 150.00,
                    'unit_price_snapshot' => 1800.00,
                    'total_amount_snapshot' => 270000.00,
                ]);

                $veh = $vehicles->get(1) ?? $vehicles->first(); // Isuzu Elf
                $trip = DeliveryTrip::create([
                    'delivery_id' => $d->id,
                    'vehicle_id' => $veh?->id,
                    'officer_id' => $driver2?->id,
                    'scheduled_for' => $serviceDate->copy()->setHour(13)->setMinute(0),
                    'stop_order' => 1,
                    'planned_kg' => 150.00,
                    'distance_m' => 14000.00,
                    'duration_s' => 2100,
                    'status' => $serviceDate->isPast() ? 'done' : 'assigned',
                    'estimation_source' => 'osrm',
                ]);

                DeliveryTripLine::create(['trip_id' => $trip->id, 'delivery_line_id' => $line->id, 'planned_kg' => 150.00]);
            }
        }

        // Payable Financial Line for Supplier Purchase
        $pickup = Pickup::where('status', 'completed')->first();
        $report = SupplierReport::first();
        if ($pickup && $report) {
            FinancialLine::create([
                'type' => 'supplier_payment',
                'direction' => 'payable',
                'supplier_report_id' => $report->id,
                'pickup_id' => $pickup->id,
                'grade' => Grade::LESS_FIT,
                'intended_use' => Grade::INTENDED_USES[Grade::LESS_FIT],
                'kg' => 890.00,
                'unit_price' => 1000.00,
                'amount' => 890000.00,
                'currency' => 'IDR',
                'status' => 'paid',
                'due_at' => now()->subHours(4),
                'paid_at' => now()->subHours(2),
                'description' => 'Pembayaran Pembelian 890kg Limbah Organik Pasar Beringharjo',
            ]);
        }
    }
}
