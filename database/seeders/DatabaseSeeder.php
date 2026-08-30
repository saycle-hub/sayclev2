<?php

namespace Database\Seeders;

use App\Domain\Grade;
use App\Models\Contract;
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
        User::updateOrCreate(['email' => 'admin@mail.com'], [
            'name' => 'Admin',
            'role' => 'admin',
            'password' => Hash::make('password'),
        ]);

        $mitraUser = User::updateOrCreate(['email' => 'mitra@gmail.com'], [
            'name' => 'Mitra',
            'role' => 'partner',
            'password' => Hash::make('mitra123'),
        ]);

        $partner = Partner::updateOrCreate(['user_id' => $mitraUser->id], [
            'name' => 'Mitra',
            'address' => 'Alamat Mitra',
            'grade_preference' => Grade::NOT_FIT,
            'min_capacity_kg' => 10,
            'ideal_capacity_kg' => 20,
            'max_capacity_kg' => 30,
            'frequency' => 'mingguan',
        ]);

        Contract::updateOrCreate(['partner_id' => $partner->id], [
            'name' => 'Kontrak Mitra',
            'status' => 'active',
            'grade' => Grade::NOT_FIT,
            'intended_use' => Grade::INTENDED_USES[Grade::NOT_FIT],
            'min_capacity_kg' => 10,
            'ideal_capacity_kg' => 20,
            'max_capacity_kg' => 30,
            'frequency' => 'mingguan',
            'receiving_days' => ['monday'],
            'buy_price' => 1000,
            'sell_price' => 1500,
        ]);
    }
}
