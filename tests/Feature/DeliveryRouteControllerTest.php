<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\Delivery;
use App\Models\DeliveryTrip;
use App\Models\Partner;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use App\Http\Controllers\DeliveryRouteController;
use Tests\TestCase;

class DeliveryRouteControllerTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User { return User::factory()->create(['role' => 'admin']); }
    private function contract(string $name, ?float $lat = 1, ?float $lng = 2): Contract
    {
        $partner = Partner::create(['name' => $name, 'address' => 'Address', 'latitude' => $lat, 'longitude' => $lng,
            'grade_preference' => 'Layak', 'min_capacity_kg' => 1, 'ideal_capacity_kg' => 10, 'max_capacity_kg' => 20, 'frequency' => 'harian']);
        return $partner->contracts()->create(['name' => $name, 'status' => 'active', 'grade' => 'Layak', 'min_capacity_kg' => 1,
            'ideal_capacity_kg' => 10, 'max_capacity_kg' => 20, 'frequency' => 'harian', 'start_date' => '2026-01-01', 'buy_price' => 1, 'sell_price' => 2]);
    }

    public function test_routes_are_admin_only_and_validate_date(): void
    {
        $this->get(route('delivery-routes.index'))->assertRedirect('/login');
        $this->actingAs(User::factory()->create(['role' => 'officer']))->get(route('delivery-routes.index'))->assertForbidden();
        $this->actingAs($this->admin())->get(route('delivery-routes.index', ['service_date' => 'bad']))->assertSessionHasErrors('service_date');
    }

    public function test_index_empty_props_and_show_target_vehicle_date(): void
    {
        $admin = $this->admin(); $vehicle = Vehicle::create(['name' => 'Truck', 'capacity_kg' => 100, 'is_active' => true]);
        $other = Vehicle::create(['name' => 'Other', 'capacity_kg' => 50, 'is_active' => true]);
        $contract = $this->contract('Target');
        $delivery = Delivery::create(['partner_id' => $contract->partner_id, 'contract_id' => $contract->id, 'service_date' => '2026-09-01', 'status' => 'planned']);
        DeliveryTrip::create(['delivery_id' => $delivery->id, 'vehicle_id' => $vehicle->id, 'stop_order' => 2, 'planned_kg' => 12, 'status' => 'planned', 'distance_m' => 30, 'duration_s' => 4]);
        $controller = new DeliveryRouteController(); $method = (new \ReflectionClass($controller))->getMethod('data'); $method->setAccessible(true);
        $index = $method->invoke($controller, \Carbon\Carbon::parse('2026-09-02'));
        $this->assertSame([], $index['routes']->all()); $this->assertSame([], $index['unassigned']->all());
        $show = $method->invoke($controller, \Carbon\Carbon::parse('2026-09-01'));
        $trip = $show['routes']->first()['trips'][0];
        $this->assertSame(2, $trip['stop']); $this->assertSame('Target', $trip['destination']['name']); $this->assertSame(30.0, $trip['metrics']['distance_m']);
        $this->assertTrue($show['routes']->contains(fn ($route) => $route['vehicle_id'] === $vehicle->id));
        $this->assertFalse($show['routes']->contains(fn ($route) => $route['vehicle_id'] === $other->id));
    }
}
