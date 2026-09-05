<?php

namespace Tests\Feature;

use App\Domain\Grade;
use App\Models\Allocation;
use App\Models\ClassificationLot;
use App\Models\Contract;
use App\Models\Partner;
use App\Models\Pickup;
use App\Models\Reservation;
use App\Models\SupplierReport;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WarehouseMutation;
use App\Services\AllocationEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AllocationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function partnerWithContract(array $capacity, string $grade = 'Layak'): Partner
    {
        $user = User::factory()->create(['role' => 'partner']);
        $partner = Partner::create([
            'user_id' => $user->id,
            'name' => 'Mitra '.$capacity['min'],
            'address' => 'Jl. Test',
            'grade_preference' => $grade,
            'min_capacity_kg' => $capacity['min'],
            'ideal_capacity_kg' => $capacity['ideal'],
            'max_capacity_kg' => $capacity['max'],
            'frequency' => 'mingguan',
        ]);
        Contract::create([
            'partner_id' => $partner->id,
            'name' => 'Kontrak',
            'status' => 'active',
            'grade' => $grade,
            'min_capacity_kg' => $capacity['min'],
            'ideal_capacity_kg' => $capacity['ideal'],
            'max_capacity_kg' => $capacity['max'],
            'frequency' => 'mingguan',
        ]);

        return $partner;
    }

    /**
     * Physical warehouse stock now lives in the ledger: a classified lot plus
     * its receipt mutation (the Fase 5 check-in path).
     */
    private function addLot(string $grade, float $kg): ClassificationLot
    {
        $report = SupplierReport::create([
            'public_id' => uniqid('R'), 'contact_name' => 'Supplier', 'phone' => '1',
            'estimated_kg' => $kg, 'photo_path' => 'x.jpg', 'location_consent' => true,
            'latitude' => 0, 'longitude' => 0, 'manual_address' => 'x',
            'status' => 'picked_up', 'pin_hash' => 'x',
        ]);
        $vehicle = Vehicle::create(['name' => 'V', 'capacity_kg' => 999999, 'is_active' => true]);
        $pickup = Pickup::create([
            'supplier_report_id' => $report->id, 'vehicle_id' => $vehicle->id,
            'officer_id' => $this->admin()->id, 'status' => 'completed', 'estimated_kg' => $kg,
        ]);
        $lot = ClassificationLot::create([
            'pickup_id' => $pickup->id,
            'grade' => $grade,
            'intended_use' => Grade::INTENDED_USES[$grade],
            'kg' => $kg,
            'classified_at' => now(),
            'classified_by' => $this->admin()->id,
        ]);
        WarehouseMutation::create([
            'classification_lot_id' => $lot->id,
            'type' => 'receipt',
            'reference_type' => 'test',
            'reference_id' => 0,
            'grade' => $grade,
            'intended_use' => $lot->intended_use,
            'kg' => $kg,
            'performed_by' => $this->admin()->id,
            'occurred_at' => now(),
        ]);

        return $lot;
    }

    public function test_guest_and_non_admin_are_blocked(): void
    {
        $this->get('/allocation')->assertRedirect('/login');
        $this->actingAs(User::factory()->create(['role' => 'officer']))->get('/allocation')->assertForbidden();
        $this->actingAs(User::factory()->create(['role' => 'partner']))->get('/allocation')->assertForbidden();
    }

    public function test_deficit_allocates_proportionally_to_minimum(): void
    {
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 300]);
        $this->partnerWithContract(['min' => 300, 'ideal' => 600, 'max' => 900]);
        $this->addLot('Layak', 100); // total minimum 400, stock 100 → defisit

        $response = $this->actingAs($this->admin())->post('/allocation/run');

        $response->assertSessionHas('success');
        $allocations = Allocation::where('grade', 'Layak')->get();
        $this->assertCount(2, $allocations);
        $this->assertSame(25.0, (float) $allocations->firstWhere('allocated_kg', 25.0)?->allocated_kg);
        $this->assertSame(75.0, (float) $allocations->firstWhere('allocated_kg', 75.0)?->allocated_kg);
        $allocations->each(fn (Allocation $a) => $this->assertSame('minimum', $a->allocation_type));
        $allocations->each(fn (Allocation $a) => $this->assertSame('approved', $a->status));
    }

    public function test_normal_fills_minimum_then_ideal_proportionally(): void
    {
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 300]);
        $this->partnerWithContract(['min' => 300, 'ideal' => 600, 'max' => 900]);
        $this->addLot('Layak', 600); // total minimum 400, total ideal 800 → normal

        $this->actingAs($this->admin())->post('/allocation/run');

        $rows = Allocation::where('grade', 'Layak')->get();
        $this->assertSame(600.0, (float) $rows->sum('allocated_kg'));
        $this->assertSame(400.0, (float) $rows->where('allocation_type', 'minimum')->sum('allocated_kg'));
        $this->assertSame(200.0, (float) $rows->where('allocation_type', 'ideal')->sum('allocated_kg'));
    }

    public function test_surplus_overcapacity_proportional_to_ideal_and_approved(): void
    {
        // P1: ideal 200/max 300 (headroom 100); P2: ideal 600/max 700 (headroom 100).
        // Total ideal 800, total max 1000; stock 900 → overcapacity pool 100.
        // D2: weights ideal 200:600 → P1 25, P2 75.
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 300]);
        $this->partnerWithContract(['min' => 300, 'ideal' => 600, 'max' => 700]);
        $this->addLot('Layak', 900);

        $this->actingAs($this->admin())->post('/allocation/run');

        $rows = Allocation::where('grade', 'Layak')->get();
        $this->assertSame(900.0, (float) $rows->sum('allocated_kg'));
        $this->assertSame(400.0, (float) $rows->where('allocation_type', 'minimum')->sum('allocated_kg'));
        $this->assertSame(400.0, (float) $rows->where('allocation_type', 'ideal')->sum('allocated_kg'));
        $over = $rows->where('allocation_type', 'overcapacity');
        $this->assertSame(100.0, (float) $over->sum('allocated_kg'));
        $this->assertSame(25.0, (float) $over->firstWhere('allocated_kg', 25.0)?->allocated_kg);
        $this->assertSame(75.0, (float) $over->firstWhere('allocated_kg', 75.0)?->allocated_kg);
        $over->each(fn (Allocation $a) => $this->assertSame('approved', $a->status));
    }

    public function test_excess_beyond_all_maxima_is_held_visibly_and_never_regraded(): void
    {
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 220]); // headroom 20
        $this->addLot('Layak', 260); // surplus 60, headroom 20 → held 40

        $this->actingAs($this->admin())->post('/allocation/run');

        // No re-graded allocations: only Layak rows exist.
        $this->assertSame(0, Allocation::where('grade', '!=', 'Layak')->count());
        $rows = Allocation::where('grade', 'Layak')->get();
        $this->assertSame(220.0, (float) $rows->sum('allocated_kg')); // min 100 + ideal-rem 100 + over 20
        $over = $rows->where('allocation_type', 'overcapacity');
        $this->assertSame(20.0, (float) $over->sum('allocated_kg'));
        $over->each(fn (Allocation $a) => $this->assertSame('approved', $a->status));

        // Held kg (260 − 220) stays physically in stock, visible, unregraded.
        $engine = app(AllocationEngine::class);
        $this->assertEqualsWithDelta(40.0, $engine->availableStock('Layak'), 0.01);
    }

    public function test_run_reserves_lots_and_rerun_conserves_committed_allocations(): void
    {
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 300]);
        $this->addLot('Layak', 150);

        $this->actingAs($this->admin())->post('/allocation/run');
        $first = Allocation::where('grade', 'Layak')->orderBy('id')->get();
        $this->assertSame(150.0, (float) $first->sum('allocated_kg'));
        // Every kg is bound to a physical reservation.
        $this->assertSame(150.0, (float) Reservation::whereIn('allocation_id', $first->pluck('id'))->sum('reserved_kg'));

        // New stock arrives; rerun must keep committed rows and allocate only the new kg.
        $this->addLot('Layak', 100);
        $this->actingAs($this->admin())->post('/allocation/run');

        $committed = Allocation::where('grade', 'Layak')->whereIn('id', $first->pluck('id'))->get();
        $this->assertSame(150.0, (float) $committed->sum('allocated_kg')); // untouched
        $this->assertSame(250.0, (float) Allocation::where('grade', 'Layak')->sum('allocated_kg'));

        // No double reservation: total reserved equals total allocated.
        $this->assertSame(
            (float) Allocation::where('grade', 'Layak')->sum('allocated_kg'),
            (float) Reservation::whereIn('allocation_id', Allocation::where('grade', 'Layak')->pluck('id'))->sum('reserved_kg')
        );
    }

    public function test_overcapacity_never_exceeds_any_contract_maximum(): void
    {
        // P1 has huge ideal but tiny headroom; P2 small ideal, big headroom.
        // Pool 200 over headrooms (20 + 180): ideal weights would give P1 66.7
        // but its headroom caps it at 20; the spill flows to P2.
        $this->partnerWithContract(['min' => 100, 'ideal' => 400, 'max' => 420]);
        $this->partnerWithContract(['min' => 50, 'ideal' => 100, 'max' => 280]);
        $this->addLot('Layak', 800); // ideal total 500 → surplus 300; headroom 20+180=200 → pool 200, held 100

        $this->actingAs($this->admin())->post('/allocation/run');

        $rows = Allocation::where('grade', 'Layak')->get();
        $over = $rows->where('allocation_type', 'overcapacity');
        $this->assertSame(200.0, (float) $over->sum('allocated_kg'));
        foreach ($over as $row) {
            $contract = Contract::find($row->contract_id);
            $totalForPartner = (float) $rows->where('contract_id', $contract->id)->sum('allocated_kg');
            $this->assertLessThanOrEqual((float) $contract->max_capacity_kg + 0.001, $totalForPartner);
        }
    }

    public function test_overcapacity_approval_endpoints_are_unavailable(): void
    {
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 220]);
        $this->addLot('Layak', 260);

        $this->actingAs($this->admin())->post('/allocation/run');

        $over = Allocation::where('allocation_type', 'overcapacity')->first();
        $this->actingAs($this->admin())->post("/allocation/{$over->id}/approve")->assertNotFound();
        $this->actingAs($this->admin())->post("/allocation/{$over->id}/reject")->assertNotFound();
    }

    public function test_index_and_show_render(): void
    {
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 300]);
        $this->addLot('Layak', 150);

        $this->actingAs($this->admin())->post('/allocation/run');
        $this->actingAs($this->admin())->get('/allocation')->assertOk();
        $this->actingAs($this->admin())->get('/allocation/Layak')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('allocation/show')->has('rows'));
    }

    public function test_index_shows_held_kg_when_excess_beyond_maxima(): void
    {
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 220]);
        $this->addLot('Layak', 260);

        $this->actingAs($this->admin())->post('/allocation/run');
        $this->actingAs($this->admin())->get('/allocation')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('allocation/index')
                ->where('overview.0.status', 'Surplus ditahan')
                ->where('overview.0.held_kg', 40)
            );
    }

    public function test_unknown_grade_returns_404(): void
    {
        $this->actingAs($this->admin())->get('/allocation/GradePalsu')->assertNotFound();
    }

    public function test_paused_contracts_are_excluded(): void
    {
        $user = User::factory()->create(['role' => 'partner']);
        $partner = Partner::create([
            'user_id' => $user->id, 'name' => 'Mitra Pause', 'address' => 'Jl. Test',
            'grade_preference' => 'Layak', 'min_capacity_kg' => 100, 'ideal_capacity_kg' => 200, 'max_capacity_kg' => 300, 'frequency' => 'mingguan',
        ]);
        Contract::create([
            'partner_id' => $partner->id, 'name' => 'Kontrak', 'status' => 'paused', 'grade' => 'Layak',
            'min_capacity_kg' => 100, 'ideal_capacity_kg' => 200, 'max_capacity_kg' => 300, 'frequency' => 'mingguan',
        ]);
        $this->addLot('Layak', 50);

        $this->actingAs($this->admin())->post('/allocation/run');

        $this->assertSame(0, Allocation::where('grade', 'Layak')->count());
    }

    public function test_admin_stock_adjustment_feeds_ledger_and_engine(): void
    {
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 300]);
        $this->actingAs($this->admin())->post('/stock/adjust', [
            'grade' => 'Layak',
            'type' => 'in',
            'kg' => 150,
            'description' => 'inventori awal',
        ]);

        $engine = app(AllocationEngine::class);
        $this->assertSame(150.0, $engine->availableStock('Layak'));

        $this->actingAs($this->admin())->post('/allocation/run');
        $this->assertSame(150.0, (float) Allocation::where('grade', 'Layak')->sum('allocated_kg'));
        // Lot-less reservation backs the adjusted stock, conservation holds.
        $this->assertSame(
            150.0,
            (float) Reservation::whereIn('allocation_id', Allocation::where('grade', 'Layak')->pluck('id'))->sum('reserved_kg')
        );
    }

    public function test_no_reservation_or_negative_stock_possible(): void
    {
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 300]);
        $this->addLot('Layak', 120);

        $this->actingAs($this->admin())->post('/allocation/run'); // 120 allocated+reserved

        // Second run after stock leaves: committed rows survive, no over-allocation.
        $lot = ClassificationLot::where('grade', 'Layak')->first();
        WarehouseMutation::create([
            'classification_lot_id' => $lot->id,
            'type' => 'stock_out',
            'reference_type' => 'test',
            'reference_id' => 0,
            'grade' => 'Layak',
            'intended_use' => $lot->intended_use,
            'kg' => 120,
            'performed_by' => $this->admin()->id,
            'occurred_at' => now(),
        ]);

        $this->actingAs($this->admin())->post('/allocation/run');
        // Committed allocation untouched; nothing new allocated (no free stock).
        $this->assertSame(120.0, (float) Allocation::where('grade', 'Layak')->sum('allocated_kg'));
        $engine = app(AllocationEngine::class);
        $this->assertEqualsWithDelta(0.0, $engine->availableStock('Layak'), 0.01);
    }
}
