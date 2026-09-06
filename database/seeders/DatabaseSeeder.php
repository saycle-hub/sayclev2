<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $adminEmail = trim((string) (getenv('ADMIN_EMAIL') ?: env('ADMIN_EMAIL')));
        $adminPassword = (string) (getenv('ADMIN_PASSWORD') ?: env('ADMIN_PASSWORD'));
        if ($adminEmail === '') {
            $adminEmail = 'admin@saycle.id';
        }
        if ($adminPassword === '') {
            $adminPassword = 'password123';
        }

        User::updateOrCreate(
            ['email' => $adminEmail],
            ['name' => 'Admin Utama Saycle', 'role' => 'admin', 'password' => Hash::make($adminPassword)],
        );

        $officerEmail = trim((string) (getenv('OFFICER_EMAIL') ?: env('OFFICER_EMAIL')));
        $officerPassword = (string) (getenv('OFFICER_PASSWORD') ?: env('OFFICER_PASSWORD'));
        if ($officerEmail === '') {
            $officerEmail = 'officer@saycle.id';
        }
        if ($officerPassword === '') {
            $officerPassword = 'password123';
        }

        User::updateOrCreate(
            ['email' => $officerEmail],
            ['name' => 'Bambang Haryanto (Koordinator Ops)', 'role' => 'officer', 'password' => Hash::make($officerPassword)],
        );

        $drivers = [
            ['name' => 'Budi Santoso (Driver PickUp L300)', 'email' => 'driver1@saycle.id'],
            ['name' => 'Agus Setiawan (Driver Box Isuzu Elf)', 'email' => 'driver2@saycle.id'],
            ['name' => 'Eko Prasetyo (Driver Blind Van GranMax)', 'email' => 'driver3@saycle.id'],
            ['name' => 'Tri Widodo (Driver Truk Hino Dutro)', 'email' => 'driver4@saycle.id'],
        ];

        foreach ($drivers as $d) {
            User::updateOrCreate(
                ['email' => $d['email']],
                ['name' => $d['name'], 'role' => 'officer', 'password' => Hash::make('password123')],
            );
        }

        \App\Models\Warehouse::updateOrCreate(
            ['code' => 'GDG-SLM-01'],
            [
                'name' => 'Gudang Utama Saycle Sleman',
                'address' => 'Jl. Magelang KM 10, Tridadi, Sleman, D.I. Yogyakarta 55511',
                'latitude' => -7.7123000,
                'longitude' => 110.3621000,
                'capacity_kg' => 50000,
                'is_active' => true,
                'is_default' => true,
                'notes' => 'Gudang pemilahan utama limbah sayur dan pusat armada Sleman.',
            ]
        );

        \App\Models\Warehouse::updateOrCreate(
            ['code' => 'GDG-SWN-02'],
            [
                'name' => 'Gudang Hub Saycle Sewon',
                'address' => 'Jl. Parangtritis KM 5, Sewon, Bantul, D.I. Yogyakarta 55188',
                'latitude' => -7.8341000,
                'longitude' => 110.3652000,
                'capacity_kg' => 30000,
                'is_active' => true,
                'is_default' => false,
                'notes' => 'Gudang hub transit distribusi mitra area Bantul & Kota Yogyakarta.',
            ]
        );

        $this->call([
            PriceSeeder::class,
            VehicleSeeder::class,
            PartnerAndContractSeeder::class,
            StockSeeder::class,
            IntakeAndPickupSeeder::class,
            AllocationAndDeliverySeeder::class,
        ]);
    }
}
