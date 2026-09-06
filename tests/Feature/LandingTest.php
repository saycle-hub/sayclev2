<?php

namespace Tests\Feature;

use App\Models\Partner;
use App\Models\SupplierReport;
use App\Models\WarehouseMutation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandingTest extends TestCase
{
    use RefreshDatabase;

    public function test_landing_exposes_privacy_safe_aggregate_impact_stats(): void
    {
        $response = $this->get('/');

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('welcome')
            ->where('impactStats.processedKg', 0)
            ->where('impactStats.partnerCount', 0)
            ->where('impactStats.reportCount', 0)
            ->has('impactStats.destinations', 0)
        );

        Partner::create([
            'user_id' => \App\Models\User::factory()->create()->id,
            'name' => 'Mitra', 'address' => 'Alamat', 'min_capacity_kg' => 1,
            'ideal_capacity_kg' => 2, 'max_capacity_kg' => 3, 'frequency' => 'harian',
        ]);
        SupplierReport::create([
            'public_id' => 'R1', 'contact_name' => 'Pemasok', 'phone' => '1',
            'estimated_kg' => 10, 'photo_path' => 'x', 'location_consent' => false,
            'status' => 'submitted', 'pin_hash' => 'hash',
        ]);
        WarehouseMutation::create(['type' => 'receipt', 'grade' => 'Layak', 'kg' => 12.5, 'intended_use' => 'pakan_ternak', 'occurred_at' => now()]);
        WarehouseMutation::create(['type' => 'receipt', 'grade' => 'Tidak Layak', 'kg' => 7.5, 'intended_use' => null, 'occurred_at' => now()]);

        $this->get('/')->assertInertia(fn ($page) => $page
            ->where('impactStats.processedKg', 20)
            ->where('impactStats.partnerCount', 1)
            ->where('impactStats.reportCount', 1)
            ->where('impactStats.destinations.0.label', 'Pakan ternak')
            ->where('impactStats.destinations.0.kg', 12.5)
            ->where('impactStats.destinations.1.label', 'Kompos')
            ->where('impactStats.destinations.1.kg', 7.5)
        );
    }
}
