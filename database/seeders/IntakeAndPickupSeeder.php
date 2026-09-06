<?php

namespace Database\Seeders;

use App\Domain\Grade;
use App\Models\ClassificationLot;
use App\Models\Pickup;
use App\Models\PickupTask;
use App\Models\SupplierReport;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WarehouseMutation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class IntakeAndPickupSeeder extends Seeder
{
    public function run(): void
    {
        $officer = User::where('role', 'officer')->first();
        if (!$officer) {
            $officer = User::create([
                'name' => 'Budi Petugas Lapangan',
                'email' => 'officer.lapangan@saycle.com',
                'role' => 'officer',
                'password' => bcrypt('officer123456'),
            ]);
        }

        $vehicle = Vehicle::first();

        // 1. Supplier Report 1 (Completed & Sorted)
        $report1 = SupplierReport::create([
            'public_id' => 'SR-' . strtoupper(Str::random(8)),
            'contact_name' => 'Bapak Supardi (Koordinator Lapak Pasar Beringharjo)',
            'phone' => '081298765432',
            'estimated_kg' => 850.00,
            'photo_path' => 'reports/pasar_beringharjo_01.jpg',
            'location_consent' => true,
            'latitude' => -7.7985000,
            'longitude' => 110.3658000,
            'manual_address' => 'Blok C No. 15, Pasar Beringharjo, Gondomanan, Yogyakarta',
            'status' => 'closed',
            'pin_hash' => bcrypt('123456'),
        ]);

        $pickup1 = Pickup::create([
            'supplier_report_id' => $report1->id,
            'vehicle_id' => $vehicle ? $vehicle->id : null,
            'officer_id' => $officer->id,
            'scheduled_for' => now()->subHours(6),
            'stop_order' => 1,
            'status' => 'completed',
            'estimated_kg' => 850.00,
            'actual_total_kg' => 890.00,
            'distance_m' => 4500.00,
            'duration_s' => 1200,
            'photo_path' => 'pickups/checkin_01.jpg',
            'checkin_lat' => -7.7985100,
            'checkin_lng' => 110.3658500,
            'checked_in_at' => now()->subHours(5),
            'completed_at' => now()->subHours(4),
            'completion_payload_hash' => md5('pickup1_complete'),
        ]);

        // Classification Lot 1 (Grade Fit - Layak)
        $lot1 = ClassificationLot::create([
            'pickup_id' => $pickup1->id,
            'lot_code' => 'LOT-' . date('Ymd') . '-001',
            'grade' => Grade::FIT,
            'intended_use' => Grade::INTENDED_USES[Grade::FIT],
            'kg' => 300.00,
            'classified_at' => now()->subHours(3),
            'classified_by' => $officer->id,
            'label' => 'Sisa Kol & Sawi Segar Beringharjo',
            'photo_path' => 'lots/lot_001.jpg',
            'notes' => 'Sortir hasil penjemputan Pasar Beringharjo - Kualitas Bagus',
        ]);

        // Classification Lot 2 (Grade Less Fit - Kurang Layak)
        $lot2 = ClassificationLot::create([
            'pickup_id' => $pickup1->id,
            'lot_code' => 'LOT-' . date('Ymd') . '-002',
            'grade' => Grade::LESS_FIT,
            'intended_use' => Grade::INTENDED_USES[Grade::LESS_FIT],
            'kg' => 450.00,
            'classified_at' => now()->subHours(3),
            'classified_by' => $officer->id,
            'label' => 'Sisa Tomat & Buncis Agak Layu',
            'photo_path' => 'lots/lot_002.jpg',
            'notes' => 'Cocok untuk pakan Maggot BSF',
        ]);

        // Classification Lot 3 (Grade Not Fit - Tidak Layak)
        $lot3 = ClassificationLot::create([
            'pickup_id' => $pickup1->id,
            'lot_code' => 'LOT-' . date('Ymd') . '-003',
            'grade' => Grade::NOT_FIT,
            'intended_use' => Grade::INTENDED_USES[Grade::NOT_FIT],
            'kg' => 140.00,
            'classified_at' => now()->subHours(3),
            'classified_by' => $officer->id,
            'label' => 'Limbah Organik Busuk',
            'photo_path' => 'lots/lot_003.jpg',
            'notes' => 'Diolah menjadi pupuk kompos',
        ]);

        // Warehouse Mutations for the lots
        foreach ([$lot1, $lot2, $lot3] as $lot) {
            WarehouseMutation::create([
                'classification_lot_id' => $lot->id,
                'grade' => $lot->grade,
                'intended_use' => $lot->intended_use,
                'type' => 'receipt',
                'kg' => $lot->kg,
                'reference_type' => 'classification_lot',
                'reference_id' => $lot->id,
                'performed_by' => $officer->id,
                'occurred_at' => now()->subHours(3),
                'description' => 'Penerimaan hasil pemilahan Lot ' . $lot->lot_code,
            ]);
        }

        // 2. Supplier Report 2 (Pickup Scheduled / In Progress)
        $report2 = SupplierReport::create([
            'public_id' => 'SR-' . strtoupper(Str::random(8)),
            'contact_name' => 'Ibu Maria (Pasar Kranggan Jogja)',
            'phone' => '081311223344',
            'estimated_kg' => 350.00,
            'photo_path' => 'reports/pasar_kranggan_02.jpg',
            'location_consent' => true,
            'latitude' => -7.7828000,
            'longitude' => 110.3670000,
            'manual_address' => 'Jl. Poncowinatan No. 1, Gowongan, Jetis, Yogyakarta',
            'status' => 'pickup_scheduled',
            'pin_hash' => bcrypt('123456'),
        ]);

        Pickup::create([
            'supplier_report_id' => $report2->id,
            'vehicle_id' => $vehicle ? $vehicle->id : null,
            'officer_id' => $officer->id,
            'scheduled_for' => now()->addHours(2),
            'stop_order' => 2,
            'status' => 'in_progress',
            'estimated_kg' => 350.00,
            'actual_total_kg' => null,
            'distance_m' => 3200.00,
            'duration_s' => 900,
        ]);

        // 3. Supplier Report 3 (Submitted - Pending Review)
        SupplierReport::create([
            'public_id' => 'SR-' . strtoupper(Str::random(8)),
            'contact_name' => 'Pak Jajang (Pasar Induk Giwangan)',
            'phone' => '081577889900',
            'estimated_kg' => 600.00,
            'photo_path' => 'reports/pasar_giwangan_03.jpg',
            'location_consent' => true,
            'latitude' => -7.8290000,
            'longitude' => 110.3840000,
            'manual_address' => 'Jl. Imogiri Timur KM 4, Giwangan, Umbulharjo, Yogyakarta',
            'status' => 'submitted',
            'pin_hash' => bcrypt('123456'),
        ]);

        // 4. Accepted Supplier Reports ready for Route Optimization Map
        $acceptedReports = [
            [
                'contact_name' => 'Pasar Demangan Jogja (Pak Slamet)',
                'phone' => '081233445566',
                'estimated_kg' => 450.00,
                'manual_address' => 'Jl. Gejayan No. 1, Demangan, Depok, Sleman, Yogyakarta',
                'latitude' => -7.7832000,
                'longitude' => 110.3875000,
            ],
            [
                'contact_name' => 'Kebun Sayur Kaliurang (Ibu Hartini)',
                'phone' => '081344556677',
                'estimated_kg' => 700.00,
                'manual_address' => 'Jl. Kaliurang KM 14, Candibinangun, Pakem, Sleman',
                'latitude' => -7.6750000,
                'longitude' => 110.4080000,
            ],
            [
                'contact_name' => 'Restoran Organik Malioboro (Mas Rian)',
                'phone' => '081455667788',
                'estimated_kg' => 300.00,
                'manual_address' => 'Jl. Sosrowijayan No. 25, Sosromenduran, Gedongtengen, Yogyakarta',
                'latitude' => -7.7940000,
                'longitude' => 110.3650000,
            ],
            [
                'contact_name' => 'Lapak Sayur Kasihan (Pak Tarno)',
                'phone' => '081566778899',
                'estimated_kg' => 850.00,
                'manual_address' => 'Jl. Bantul KM 6, Tirtonirmolo, Kasihan, Bantul',
                'latitude' => -7.8350000,
                'longitude' => 110.3320000,
            ],
            [
                'contact_name' => 'Kolektor Sayur Maguwoharjo (Pak Hendro)',
                'phone' => '081677889900',
                'estimated_kg' => 500.00,
                'manual_address' => 'Jl. Ringroad Utara, Maguwoharjo, Depok, Sleman',
                'latitude' => -7.7650000,
                'longitude' => 110.4320000,
            ],
        ];

        foreach ($acceptedReports as $acc) {
            SupplierReport::create([
                'public_id' => 'SR-' . strtoupper(Str::random(8)),
                'contact_name' => $acc['contact_name'],
                'phone' => $acc['phone'],
                'estimated_kg' => $acc['estimated_kg'],
                'photo_path' => 'reports/sample_accepted.jpg',
                'location_consent' => true,
                'latitude' => $acc['latitude'],
                'longitude' => $acc['longitude'],
                'manual_address' => $acc['manual_address'],
                'status' => 'accepted',
                'pin_hash' => bcrypt('123456'),
            ]);
        }
    }
}
