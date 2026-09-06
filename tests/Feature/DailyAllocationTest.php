<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\Partner;
use App\Models\Price;
use App\Models\Stock;
use App\Models\WarehouseMutation;
use App\Services\AllocationEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class DailyAllocationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Price::create(['grade' => 'Layak', 'buy_price' => 1000, 'sell_price' => 2000]);
        Price::create(['grade' => 'Kurang Layak', 'buy_price' => 800, 'sell_price' => 1500]);
        Price::create(['grade' => 'Tidak Layak', 'buy_price' => 500, 'sell_price' => 1000]);
    }

    public function test_daily_allocation_evaluates_daily_quotas_for_harian_partners(): void
    {
        $partner = Partner::create([
            'name' => 'Mitra Daily Test',
            'address' => 'Sleman',
            'grade_preference' => 'Layak',
            'frequency' => 'harian',
            'delivery_frequency' => 'harian',
            'min_capacity_kg' => 350,
            'ideal_capacity_kg' => 700, // 700 kg weekly -> 100 kg daily
            'max_capacity_kg' => 1050,
        ]);

        $contract = Contract::create([
            'partner_id' => $partner->id,
            'name' => 'Kontrak Harian',
            'grade' => 'Layak',
            'status' => 'active',
            'min_capacity_kg' => 350, // 50 kg daily min
            'ideal_capacity_kg' => 700, // 100 kg daily ideal
            'max_capacity_kg' => 1050, // 150 kg daily max
            'frequency' => 'harian',
            'delivery_frequency' => 'harian',
            'sell_price' => 2000,
        ]);

        // Add 200 kg stock
        WarehouseMutation::create([
            'grade' => 'Layak',
            'type' => 'receipt',
            'kg' => 200,
            'description' => 'Stok Awal',
            'occurred_at' => now(),
        ]);

        $engine = app(AllocationEngine::class);
        $result = $engine->run('2026-09-07'); // Monday

        $this->assertEquals('2026-09-07', $result['allocation_date']);
        $layakResult = $result['grades']['Layak'];

        // Daily ideal is 100 kg, max is 150 kg. With 200 kg stock, allocating fills ideal (100 kg) + headroom up to daily max (50 kg) = 150 kg.
        $this->assertEquals(150.0, $layakResult['allocated_kg']);
        $this->assertEquals(50.0, $layakResult['held_kg']); // 200 - 150 = 50 kg held
    }

    public function test_weekly_contract_receives_full_quota_only_on_scheduled_delivery_days(): void
    {
        $partner = Partner::create([
            'name' => 'Mitra Weekly Test',
            'address' => 'Bantul',
            'grade_preference' => 'Layak',
            'frequency' => 'mingguan',
            'delivery_frequency' => 'mingguan',
            'delivery_days' => ['Monday'],
            'min_capacity_kg' => 200,
            'ideal_capacity_kg' => 300,
            'max_capacity_kg' => 400,
        ]);

        $contract = Contract::create([
            'partner_id' => $partner->id,
            'name' => 'Kontrak Mingguan Senin',
            'grade' => 'Layak',
            'status' => 'active',
            'min_capacity_kg' => 200,
            'ideal_capacity_kg' => 300,
            'max_capacity_kg' => 400,
            'frequency' => 'mingguan',
            'delivery_frequency' => 'mingguan',
            'receiving_days' => ['monday'],
            'delivery_days' => ['monday'],
            'sell_price' => 2000,
        ]);

        WarehouseMutation::create([
            'grade' => 'Layak',
            'type' => 'receipt',
            'kg' => 500,
            'description' => 'Stok Awal',
            'occurred_at' => now(),
        ]);

        $engine = app(AllocationEngine::class);

        // Run on Monday (2026-09-07) -> scheduled day (fills ideal 300 + max headroom 100 = 400 kg)
        $mondayResult = $engine->run('2026-09-07');
        $this->assertEquals(400.0, $mondayResult['grades']['Layak']['allocated_kg']);

        // Clear allocations to test Tuesday
        \App\Models\Allocation::query()->delete();
        \App\Models\Reservation::query()->delete();

        // Run on Tuesday (2026-09-08) -> NOT scheduled day for this weekly partner
        $tuesdayResult = $engine->run('2026-09-08');
        $this->assertEquals(0.0, $tuesdayResult['grades']['Layak']['allocated_kg']);
    }
}
