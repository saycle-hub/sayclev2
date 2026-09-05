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
        $adminEmail = trim((string) env('ADMIN_EMAIL'));
        $adminPassword = (string) env('ADMIN_PASSWORD');
        if ($adminEmail === '' || $adminPassword === '') {
            throw new \RuntimeException('ADMIN_EMAIL and ADMIN_PASSWORD must both be set before running database seeding.');
        }

        User::updateOrCreate(
            ['email' => $adminEmail],
            ['name' => 'Admin', 'role' => 'admin', 'password' => Hash::make($adminPassword)],
        );

        $officerEmail = trim((string) env('OFFICER_EMAIL'));
        $officerPassword = (string) env('OFFICER_PASSWORD');
        if (($officerEmail === '') !== ($officerPassword === '')) {
            throw new \RuntimeException('OFFICER_EMAIL and OFFICER_PASSWORD must both be set, or both be empty.');
        }
        if ($officerEmail !== '') {
            User::updateOrCreate(
                ['email' => $officerEmail],
                ['name' => 'Officer', 'role' => 'officer', 'password' => Hash::make($officerPassword)],
            );
        }

        // User::factory(10)->create();
    }
}
