<?php

namespace Database\Seeders;

use App\Domain\Grade;
use App\Models\ClassificationLot;
use App\Models\Contract;
use App\Models\FinancialLine;
use App\Models\Partner;
use App\Models\Pickup;
use App\Models\SupplierReport;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WarehouseMutation;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class IntakeAndPickupSeeder extends Seeder
{
    // Pola status 6 hari historis (indeks 0 = 31 Agt, indeks 5 = 5 Sep)
    // 0 = ideal, 1 = defisit (min), 2 = overload (max)
    //  Senin   Selasa   Rabu    Kamis    Jumat    Sabtu
    //  Ideal   Ideal   Ideal   Ideal   Defisit  Overload
    private const DAY_STATUS = ['ideal', 'ideal', 'ideal', 'ideal', 'deficit', 'overload'];

    // Faktor pengali stok masuk berdasarkan status hari
    private const STATUS_FACTOR = [
        'ideal'    => 1.0,   // stok masuk = tepat kebutuhan ideal aktif
        'deficit'  => 0.55,  // stok masuk lebih kecil dari kebutuhan minimum
        'overload' => 1.55,  // stok masuk melampaui kebutuhan maksimum
    ];

    // Proporsi grade dari total stok masuk yang realistis
    private const GRADE_PROPORTIONS = [
        Grade::FIT       => 0.38,
        Grade::LESS_FIT  => 0.40,
        Grade::NOT_FIT   => 0.22,
    ];

    public function run(): void
    {
        $drivers = User::where('role', 'officer')->get();
        $driver1 = $drivers->firstWhere('email', 'driver1@saycle.id') ?? $drivers->first();
        $driver2 = $drivers->firstWhere('email', 'driver2@saycle.id') ?? $drivers->get(1) ?? $driver1;
        $driver3 = $drivers->firstWhere('email', 'driver3@saycle.id') ?? $drivers->get(2) ?? $driver1;
        $driver4 = $drivers->firstWhere('email', 'driver4@saycle.id') ?? $drivers->get(3) ?? $driver1;

        $vehicles = Vehicle::all();
        $vPickup  = $vehicles->get(0) ?? Vehicle::first();
        $vElf     = $vehicles->get(1) ?? Vehicle::first();
        $vGranmax = $vehicles->get(2) ?? Vehicle::first();
        $vHino    = $vehicles->get(3) ?? Vehicle::first();

        // Semua mitra aktif dengan kontrak aktif
        $allPartners = Partner::with(['contracts' => fn ($q) => $q->where('status', 'active')])->get();

        $tz = 'Asia/Jakarta';
        $today = now()->setTimezone($tz)->startOfDay();
        $yesterday = $today->copy()->subDay();
        $weekStart = Carbon::parse('2026-08-31', $tz)->startOfDay();

        $numHistoricalDays = max(1, (int) $weekStart->diffInDays($yesterday) + 1);

        // ======================================================
        // BAGIAN 1: HISTORIS 31 Agustus s.d. 1 hari sebelum komputer (kemarin / H-1)
        // ======================================================
        for ($dayIdx = 0; $dayIdx < $numHistoricalDays; $dayIdx++) {
            $date   = $weekStart->copy()->addDays($dayIdx);
            $status = self::DAY_STATUS[$dayIdx % count(self::DAY_STATUS)];
            $factor = self::STATUS_FACTOR[$status];

            // Hitung total ideal harian berdasarkan mitra yang aktif pada hari ini (DINAMIS)
            $scheduledPartners = $allPartners->filter(fn (Partner $p) => $p->isScheduledForDate($date))->values();
            $totalIdealToday   = $scheduledPartners->sum(fn (Partner $p) => $p->dailyIdealKg($date));

            // Total stok masuk hari ini = ideal × faktor (realistis, bukan hardcode)
            $totalIntakeToday = $totalIdealToday * $factor;

            // Hitung target per grade
            $intakePerGrade = [];
            foreach (self::GRADE_PROPORTIONS as $grade => $proportion) {
                $intakePerGrade[$grade] = round($totalIntakeToday * $proportion, 2);
            }

            // Tentukan sumber-sumber laporan untuk hari ini (2-4 sumber)
            $supplierSources = $this->getSupplierSources($dayIdx, $driver1, $driver2, $driver3, $driver4, $vPickup, $vElf, $vGranmax, $vHino);

            // Distribusi lot ke sumber-sumber tersebut
            $this->createDayIntake($date, $dayIdx, $intakePerGrade, $supplierSources);
        }

        // ======================================================
        // BAGIAN 2: HARI INI (Waktu Komputer / Live Demo - Hari H) - LAPORAN MASUK SAJA
        // Tidak ada alokasi / delivery — hanya laporan masuk yang menunggu tindak lanjut
        // ======================================================
        $this->createDayIncomingReportOnly($today, $driver4, $vHino);
    }

    /**
     * Buat intake (laporan, pickup, lot klasifikasi, mutasi gudang) untuk 1 hari historis.
     */
    private function createDayIntake(Carbon $date, int $dayIdx, array $intakePerGrade, array $supplierSources): void
    {
        $totalSources = count($supplierSources);

        // Distribusi grade secara merata ke semua sumber
        $gradeAmountPerSource = [];
        foreach ($intakePerGrade as $grade => $totalKg) {
            $kgPerSource = $totalKg / $totalSources;
            foreach (array_keys($supplierSources) as $srcIdx) {
                $gradeAmountPerSource[$srcIdx][$grade] = round($kgPerSource, 2);
            }
        }

        $lotCounter = 1;
        foreach ($supplierSources as $srcIdx => $src) {
            $srcTotalKg = array_sum($gradeAmountPerSource[$srcIdx]);

            $report = SupplierReport::create([
                'public_id'       => 'SR-' . strtoupper(Str::random(8)),
                'contact_name'    => $src['contact'],
                'phone'           => $src['phone'],
                'estimated_kg'    => round($srcTotalKg * 0.92, 1), // estimasi sedikit di bawah aktual
                'photo_path'      => 'reports/hist_' . $date->format('Ymd') . '_' . ($srcIdx + 1) . '.jpg',
                'location_consent' => true,
                'latitude'        => $src['lat'],
                'longitude'       => $src['lng'],
                'manual_address'  => $src['address'],
                'status'          => 'closed',
                'pin_hash'        => bcrypt('123456'),
                'created_at'      => $date->copy()->subHours(4 + $srcIdx),
                'updated_at'      => $date->copy()->setHour(8)->setMinute(0)->addMinutes($srcIdx * 30),
            ]);

            $pickup = Pickup::create([
                'supplier_report_id'      => $report->id,
                'vehicle_id'              => $src['vehicle']?->id,
                'officer_id'              => $src['driver']?->id,
                'scheduled_for'           => $date->copy()->setHour(7)->setMinute(30)->addMinutes($srcIdx * 15),
                'stop_order'              => $srcIdx + 1,
                'status'                  => 'completed',
                'estimated_kg'            => round($srcTotalKg * 0.92, 1),
                'actual_total_kg'         => round($srcTotalKg, 2),
                'distance_m'              => 3500.00 + ($srcIdx * 1200),
                'duration_s'              => 900 + ($srcIdx * 300),
                'photo_path'              => 'pickups/hist_' . $date->format('Ymd') . '_' . ($srcIdx + 1) . '.jpg',
                'checkin_lat'             => $src['lat'] + 0.0002,
                'checkin_lng'             => $src['lng'] + 0.0002,
                'checked_in_at'           => $date->copy()->setHour(8)->setMinute(0)->addMinutes($srcIdx * 20),
                'completed_at'            => $date->copy()->setHour(9)->setMinute(30)->addMinutes($srcIdx * 15),
                'completion_payload_hash' => md5('hist_pickup_' . $dayIdx . '_' . $srcIdx),
                'created_at'              => $date->copy()->subHours(4),
                'updated_at'              => $date->copy()->setHour(9)->setMinute(30),
            ]);

            foreach ($gradeAmountPerSource[$srcIdx] as $grade => $gradeKg) {
                if ($gradeKg <= 0) {
                    continue;
                }

                $lotCode = 'LOT-' . $date->format('Ymd') . '-' . sprintf('%03d', $lotCounter++);
                $label   = $this->getLotLabel($grade, $src['contact'], $dayIdx);

                $lot = ClassificationLot::create([
                    'pickup_id'      => $pickup->id,
                    'lot_code'       => $lotCode,
                    'grade'          => $grade,
                    'intended_use'   => Grade::INTENDED_USES[$grade],
                    'kg'             => $gradeKg,
                    'classified_at'  => $date->copy()->setHour(10)->setMinute(30)->addMinutes(($srcIdx + array_search($grade, array_keys(self::GRADE_PROPORTIONS))) * 10),
                    'classified_by'  => $src['driver']?->id,
                    'label'          => $label,
                    'photo_path'     => 'lots/' . $lotCode . '.jpg',
                    'notes'          => 'Hasil pemilahan ' . $src['contact'] . ' hari ke-' . ($dayIdx + 1),
                    'created_at'     => $date->copy()->setHour(10)->setMinute(30),
                    'updated_at'     => $date->copy()->setHour(10)->setMinute(30),
                ]);

                WarehouseMutation::create([
                    'classification_lot_id' => $lot->id,
                    'grade'                 => $grade,
                    'intended_use'          => Grade::INTENDED_USES[$grade],
                    'type'                  => 'receipt',
                    'kg'                    => $gradeKg,
                    'reference_type'        => 'classification_lot',
                    'reference_id'          => $lot->id,
                    'performed_by'          => $src['driver']?->id,
                    'occurred_at'           => $date->copy()->setHour(11)->setMinute(0)->addMinutes($srcIdx * 5),
                    'description'           => 'Penerimaan lot ' . $lotCode . ' dari ' . $src['contact'],
                    'created_at'            => $date->copy()->setHour(11)->setMinute(0),
                    'updated_at'            => $date->copy()->setHour(11)->setMinute(0),
                ]);

                $buyPrice = match ($grade) {
                    Grade::FIT      => 1500.00,
                    Grade::LESS_FIT => 1000.00,
                    Grade::NOT_FIT  => 500.00,
                    default         => 1000.00,
                };

                FinancialLine::create([
                    'type'               => 'supplier_payment',
                    'direction'          => 'payable',
                    'supplier_report_id' => $report->id,
                    'pickup_id'          => $pickup->id,
                    'grade'              => $grade,
                    'intended_use'       => Grade::INTENDED_USES[$grade],
                    'kg'                 => $gradeKg,
                    'unit_price'         => $buyPrice,
                    'amount'             => round($gradeKg * $buyPrice, 2),
                    'currency'           => 'IDR',
                    'status'             => 'paid',
                    'due_at'             => $date->copy()->setHour(11)->setMinute(0),
                    'paid_at'            => $date->copy()->setHour(11)->setMinute(30),
                    'description'        => 'Pembayaran pasokan ' . $gradeKg . 'kg ' . $grade . ' dari ' . $src['contact'],
                    'created_at'         => $date->copy()->setHour(11)->setMinute(0),
                    'updated_at'         => $date->copy()->setHour(11)->setMinute(30),
                ]);
            }
        }
    }

    /**
     * Buat 1 laporan masuk (SupplierReport) hari ini (6 Sep) tanpa pickup & lot.
     * Status = 'submitted' — menunggu diproses oleh petugas.
     */
    private function createDayIncomingReportOnly(Carbon $today, $driver, $vehicle): void
    {
        // Laporan 1 — Pasar Induk Giwangan, laporan masuk pagi
        SupplierReport::create([
            'public_id'        => 'SR-' . strtoupper(Str::random(8)),
            'contact_name'     => 'Pak Jajang (Pasar Induk Giwangan)',
            'phone'            => '081577889900',
            'estimated_kg'     => 280.00,
            'photo_path'       => 'reports/incoming_sep06_01.jpg',
            'location_consent' => true,
            'latitude'         => -7.8290000,
            'longitude'        => 110.3840000,
            'manual_address'   => 'Jl. Imogiri Timur KM 4, Giwangan, Umbulharjo, Yogyakarta',
            'status'           => 'submitted',
            'pin_hash'         => bcrypt('123456'),
            'created_at'       => $today->copy()->setHour(6)->setMinute(15),
            'updated_at'       => $today->copy()->setHour(6)->setMinute(15),
        ]);

        // Laporan 2 — Kebun Sayur Kaliurang, baru masuk
        SupplierReport::create([
            'public_id'        => 'SR-' . strtoupper(Str::random(8)),
            'contact_name'     => 'Ibu Hartini (Kebun Sayur Kaliurang)',
            'phone'            => '081344556677',
            'estimated_kg'     => 180.00,
            'photo_path'       => 'reports/incoming_sep06_02.jpg',
            'location_consent' => true,
            'latitude'         => -7.6750000,
            'longitude'        => 110.4080000,
            'manual_address'   => 'Jl. Kaliurang KM 14, Candibinangun, Pakem, Sleman',
            'status'           => 'submitted',
            'pin_hash'         => bcrypt('123456'),
            'created_at'       => $today->copy()->setHour(6)->setMinute(45),
            'updated_at'       => $today->copy()->setHour(6)->setMinute(45),
        ]);
    }

    /**
     * Tentukan daftar supplier/sumber untuk setiap hari historis.
     * Variasi antar hari agar terlihat realistis.
     */
    private function getSupplierSources(int $dayIdx, $d1, $d2, $d3, $d4, $vP, $vE, $vG, $vH): array
    {
        $sources = [
            // Hari 0 — Senin 31 Agt: 4 sumber (pasar, kebun, katering, dll.)
            0 => [
                ['contact' => 'Pak Supardi (Pasar Beringharjo)', 'phone' => '081298765432', 'lat' => -7.7985000, 'lng' => 110.3658000, 'address' => 'Blok C No. 15, Pasar Beringharjo, Gondomanan, Yogyakarta', 'driver' => $d1, 'vehicle' => $vP],
                ['contact' => 'Ibu Maria (Pasar Kranggan)', 'phone' => '081311223344', 'lat' => -7.7828000, 'lng' => 110.3670000, 'address' => 'Jl. Poncowinatan No. 1, Gowongan, Jetis, Yogyakarta', 'driver' => $d2, 'vehicle' => $vE],
                ['contact' => 'Ibu Hartini (Kebun Sayur Kaliurang)', 'phone' => '081344556677', 'lat' => -7.6750000, 'lng' => 110.4080000, 'address' => 'Jl. Kaliurang KM 14, Candibinangun, Pakem, Sleman', 'driver' => $d3, 'vehicle' => $vG],
                ['contact' => 'Mas Rian (Restoran Organik Malioboro)', 'phone' => '081455667788', 'lat' => -7.7940000, 'lng' => 110.3650000, 'address' => 'Jl. Sosrowijayan No. 25, Gedongtengen, Yogyakarta', 'driver' => $d4, 'vehicle' => $vH],
            ],
            // Hari 1 — Selasa 1 Sep: 4 sumber
            1 => [
                ['contact' => 'Pak Jajang (Pasar Induk Giwangan)', 'phone' => '081577889900', 'lat' => -7.8290000, 'lng' => 110.3840000, 'address' => 'Jl. Imogiri Timur KM 4, Giwangan, Umbulharjo, Yogyakarta', 'driver' => $d4, 'vehicle' => $vH],
                ['contact' => 'Pak Tarno (Lapak Sayur Kasihan)', 'phone' => '081566778899', 'lat' => -7.8350000, 'lng' => 110.3320000, 'address' => 'Jl. Bantul KM 6, Tirtonirmolo, Kasihan, Bantul', 'driver' => $d2, 'vehicle' => $vE],
                ['contact' => 'Pak Slamet (Pasar Demangan)', 'phone' => '081233445566', 'lat' => -7.7832000, 'lng' => 110.3875000, 'address' => 'Jl. Gejayan No. 1, Demangan, Depok, Sleman', 'driver' => $d3, 'vehicle' => $vG],
                ['contact' => 'Ibu Sri (Warung Makan Gejayan)', 'phone' => '081677889900', 'lat' => -7.7700000, 'lng' => 110.3880000, 'address' => 'Jl. Gejayan No. 12, Caturtunggal, Depok, Sleman', 'driver' => $d1, 'vehicle' => $vP],
            ],
            // Hari 2 — Rabu 2 Sep: 4 sumber
            2 => [
                ['contact' => 'Pak Supardi (Pasar Beringharjo)', 'phone' => '081298765432', 'lat' => -7.7985000, 'lng' => 110.3658000, 'address' => 'Blok C No. 15, Pasar Beringharjo, Gondomanan, Yogyakarta', 'driver' => $d1, 'vehicle' => $vP],
                ['contact' => 'Ibu Maria (Pasar Kranggan)', 'phone' => '081311223344', 'lat' => -7.7828000, 'lng' => 110.3670000, 'address' => 'Jl. Poncowinatan No. 1, Gowongan, Jetis, Yogyakarta', 'driver' => $d2, 'vehicle' => $vE],
                ['contact' => 'Mas Danang (Pasar Imogiri Bantul)', 'phone' => '081011223344', 'lat' => -7.9150000, 'lng' => 110.3850000, 'address' => 'Jl. Imogiri Siluk, Karangtalun, Imogiri, Bantul', 'driver' => $d4, 'vehicle' => $vH],
                ['contact' => 'Bu Ani (Katering Sleman)', 'phone' => '081122334455', 'lat' => -7.7200000, 'lng' => 110.3600000, 'address' => 'Jl. Kebon Agung, Pandowoharjo, Sleman', 'driver' => $d3, 'vehicle' => $vG],
            ],
            // Hari 3 — Kamis 3 Sep: 3 sumber
            3 => [
                ['contact' => 'Pak Jajang (Pasar Induk Giwangan)', 'phone' => '081577889900', 'lat' => -7.8290000, 'lng' => 110.3840000, 'address' => 'Jl. Imogiri Timur KM 4, Giwangan, Umbulharjo, Yogyakarta', 'driver' => $d4, 'vehicle' => $vH],
                ['contact' => 'Ibu Hartini (Kebun Sayur Kaliurang)', 'phone' => '081344556677', 'lat' => -7.6750000, 'lng' => 110.4080000, 'address' => 'Jl. Kaliurang KM 14, Candibinangun, Pakem, Sleman', 'driver' => $d3, 'vehicle' => $vG],
                ['contact' => 'Mas Rian (Restoran Organik Malioboro)', 'phone' => '081455667788', 'lat' => -7.7940000, 'lng' => 110.3650000, 'address' => 'Jl. Sosrowijayan No. 25, Gedongtengen, Yogyakarta', 'driver' => $d1, 'vehicle' => $vP],
            ],
            // Hari 4 — Jumat 4 Sep: DEFISIT, hanya 2 sumber (stok sedikit)
            4 => [
                ['contact' => 'Pak Slamet (Pasar Demangan)', 'phone' => '081233445566', 'lat' => -7.7832000, 'lng' => 110.3875000, 'address' => 'Jl. Gejayan No. 1, Demangan, Depok, Sleman', 'driver' => $d3, 'vehicle' => $vG],
                ['contact' => 'Ibu Maria (Pasar Kranggan)', 'phone' => '081311223344', 'lat' => -7.7828000, 'lng' => 110.3670000, 'address' => 'Jl. Poncowinatan No. 1, Gowongan, Jetis, Yogyakarta', 'driver' => $d2, 'vehicle' => $vE],
            ],
            // Hari 5 — Sabtu 5 Sep: OVERLOAD, 4 sumber (stok melimpah)
            5 => [
                ['contact' => 'Kebun Sayur Sleman (Pak Bambang)', 'phone' => '081788990011', 'lat' => -7.7120000, 'lng' => 110.3650000, 'address' => 'Jl. Magelang KM 12, Tridadi, Sleman, Yogyakarta', 'driver' => $d3, 'vehicle' => $vG],
                ['contact' => 'Pasar Induk Giwangan (Pak Jajang)', 'phone' => '081577889900', 'lat' => -7.8290000, 'lng' => 110.3840000, 'address' => 'Jl. Imogiri Timur KM 4, Giwangan, Umbulharjo, Yogyakarta', 'driver' => $d4, 'vehicle' => $vH],
                ['contact' => 'Pasar Beringharjo (Pak Supardi)', 'phone' => '081298765432', 'lat' => -7.7985000, 'lng' => 110.3658000, 'address' => 'Blok C No. 15, Pasar Beringharjo, Gondomanan, Yogyakarta', 'driver' => $d1, 'vehicle' => $vP],
                ['contact' => 'Toko Sayur Bantul (Ibu Rini)', 'phone' => '081900123456', 'lat' => -7.8850000, 'lng' => 110.3300000, 'address' => 'Jl. Bantul KM 12, Trirenggo, Bantul, Yogyakarta', 'driver' => $d2, 'vehicle' => $vE],
            ],
        ];

        return $sources[$dayIdx % count($sources)];
    }

    /**
     * Buat label deskriptif untuk lot klasifikasi berdasarkan grade dan sumber.
     */
    private function getLotLabel(string $grade, string $contact, int $dayIdx): string
    {
        $gradeLabels = [
            Grade::FIT => [
                'Sayuran Segar Layak Konsumsi',
                'Hasil Panen Segar Pilihan',
                'Hijauan Sayur Segar Berkualitas',
                'Afkir Segar Bersih Layak',
                'Sayuran Pilih Layak Distribusi',
                'Hasil Kebun Segar Prima',
            ],
            Grade::LESS_FIT => [
                'Sayuran Agak Layu Masih Layak',
                'Afkir Pasar Kurang Layak Pakai',
                'Sisa Sortiran Kurang Layak',
                'Sayur Layu Belum Busuk',
                'Potongan Sayur Sisa Penjualan',
                'Hasil Penyortiran Kelas B',
            ],
            Grade::NOT_FIT => [
                'Limbah Organik Siap Kompos',
                'Sisa Busuk Tidak Layak Konsumsi',
                'Limbah Dapur Organik',
                'Batang & Daun Afkir',
                'Limbah Organik Basah Pasar',
                'Sisa Pemrosesan Tidak Layak',
            ],
        ];

        $labels = $gradeLabels[$grade] ?? ['Lot ' . $grade];
        return $labels[$dayIdx % count($labels)] ?? ('Lot ' . $grade . ' dari ' . $contact);
    }
}
