<?php

namespace Tests\Feature;

use App\Models\PickupTask;
use App\Models\Sale;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

    private function sale(float $kg, float $lat, float $lng, string $status = 'Pending review'): Sale
    {
        $sale = new Sale;
        $sale->forceFill([
            'public_id' => Str::random(32),
            'contact' => 'Supplier '.Str::random(4),
            'estimate_kg' => $kg,
            'location_consent' => true,
            'latitude' => $lat,
            'longitude' => $lng,
            'photo_path' => 'test.jpg',
            'pin_hash' => 'x',
            'status' => $status,
        ]);
        $sale->save();

        return $sale;
    }

    // ── Auth ──

    public function test_guest_and_non_admin_are_blocked(): void
    {
        $this->get('/routes')->assertRedirect('/login');
        $this->get('/vehicles')->assertRedirect('/login');

        $this->actingAs(User::factory()->create(['role' => 'officer']))->get('/routes')->assertForbidden();
        $this->actingAs(User::factory()->create(['role' => 'partner']))->get('/vehicles')->assertForbidden();
    }

    // ── Optimize ──

    public function test_optimize_clusters_sales_into_vehicles_by_capacity(): void
    {
        // Depot at 0,0 (test env config default)
        config(['saycle.depot.lat' => 0.0, 'saycle.depot.lng' => 0.0]);

        $big = $this->vehicle('Besar', 200);
        $small = $this->vehicle('Kecil', 80);

        // 3 sales: 90 + 60 + 50 = 200. Big vehicle fits 90+60=150, small fits 50.
        $this->sale(90, 0.01, 0.02);
        $this->sale(60, 0.02, 0.01);
        $this->sale(50, -0.01, 0.03);

        $response = $this->actingAs($this->admin())->post('/routes/optimize');

        $response->assertSessionHas('success');

        $tasks = PickupTask::all();
        $this->assertCount(3, $tasks);

        // Each vehicle's load within capacity
        $bigLoad = (float) $tasks->where('vehicle_id', $big->id)->sum('estimated_kg');
        $smallLoad = (float) $tasks->where('vehicle_id', $small->id)->sum('estimated_kg');
        $this->assertLessThanOrEqual(200.0, $bigLoad);
        $this->assertLessThanOrEqual(80.0, $smallLoad);

        // stop_order sequential per vehicle
        $tasks->where('vehicle_id', $big->id)->pluck('stop_order')->each(fn ($o, $i) => $this->assertSame($i + 1, (int) $o));

        // Per-leg distance stored
        $tasks->each(fn (PickupTask $t) => $this->assertGreaterThan(0, (float) $t->distance_m));
    }

    public function test_optimize_overflows_when_capacity_exceeded(): void
    {
        config(['saycle.depot.lat' => 0.0, 'saycle.depot.lng' => 0.0]);
        $this->vehicle('Kecil', 40);
        $this->sale(30, 0.01, 0.01);
        $this->sale(30, 0.02, 0.02);

        $this->actingAs($this->admin())->post('/routes/optimize')
            ->assertSessionHas('success');

        // Only 1 fits (30 ≤ 40), second overflows
        $this->assertSame(1, PickupTask::count());
    }

    public function test_optimize_is_idempotent(): void
    {
        config(['saycle.depot.lat' => 0.0, 'saycle.depot.lng' => 0.0]);
        $this->vehicle('V', 500);
        $this->sale(10, 0.01, 0.01);

        $admin = $this->admin();
        $this->actingAs($admin)->post('/routes/optimize');
        $this->actingAs($admin)->post('/routes/optimize');

        $this->assertSame(1, PickupTask::count());
    }

    public function test_optimize_excludes_sales_without_coordinates(): void
    {
        config(['saycle.depot.lat' => 0.0, 'saycle.depot.lng' => 0.0]);
        $this->vehicle('V', 500);

        // Sale with coords
        $this->sale(10, 0.01, 0.01);

        // Sale without coords
        $noCoord = new Sale;
        $noCoord->forceFill([
            'public_id' => Str::random(32), 'contact' => 'No GPS', 'estimate_kg' => 20,
            'location_consent' => false, 'latitude' => null, 'longitude' => null,
            'manual_address' => 'Jl. Test', 'photo_path' => 'x.jpg', 'pin_hash' => 'x', 'status' => 'Pending review',
        ]);
        $noCoord->save();

        $this->actingAs($this->admin())->post('/routes/optimize');

        $this->assertSame(1, PickupTask::count());
    }

    public function test_optimize_preserves_assigned_tasks(): void
    {
        config(['saycle.depot.lat' => 0.0, 'saycle.depot.lng' => 0.0]);
        $v = $this->vehicle('V', 500);
        $s1 = $this->sale(10, 0.01, 0.01);
        $s2 = $this->sale(20, 0.02, 0.02);

        $admin = $this->admin();
        $this->actingAs($admin)->post('/routes/optimize');

        // Mark one task as assigned (simulating officer assignment)
        PickupTask::where('sale_id', $s1->id)->update(['status' => 'assigned', 'officer_id' => $this->officer()->id]);

        // Add a new sale and re-optimize
        $s3 = $this->sale(15, 0.03, 0.03);
        $this->actingAs($admin)->post('/routes/optimize');

        // Assigned task preserved
        $this->assertSame(1, PickupTask::where('sale_id', $s1->id)->where('status', 'assigned')->count());
        // New pending tasks created for s2 (re-planned) and s3
        $this->assertSame(1, PickupTask::where('sale_id', $s3->id)->where('status', 'pending')->count());
    }

    // ── Assign ──

    public function test_assign_sets_officer_and_status(): void
    {
        config(['saycle.depot.lat' => 0.0, 'saycle.depot.lng' => 0.0]);
        $v = $this->vehicle('V', 500);
        $this->sale(10, 0.01, 0.01);
        $officer = $this->officer();

        $admin = $this->admin();
        $this->actingAs($admin)->post('/routes/optimize');

        $this->actingAs($admin)->post("/routes/{$v->id}/assign", ['officer_id' => $officer->id])
            ->assertSessionHas('success');

        $task = PickupTask::where('vehicle_id', $v->id)->first();
        $this->assertSame('assigned', $task->status);
        $this->assertSame($officer->id, (int) $task->officer_id);
    }

    public function test_assign_rejects_non_officer(): void
    {
        config(['saycle.depot.lat' => 0.0, 'saycle.depot.lng' => 0.0]);
        $v = $this->vehicle('V', 500);
        $this->sale(10, 0.01, 0.01);
        $partner = User::factory()->create(['role' => 'partner']);

        $admin = $this->admin();
        $this->actingAs($admin)->post('/routes/optimize');
        $this->actingAs($admin)->post("/routes/{$v->id}/assign", ['officer_id' => $partner->id])
            ->assertSessionHasErrors('officer_id');
    }

    // ── Vehicles CRUD ──

    public function test_vehicles_store_and_update(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/vehicles', ['name' => 'Pickup', 'capacity_kg' => 300])
            ->assertSessionHas('success');

        $vehicle = Vehicle::first();
        $this->assertSame('Pickup', $vehicle->name);
        $this->assertSame('300.00', $vehicle->capacity_kg);
        $this->assertTrue($vehicle->is_active);

        $this->actingAs($admin)->put("/vehicles/{$vehicle->id}", ['name' => 'Box', 'capacity_kg' => 500, 'is_active' => false])
            ->assertSessionHas('success');

        $vehicle->refresh();
        $this->assertSame('Box', $vehicle->name);
        $this->assertFalse($vehicle->is_active);
    }

    public function test_vehicles_store_validates(): void
    {
        $this->actingAs($this->admin())->post('/vehicles', ['name' => '', 'capacity_kg' => 0])
            ->assertSessionHasErrors(['name', 'capacity_kg']);
    }

    // ── Pages render ──

    public function test_index_and_show_render(): void
    {
        config(['saycle.depot.lat' => 0.0, 'saycle.depot.lng' => 0.0]);
        $v = $this->vehicle('V', 500);
        $this->sale(10, 0.01, 0.01);

        $admin = $this->admin();
        $this->actingAs($admin)->post('/routes/optimize');

        $this->actingAs($admin)->get('/routes')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('routes/index')->has('routes'));

        $this->actingAs($admin)->get("/routes/{$v->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('routes/show')->has('stops'));
    }

    public function test_vehicles_index_renders(): void
    {
        $this->actingAs($this->admin())->get('/vehicles')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('vehicles/index')->has('vehicles'));
    }
}
