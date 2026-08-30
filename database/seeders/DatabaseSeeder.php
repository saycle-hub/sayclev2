<?php

namespace Database\Seeders;

use App\Models\Partner;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $partnerUser = User::updateOrCreate(
            ['email' => 'rafly@gmail.com'],
            [
                'name' => 'Rafly Hermansyah',
                'password' => Hash::make('@rafly270107h'),
                'role' => 'partner',
            ],
        );

        Partner::updateOrCreate(
            ['user_id' => $partnerUser->id],
            [
                'name' => 'Rafly Hermansyah',
                'address' => 'Alamat operasional Rafly Hermansyah',
                'grade_preference' => 'Tidak Layak',
                'min_capacity_kg' => 2,
                'ideal_capacity_kg' => 10,
                'max_capacity_kg' => 25,
                'frequency' => 'mingguan',
            ],
        );
    }
}
