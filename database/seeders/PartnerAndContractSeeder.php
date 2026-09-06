<?php

namespace Database\Seeders;

use App\Domain\Grade;
use App\Models\Contract;
use App\Models\Partner;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PartnerAndContractSeeder extends Seeder
{
    public function run(): void
    {
        $partnerDataList = [
            [
                'user_email' => 'mitra.composter@saycle.com',
                'user_name' => 'Pak Joko Kompos',
                'name' => 'PT Kompos Organik Sentolo Jogja',
                'address' => 'Jl. Brosot-Sentolo KM 4, Sentolo, Kulon Progo, D.I. Yogyakarta',
                'latitude' => -7.8420000,
                'longitude' => 110.2230000,
                'grade_preference' => Grade::NOT_FIT,
                'min_capacity_kg' => 500.00,
                'ideal_capacity_kg' => 1000.00,
                'max_capacity_kg' => 2000.00,
                'frequency' => 'harian',
                'receiving_days' => ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
                'monthly_receiving_day' => null,
                'contracts' => [
                    [
                        'name' => 'Kontrak Pengolahan Kompos Organik Utama',
                        'status' => 'active',
                        'grade' => Grade::NOT_FIT,
                        'intended_use' => Grade::INTENDED_USES[Grade::NOT_FIT],
                        'min_capacity_kg' => 500.00,
                        'ideal_capacity_kg' => 1000.00,
                        'max_capacity_kg' => 2000.00,
                        'frequency' => 'harian',
                        'receiving_days' => ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
                        'buy_price' => 500.00,
                        'sell_price' => 1000.00,
                        'start_date' => now()->subDays(60)->toDateString(),
                        'end_date' => now()->addDays(300)->toDateString(),
                    ]
                ]
            ],
            [
                'user_email' => 'mitra.maggot@saycle.com',
                'user_name' => 'Mas Agus Maggot',
                'name' => 'CV Maggot Farm BSF Banguntapan',
                'address' => 'Jl. Gedongkuning No. 102, Banguntapan, Bantul, D.I. Yogyakarta',
                'latitude' => -7.8250000,
                'longitude' => 110.4050000,
                'grade_preference' => Grade::LESS_FIT,
                'min_capacity_kg' => 300.00,
                'ideal_capacity_kg' => 700.00,
                'max_capacity_kg' => 1200.00,
                'frequency' => 'mingguan',
                'receiving_days' => ['Senin', 'Rabu', 'Jumat'],
                'monthly_receiving_day' => null,
                'contracts' => [
                    [
                        'name' => 'Kontrak Sisa Organik Pakan BSF',
                        'status' => 'active',
                        'grade' => Grade::LESS_FIT,
                        'intended_use' => Grade::INTENDED_USES[Grade::LESS_FIT],
                        'min_capacity_kg' => 300.00,
                        'ideal_capacity_kg' => 700.00,
                        'max_capacity_kg' => 1200.00,
                        'frequency' => 'mingguan',
                        'receiving_days' => ['Senin', 'Rabu', 'Jumat'],
                        'buy_price' => 1000.00,
                        'sell_price' => 1800.00,
                        'start_date' => now()->subDays(45)->toDateString(),
                        'end_date' => now()->addDays(180)->toDateString(),
                    ]
                ]
            ],
            [
                'user_email' => 'mitra.peternakan@saycle.com',
                'user_name' => 'Pak Deden Peternak',
                'name' => 'Peternakan Sapi Merapi Cangkringan',
                'address' => 'Jl. Kaliurang KM 22, Hargobinangun, Pakem, Sleman, D.I. Yogyakarta',
                'latitude' => -7.6185000,
                'longitude' => 110.4500000,
                'grade_preference' => Grade::FIT,
                'min_capacity_kg' => 200.00,
                'ideal_capacity_kg' => 500.00,
                'max_capacity_kg' => 1000.00,
                'frequency' => 'harian',
                'receiving_days' => ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
                'monthly_receiving_day' => null,
                'contracts' => [
                    [
                        'name' => 'Kontrak Pasokan Hijauan Sayur Pakan Ternak',
                        'status' => 'active',
                        'grade' => Grade::FIT,
                        'intended_use' => Grade::INTENDED_USES[Grade::FIT],
                        'min_capacity_kg' => 200.00,
                        'ideal_capacity_kg' => 500.00,
                        'max_capacity_kg' => 1000.00,
                        'frequency' => 'harian',
                        'receiving_days' => ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
                        'buy_price' => 1500.00,
                        'sell_price' => 2500.00,
                        'start_date' => now()->subDays(30)->toDateString(),
                        'end_date' => now()->addDays(150)->toDateString(),
                    ]
                ]
            ],
            [
                'user_email' => 'supplier.pasaringres@saycle.com',
                'user_name' => 'Pengelola Pasar Beringharjo',
                'name' => 'Pasar Beringharjo Yogyakarta',
                'address' => 'Jl. Margo Mulyo No. 16, Ngupasan, Gondomanan, Yogyakarta',
                'latitude' => -7.7985000,
                'longitude' => 110.3658000,
                'grade_preference' => Grade::LESS_FIT,
                'min_capacity_kg' => 1000.00,
                'ideal_capacity_kg' => 2500.00,
                'max_capacity_kg' => 5000.00,
                'frequency' => 'harian',
                'receiving_days' => ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
                'monthly_receiving_day' => null,
                'contracts' => []
            ],
            [
                'user_email' => 'supplier.kebunsayur@saycle.com',
                'user_name' => 'H. Endang Sleman',
                'name' => 'Koperasi Tani Makmur Sleman',
                'address' => 'Jl. Magelang KM 12, Tridadi, Sleman, D.I. Yogyakarta',
                'latitude' => -7.7120000,
                'longitude' => 110.3650000,
                'grade_preference' => Grade::FIT,
                'min_capacity_kg' => 400.00,
                'ideal_capacity_kg' => 800.00,
                'max_capacity_kg' => 1500.00,
                'frequency' => 'mingguan',
                'receiving_days' => ['Selasa', 'Kamis', 'Sabtu'],
                'monthly_receiving_day' => null,
                'contracts' => []
            ],
        ];

        foreach ($partnerDataList as $item) {
            $user = User::updateOrCreate(
                ['email' => $item['user_email']],
                [
                    'name' => $item['user_name'],
                    'role' => 'partner',
                    'password' => Hash::make('partner123456'),
                ]
            );

            $partner = Partner::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => $item['name'],
                    'address' => $item['address'],
                    'latitude' => $item['latitude'],
                    'longitude' => $item['longitude'],
                    'grade_preference' => $item['grade_preference'],
                    'min_capacity_kg' => $item['min_capacity_kg'],
                    'ideal_capacity_kg' => $item['ideal_capacity_kg'],
                    'max_capacity_kg' => $item['max_capacity_kg'],
                    'frequency' => $item['frequency'],
                    'receiving_days' => $item['receiving_days'],
                    'monthly_receiving_day' => $item['monthly_receiving_day'],
                    'overcapacity_terms_version' => Partner::OVERCAPACITY_TERMS_VERSION,
                    'overcapacity_terms_accepted_at' => now()->subDays(10),
                ]
            );

            foreach ($item['contracts'] as $contractData) {
                Contract::updateOrCreate(
                    [
                        'partner_id' => $partner->id,
                        'name' => $contractData['name'],
                    ],
                    $contractData
                );
            }
        }
    }
}
