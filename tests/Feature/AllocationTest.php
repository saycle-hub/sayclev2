<?php

namespace Tests\Feature;

use App\Models\Allocation;
use App\Models\Contract;
use App\Models\Partner;
use App\Models\Price;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AllocationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function partnerWithContract(array $capacity): Partner
    {
        $user = User::factory()->create(['role' => 'partner']);
        $partner = Partner::create([
            'user_id' => $user->id,
            'name' => 'Mitra '.$capacity['min'],
            'address' => 'Jl. Test',
            'grade_preference' => 'Layak',
            'min_capacity_kg' => $capacity['min'],
            'ideal_capacity_kg' => $capacity['ideal'],
            'max_capacity_kg' => $capacity['max'],
            'frequency' => 'mingguan',
        ]);
        Contract::create([
            'partner_id' => $partner->id,
            'name' => 'Kontrak',
            'status' => 'active',
            'grade' => 'Layak',
            'min_capacity_kg' => $capacity['min'],
            'ideal_capacity_kg' => $capacity['ideal'],
            'max_capacity_kg' => $capacity['max'],
            'frequency' => 'mingguan',
        ]);

        return $partner;
    }

    private function addStock(string $grade, float $kg): void
    {
        Stock::create(['grade' => $grade, 'kg' => $kg, 'type' => 'in']);
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
        $this->addStock('Layak', 100); // total minimum 400, stock 100 → defisit

        $response = $this->actingAs($this->admin())->post('/allocation/run');

        $response->assertSessionHas('success');
        $allocations = Allocation::where('grade', 'Layak')->get();
        $this->assertCount(2, $allocations);
        $this->assertSame(25.0, (float) $allocations->firstWhere('allocated_kg', 25.0)?->allocated_kg);
        $this->assertSame(75.0, (float) $allocations->firstWhere('allocated_kg', 75.0)?->allocated_kg);
        $allocations->each(fn (Allocation $a) => $this->assertSame('minimum', $a->allocation_type));
    }

    public function test_normal_fills_minimum_then_ideal_proportionally(): void
    {
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 300]);
        $this->partnerWithContract(['min' => 300, 'ideal' => 600, 'max' => 900]);
        $this->addStock('Layak', 600); // total minimum 400, total ideal 800 → normal

        $this->actingAs($this->admin())->post('/allocation/run');

        $rows = Allocation::where('grade', 'Layak')->get();
        $this->assertSame(600.0, (float) $rows->sum('allocated_kg'));
        $this->assertSame(400.0, (float) $rows->where('allocation_type', 'minimum')->sum('allocated_kg'));
        $this->assertSame(200.0, (float) $rows->where('allocation_type', 'ideal')->sum('allocated_kg'));
    }

    public function test_surplus_fills_ideal_and_flags_overcapacity(): void
    {
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 300]);
        $this->addStock('Layak', 260); // ideal 200, surplus 60; headroom max-ideal = 100 → all surplus fits

        $this->actingAs($this->admin())->post('/allocation/run');

        $rows = Allocation::where('grade', 'Layak')->get();
        $this->assertSame(100.0, (float) $rows->where('allocation_type', 'minimum')->sum('allocated_kg'));
        $this->assertSame(100.0, (float) $rows->where('allocation_type', 'ideal')->sum('allocated_kg')); // increment above minimum
        $this->assertSame(60.0, (float) $rows->where('allocation_type', 'overcapacity')->sum('allocated_kg'));
    }

    public function test_excess_beyond_total_capacity_goes_to_compost_fallback(): void
    {
        // Partner headroom 20; compost partner takes the remaining 40.
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 220]);
        $compost = $this->partnerWithContract(['min' => 0, 'ideal' => 0, 'max' => 500]);
        $compostContract = Contract::where('partner_id', $compost->id)->first();
        $compostContract->update(['grade' => 'Tidak Layak']);

        $this->addStock('Layak', 260); // ideal 200 → surplus 60; headroom 20 → fallback 40

        $this->actingAs($this->admin())->post('/allocation/run');

        $fallback = Allocation::where('grade', 'Tidak Layak')->get();
        $this->assertSame(40.0, (float) $fallback->sum('allocated_kg'));
        $this->assertSame('overcapacity', $fallback->first()->allocation_type);
        $this->assertSame('approved', $fallback->first()->status); // terminal handler, no approval queue
        $this->assertStringContainsString('kompos cadangan', $fallback->first()->notes ?? '');

        // Source grade keeps only the capped overcapacity share.
        $source = Allocation::where('grade', 'Layak')->where('allocation_type', 'overcapacity')->get();
        $this->assertSame(20.0, (float) $source->sum('allocated_kg'));
    }

    public function test_excess_beyond_max_headroom_is_pending_overcapacity(): void
    {
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 220]); // headroom 20
        $this->addStock('Layak', 260); // surplus 60 > headroom 20

        $this->actingAs($this->admin())->post('/allocation/run');

        $over = Allocation::where('grade', 'Layak')->where('allocation_type', 'overcapacity')->first();
        $this->assertNotNull($over);
        $this->assertSame('pending', $over->status);
    }

    public function test_run_is_idempotent_per_week(): void
    {
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 300]);
        $this->addStock('Layak', 150);

        $this->actingAs($this->admin())->post('/allocation/run');
        $this->actingAs($this->admin())->post('/allocation/run');

        // Normal path (stock 150 > min 100): 1 minimum row + 1 ideal-increment row, replaced each run.
        $this->assertSame(2, Allocation::where('grade', 'Layak')->count());
    }

    public function test_overcapacity_approval_endpoints_are_unavailable(): void
    {
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 220]);
        $this->addStock('Layak', 260);

        $this->actingAs($this->admin())->post('/allocation/run');

        $over = Allocation::where('allocation_type', 'overcapacity')->first();
        $this->actingAs($this->admin())->post("/allocation/{$over->id}/approve")->assertNotFound();
        $this->actingAs($this->admin())->post("/allocation/{$over->id}/reject")->assertNotFound();
    }

    public function test_index_and_show_render(): void
    {
        $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 300]);
        $this->addStock('Layak', 150);

        $this->actingAs($this->admin())->post('/allocation/run');
        $this->actingAs($this->admin())->get('/allocation')->assertOk();
        $this->actingAs($this->admin())->get('/allocation/Layak')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('allocation/show')->has('rows'));
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
        $this->addStock('Layak', 50);

        $this->actingAs($this->admin())->post('/allocation/run');

        $this->assertSame(0, Allocation::where('grade', 'Layak')->count());
    }
}
