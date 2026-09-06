<?php

namespace Database\Seeders;

use App\Models\Vehicle;
use Illuminate\Database\Seeder;

class VehicleSeeder extends Seeder
{
    public function run(): void
    {
        $vehicles = [
            [
                'name' => 'Pickup Mitsubishi L300 (AB 8123 YZ)',
                'capacity_kg' => 1200.00,
                'is_active' => true,
            ],
            [
                'name' => 'Truck Engkel Isuzu Elf (AB 9012 SYH)',
                'capacity_kg' => 3000.00,
                'is_active' => true,
            ],
            [
                'name' => 'Blind Van Daihatsu Granmax (AB 8231 JGK)',
                'capacity_kg' => 800.00,
                'is_active' => true,
            ],
            [
                'name' => 'Truck Box Hino Dutro (AB 9700 SAY)',
                'capacity_kg' => 5000.00,
                'is_active' => true,
            ],
        ];

        foreach ($vehicles as $vehicleData) {
            Vehicle::updateOrCreate(
                ['name' => $vehicleData['name']],
                $vehicleData
            );
        }
    }
}
