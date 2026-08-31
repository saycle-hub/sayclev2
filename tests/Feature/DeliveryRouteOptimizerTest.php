<?php

namespace Tests\Feature;

use App\Models\{Allocation, Contract, Delivery, DeliveryLine, DeliveryTrip, DeliveryTripLine, Partner, Reservation, User, Vehicle};
use App\Services\DeliveryRouteOptimizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DeliveryRouteOptimizerTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User { return User::factory()->create(['role' => 'admin']); }
    private function serviceDate(): string { return now()->addDays(30)->toDateString(); }
    private function contract(bool $coords = true): Contract
    {
        $p = Partner::create(['name' => uniqid('p'), 'address' => 'Test', 'latitude' => $coords ? .01 : null, 'longitude' => $coords ? .02 : null, 'grade_preference' => 'Layak', 'min_capacity_kg' => 1, 'ideal_capacity_kg' => 10, 'max_capacity_kg' => 20, 'frequency' => 'harian']);
        return $p->contracts()->create(['name' => 'C', 'status' => 'active', 'grade' => 'Layak', 'min_capacity_kg' => 1, 'ideal_capacity_kg' => 10, 'max_capacity_kg' => 20, 'frequency' => 'harian', 'receiving_days' => [], 'start_date' => '2026-01-01', 'buy_price' => 1, 'sell_price' => 2]);
    }
    private function line(float $kg, bool $coords = true, string $reservationStatus = 'reserved'): DeliveryLine
    {
        $date = $this->serviceDate(); $c = $this->contract($coords); $d = Delivery::create(['partner_id' => $c->partner_id, 'contract_id' => $c->id, 'service_date' => $date, 'scheduled_for' => $date, 'status' => 'planned']);
        $a = Allocation::create(['partner_id' => $c->partner_id, 'contract_id' => $c->id, 'grade' => 'Layak', 'allocated_kg' => $kg, 'allocation_type' => 'minimum', 'status' => 'approved', 'week_start' => '2098-12-29']);
        $r = Reservation::create(['allocation_id' => $a->id, 'grade' => 'Layak', 'intended_use' => 'feed', 'reserved_kg' => $kg, 'status' => $reservationStatus, 'reserved_at' => now()]);
        return $d->lines()->create(['reservation_id' => $r->id, 'grade' => 'Layak', 'intended_use' => 'feed', 'kg' => $kg]);
    }
    private function go(): array { config(['saycle.depot.lat' => 0, 'saycle.depot.lng' => 0, 'saycle.osrm.base_url' => 'http://osrm.test']); return app(DeliveryRouteOptimizer::class)->optimize($this->serviceDate()); }

    public function test_auth_horizon_and_depot_config(): void
    {
        $date = $this->serviceDate();
        $this->postJson('/deliveries/optimize', ['service_date' => $date])->assertUnauthorized();
        $this->actingAs(User::factory()->create(['role' => 'officer']))->postJson('/deliveries/optimize', ['service_date' => $date])->assertForbidden();
        $this->actingAs($this->admin())->postJson('/deliveries/optimize', ['service_date' => now()->addDays(91)->toDateString()])->assertStatus(422);
        config(['saycle.depot.lat' => null]); $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class); app(DeliveryRouteOptimizer::class)->optimize($date);
    }

    public function test_unassigned_reasons_and_capacity_split_are_persisted(): void
    {
        $this->line(5, false); $this->line(5, true, 'released'); $this->line(25); Vehicle::create(['name' => 'V', 'capacity_kg' => 10, 'is_active' => true]);
        $result = $this->go();
        $this->assertSame(10.0, $result['assigned_kg']); $this->assertSame(20.0, $result['unassigned_kg']);
        $this->assertSame(['no coordinates', 'no reserved load', 'no vehicle capacity'], collect($result['unassigned'])->pluck('reason')->all());
        $this->assertSame(10.0, (float) DeliveryTripLine::whereHas('trip')->sum('planned_kg'));
    }

    public function test_conserves_shared_reservation_and_existing_usage_and_capacity(): void
    {
        $line = $this->line(10); $old = DeliveryTrip::create(['delivery_id' => $line->delivery_id, 'vehicle_id' => Vehicle::create(['name' => 'Old', 'capacity_kg' => 20, 'is_active' => true])->id, 'scheduled_for' => '2099-01-02', 'planned_kg' => 6, 'status' => 'assigned']);
        $old->lines()->create(['delivery_line_id' => $line->id, 'planned_kg' => 6]); Vehicle::create(['name' => 'New', 'capacity_kg' => 10, 'is_active' => true]);
        $result = $this->go();
        $this->assertSame(4.0, $result['assigned_kg']); $this->assertSame(10.0, (float) DeliveryTripLine::where('delivery_line_id', $line->id)->sum('planned_kg'));
        $this->assertDatabaseHas('delivery_trips', ['id' => $old->id, 'status' => 'assigned', 'planned_kg' => 6]);
    }

    public function test_rerun_preserves_statuses_orders_and_is_idempotent(): void
    {
        $one = $this->line(3); $two = $this->line(3); $v1 = Vehicle::create(['name' => '1', 'capacity_kg' => 10, 'is_active' => true]); $v2 = Vehicle::create(['name' => '2', 'capacity_kg' => 10, 'is_active' => true]);
        Delivery::findOrFail($one->delivery_id)->update(['status' => 'delivered']);
        Http::fake(['http://osrm.test/*' => Http::response(['code' => 'Ok', 'routes' => [['distance' => 123, 'duration' => 45]]])]); $this->go(); $ids = DeliveryTrip::where('status', 'planned')->pluck('id')->all(); $this->assertSame('osrm', DeliveryTrip::whereIn('id', $ids)->first()->estimation_source);
        $this->go(); $this->assertSame($ids, DeliveryTrip::where('status', 'planned')->pluck('id')->all()); $this->assertSame([1], DeliveryTrip::where('vehicle_id', $v1->id)->where('status', 'planned')->pluck('stop_order')->all());
    }
}
