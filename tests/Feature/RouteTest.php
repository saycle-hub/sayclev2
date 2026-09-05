<?php

namespace Tests\Feature;

use App\Models\Pickup;
use App\Models\SupplierReport;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class RouteTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function officer(): User
    {
        return User::factory()->create(['role' => 'officer']);
    }

    private function vehicle(string $name, float $capacity): Vehicle
    {
        return Vehicle::create(['name' => $name, 'capacity_kg' => $capacity, 'is_active' => true]);
    }

    private function report(float $kg, ?float $lat, ?float $lng, string $status = 'accepted'): SupplierReport
    {
        return SupplierReport::create([
            'public_id' => Str::random(32), 'contact_name' => 'Supplier '.Str::random(4),
            'phone' => '08123456789', 'estimated_kg' => $kg, 'photo_path' => 'test.jpg',
            'location_consent' => $lat !== null && $lng !== null, 'latitude' => $lat,
            'longitude' => $lng, 'manual_address' => $lat === null ? 'Jl. Test' : null,
            'status' => $status, 'pin_hash' => 'x',
        ]);
    }

    public function test_guest_and_non_admin_are_blocked(): void
    {
        $this->get('/routes')->assertRedirect('/login');
        $this->get('/vehicles')->assertRedirect('/login');
        $this->actingAs($this->officer())->get('/routes')->assertForbidden();
        $this->actingAs(User::factory()->create(['role' => 'partner']))->get('/vehicles')->assertForbidden();
    }

    public function test_optimize_creates_canonical_pickups_by_capacity(): void
    {
        config(['saycle.depot.lat' => 0.0, 'saycle.depot.lng' => 0.0]);
        $big = $this->vehicle('Besar', 200);
        $small = $this->vehicle('Kecil', 80);
        $this->report(90, .01, .02);
        $this->report(60, .02, .01);
        $this->report(50, -.01, .03);
        $this->actingAs($this->admin())->post('/routes/optimize')->assertSessionHas('success');
        $pickups = Pickup::all();
        $this->assertCount(3, $pickups);
        $this->assertLessThanOrEqual(200, $pickups->where('vehicle_id', $big->id)->sum('estimated_kg'));
        $this->assertLessThanOrEqual(80, $pickups->where('vehicle_id', $small->id)->sum('estimated_kg'));
        $pickups->each(fn (Pickup $p) => [$this->assertSame('planned', $p->status), $this->assertGreaterThan(0, (float) $p->distance_m)]);
        $this->assertSame(3, SupplierReport::where('status', 'pickup_scheduled')->count());
        $this->assertSame(0, DB::table('sales')->count());
        $this->assertSame(0, DB::table('pickup_tasks')->count());
    }

    public function test_optimize_overflows_when_capacity_exceeded(): void
    {
        config(['saycle.depot.lat' => 0.0, 'saycle.depot.lng' => 0.0]);
        $this->vehicle('Kecil', 40);
        $this->report(30, .01, .01);
        $this->report(30, .02, .02);
        $this->actingAs($this->admin())->post('/routes/optimize')->assertSessionHas('success');
        $this->assertCount(1, Pickup::all());
    }

    public function test_optimize_is_idempotent_and_preserves_pickup_ids(): void
    {
        config(['saycle.depot.lat' => 0.0, 'saycle.depot.lng' => 0.0]);
        $this->vehicle('V', 500);
        $this->report(10, .01, .01);
        $admin = $this->admin();
        $this->actingAs($admin)->post('/routes/optimize');
        $ids = Pickup::pluck('id')->all();
        $this->actingAs($admin)->post('/routes/optimize');
        $this->assertSame($ids, Pickup::pluck('id')->all());
    }

    public function test_optimize_rejects_unreviewed_and_excludes_missing_coordinates(): void
    {
        config(['saycle.depot.lat' => 0.0, 'saycle.depot.lng' => 0.0]);
        $this->vehicle('V', 500);
        $this->report(10, .01, .01, 'submitted');
        $this->report(20, null, null);
        $this->report(30, .02, .02);
        $this->actingAs($this->admin())->post('/routes/optimize');
        $this->assertCount(1, Pickup::all());
    }

    public function test_assign_sets_officer_and_validates_officer_role(): void
    {
        config(['saycle.depot.lat' => 0.0, 'saycle.depot.lng' => 0.0]);
        $v = $this->vehicle('V', 500);
        $this->report(10, .01, .01);
        $admin = $this->admin();
        $this->actingAs($admin)->post('/routes/optimize');
        $officer = $this->officer();
        $this->actingAs($admin)->post("/routes/{$v->id}/assign", ['officer_id' => $officer->id])->assertSessionHas('success');
        $this->assertSame('assigned', Pickup::first()->status);
        $this->assertSame($officer->id, Pickup::first()->officer_id);
        $partner = User::factory()->create(['role' => 'partner']);
        $this->actingAs($admin)->post("/routes/{$v->id}/assign", ['officer_id' => $partner->id])->assertSessionHasErrors('officer_id');
    }

    public function test_vehicles_store_update_and_validate(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->post('/vehicles', ['name' => 'Pickup', 'capacity_kg' => 300])->assertSessionHas('success');
        $v = Vehicle::first();
        $this->assertSame('300.00', $v->capacity_kg);
        $this->assertTrue($v->is_active);
        $this->actingAs($admin)->put("/vehicles/{$v->id}", ['name' => 'Box', 'capacity_kg' => 500, 'is_active' => false])->assertSessionHas('success');
        $this->assertSame('Box', $v->refresh()->name);
        $this->assertFalse($v->is_active);
        $this->actingAs($admin)->post('/vehicles', ['name' => '', 'capacity_kg' => 0])->assertSessionHasErrors(['name', 'capacity_kg']);
    }

    public function test_index_show_and_vehicle_index_render(): void
    {
        config(['saycle.depot.lat' => 0.0, 'saycle.depot.lng' => 0.0]);
        $v = $this->vehicle('V', 500);
        $this->report(10, .01, .01);
        $admin = $this->admin();
        $this->actingAs($admin)->post('/routes/optimize');
        $this->actingAs($admin)->get('/routes')->assertOk()->assertInertia(fn ($p) => $p->component('routes/index')->has('routes'));
        $this->actingAs($admin)->get("/routes/{$v->id}")->assertOk()->assertInertia(fn ($p) => $p->component('routes/show')->has('stops'));
        $this->actingAs($admin)->get('/vehicles')->assertOk()->assertInertia(fn ($p) => $p->component('vehicles/index')->has('vehicles'));
    }
}
