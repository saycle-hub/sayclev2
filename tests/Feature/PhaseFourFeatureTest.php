<?php

namespace Tests\Feature;

use App\Models\Allocation;
use App\Models\Contract;
use App\Models\Delivery;
use App\Models\DeliveryLine;
use App\Models\Partner;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicle;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhaseFourFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function contract(string $frequency, array $days = [], ?int $monthlyDay = null, array $dates = []): Contract
    {
        $partner = Partner::create(['name' => uniqid('partner'), 'address' => 'Test', 'grade_preference' => 'Layak', 'min_capacity_kg' => 1, 'ideal_capacity_kg' => 2, 'max_capacity_kg' => 3, 'frequency' => $frequency]);

        return $partner->contracts()->create(array_merge(['name' => 'Contract', 'status' => 'active', 'grade' => 'Layak', 'min_capacity_kg' => 1, 'ideal_capacity_kg' => 2, 'max_capacity_kg' => 3, 'frequency' => $frequency, 'receiving_days' => $days, 'monthly_day' => $monthlyDay, 'start_date' => '2026-01-01', 'buy_price' => 1, 'sell_price' => 2], $dates));
    }

    public function test_schedule_supports_canonical_frequency_dates_and_lineage(): void
    {
        $daily = $this->contract('harian');
        $weekly = $this->contract('mingguan', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
        $monthly = $this->contract('bulanan', [], 15);
        $admin = $this->admin();

        $this->actingAs($admin)->post('/deliveries/schedule', ['service_date' => '2026-09-07'])->assertSessionHasNoErrors();
        $deliveries = Delivery::whereDate('service_date', '2026-09-07')->get();
        $this->assertCount(2, $deliveries);
        $this->assertTrue($deliveries->contains(fn ($d) => $d->contracts->contains($daily)));
        $this->assertTrue($deliveries->contains(fn ($d) => $d->contracts->contains($weekly)));
        $this->actingAs($admin)->post('/deliveries/schedule', ['service_date' => '2026-09-07']);
        $this->assertSame(2, Delivery::whereDate('service_date', '2026-09-07')->count());
        $this->actingAs($admin)->post('/deliveries/schedule', ['service_date' => '2026-09-15']);
        $this->actingAs($admin)->post('/deliveries/schedule', ['service_date' => '2026-09-15']);
        $this->assertDatabaseHas('delivery_contracts', ['contract_id' => $monthly->id]);
    }

    public function test_schedule_requires_admin_and_horizon_and_excludes_paused_or_outside_dates(): void
    {
        $paused = $this->contract('harian');
        $paused->update(['status' => 'paused']);
        $future = $this->contract('harian', [], null, ['start_date' => '2027-01-01']);
        $this->post('/deliveries/schedule', ['service_date' => '2026-01-02'])->assertRedirect('/login');
        $this->actingAs(User::factory()->create(['role' => 'officer']))->post('/deliveries/schedule', ['service_date' => '2026-01-02'])->assertForbidden();
        $this->actingAs($this->admin())->post('/deliveries/schedule', ['service_date' => now()->addDays(91)->toDateString()])->assertStatus(422);
        $this->actingAs($this->admin())->post('/deliveries/schedule', ['service_date' => '2026-01-02']);
        $this->assertSame(0, Delivery::count());
    }

    private function deliveryWithLine(float $kg, string $status = 'reserved'): DeliveryLine
    {
        $contract = $this->contract('harian');
        $delivery = Delivery::create(['partner_id' => $contract->partner_id, 'contract_id' => $contract->id, 'service_date' => '2026-01-02', 'status' => 'planned', 'scheduled_for' => Carbon::parse('2026-01-02')]);
        $delivery->contracts()->attach($contract->id);
        $allocation = Allocation::create(['partner_id' => $contract->partner_id, 'contract_id' => $contract->id, 'grade' => 'Layak', 'allocated_kg' => $kg, 'allocation_type' => 'minimum', 'status' => 'approved', 'week_start' => '2025-12-29']);
        $reservation = Reservation::create(['allocation_id' => $allocation->id, 'grade' => 'Layak', 'intended_use' => 'feed', 'reserved_kg' => $kg, 'status' => $status, 'reserved_at' => now()]);

        return $delivery->lines()->create(['reservation_id' => $reservation->id, 'grade' => 'Layak', 'intended_use' => 'feed', 'kg' => $kg]);
    }

    public function test_assignment_requires_valid_actor_vehicle_reservation_capacity_and_is_retry_safe(): void
    {
        $line = $this->deliveryWithLine(10);
        $delivery = $line->delivery;
        $vehicle = Vehicle::create(['name' => 'Truck', 'capacity_kg' => 10, 'is_active' => true]);
        $officer = User::factory()->create(['role' => 'officer']);
        $admin = $this->admin();
        $this->actingAs($admin)->post("/deliveries/{$delivery->id}/assign", ['vehicle_id' => $vehicle->id, 'officer_id' => $officer->id, 'lines' => [$line->id => 11]])->assertStatus(422);
        $this->actingAs($admin)->post("/deliveries/{$delivery->id}/assign", ['vehicle_id' => $vehicle->id, 'officer_id' => $officer->id, 'lines' => [$line->id => 10]])->assertSessionHasNoErrors();
        $this->assertSame(1, $delivery->fresh()->trips()->count());
        $this->assertSame(10.0, (float) $delivery->fresh()->trips->first()->lines->sum('planned_kg'));
    }

    public function test_each_weekday_matches_only_its_contract_day(): void
    {
        foreach (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as $i => $day) {
            $contract = $this->contract('mingguan', [$day]);
            $date = Carbon::parse('2026-09-07')->addDays($i);
            $this->actingAs($this->admin())->post('/deliveries/schedule', ['service_date' => $date->toDateString()]);
            $this->assertDatabaseHas('delivery_contracts', ['contract_id' => $contract->id]);
        }
    }

    public function test_weekly_nonmatching_day_is_not_scheduled(): void
    {
        $contract = $this->contract('mingguan', ['monday']);
        $this->actingAs($this->admin())->post('/deliveries/schedule', ['service_date' => '2026-09-08']);
        $this->assertDatabaseMissing('delivery_contracts', ['contract_id' => $contract->id]);
    }

    public function test_daily_monthly_and_contract_boundaries_are_enforced(): void
    {
        Carbon::setTestNow('2026-09-01');
        $daily = $this->contract('harian', [], null, ['end_date' => '2026-09-01']);
        $monthly = $this->contract('bulanan', [], 15, ['start_date' => '2026-09-15', 'end_date' => '2026-09-15']);
        $admin = $this->admin();
        $this->actingAs($admin)->post('/deliveries/schedule', ['service_date' => '2026-09-01']);
        $this->assertDatabaseHas('delivery_contracts', ['contract_id' => $daily->id]);
        $this->actingAs($admin)->post('/deliveries/schedule', ['service_date' => '2026-09-15']);
        $this->assertDatabaseHas('delivery_contracts', ['contract_id' => $monthly->id]);
        Carbon::setTestNow();
    }

    public function test_cancelled_contract_is_excluded(): void
    {
        $contract = $this->contract('harian');
        $contract->update(['status' => 'cancelled']);
        $this->actingAs($this->admin())->post('/deliveries/schedule', ['service_date' => '2026-09-01']);
        $this->assertDatabaseMissing('delivery_contracts', ['contract_id' => $contract->id]);
    }

    public function test_grouped_contracts_share_partner_delivery_and_rerun_is_idempotent(): void
    {
        $one = $this->contract('harian');
        $two = $one->partner->contracts()->create(['name' => 'Two', 'status' => 'active', 'grade' => 'Layak', 'min_capacity_kg' => 1, 'ideal_capacity_kg' => 2, 'max_capacity_kg' => 3, 'frequency' => 'harian', 'receiving_days' => [], 'start_date' => '2026-01-01', 'buy_price' => 1, 'sell_price' => 2]);
        $admin = $this->admin();
        $this->actingAs($admin)->post('/deliveries/schedule', ['service_date' => '2026-09-06']);
        $this->actingAs($admin)->post('/deliveries/schedule', ['service_date' => '2026-09-06']);
        $delivery = Delivery::where('partner_id', $one->partner_id)->firstOrFail();
        $this->assertSame(2, $delivery->contracts()->count());
        $this->assertSame(1, Delivery::where('partner_id', $one->partner_id)->count());
    }

    public function test_missing_invalid_officer_and_inactive_vehicle_are_rejected(): void
    {
        $line = $this->deliveryWithLine(2);
        $delivery = $line->delivery;
        $vehicle = Vehicle::create(['name' => 'Off', 'capacity_kg' => 2, 'is_active' => false]);
        $admin = $this->admin();
        $this->actingAs($admin)->post("/deliveries/{$delivery->id}/assign", ['vehicle_id' => $vehicle->id, 'officer_id' => 99999, 'lines' => [$line->id => 1]])->assertSessionHasErrors('officer_id');
        $this->actingAs($admin)->post("/deliveries/{$delivery->id}/assign", ['vehicle_id' => $vehicle->id, 'officer_id' => User::factory()->create(['role' => 'partner'])->id, 'lines' => [$line->id => 1]])->assertNotFound();
    }

    public function test_empty_and_released_reservations_are_rejected(): void
    {
        $line = $this->deliveryWithLine(2, 'released');
        $vehicle = Vehicle::create(['name' => 'Truck', 'capacity_kg' => 2, 'is_active' => true]);
        $officer = User::factory()->create(['role' => 'officer']);
        $this->actingAs($this->admin())->post("/deliveries/{$line->delivery_id}/assign", ['vehicle_id' => $vehicle->id, 'officer_id' => $officer->id])->assertSessionHasErrors('lines');
        $this->actingAs($this->admin())->post("/deliveries/{$line->delivery_id}/assign", ['vehicle_id' => $vehicle->id, 'officer_id' => $officer->id, 'lines' => [$line->id => 1]])->assertStatus(404);
    }

    public function test_partial_split_conserves_line_and_overflow_is_rejected(): void
    {
        $line = $this->deliveryWithLine(10);
        $vehicle = Vehicle::create(['name' => 'Truck', 'capacity_kg' => 6, 'is_active' => true]);
        $officer = User::factory()->create(['role' => 'officer']);
        $admin = $this->admin();
        $this->actingAs($admin)->post("/deliveries/{$line->delivery_id}/assign", ['vehicle_id' => $vehicle->id, 'officer_id' => $officer->id, 'lines' => [$line->id => 6]]);
        $this->actingAs($admin)->post("/deliveries/{$line->delivery_id}/assign", ['vehicle_id' => $vehicle->id, 'officer_id' => $officer->id, 'lines' => [$line->id => 5]])->assertStatus(422);
        $this->assertSame(6.0, (float) $line->delivery->fresh()->trips->flatMap->lines->sum('planned_kg'));
    }

    public function test_exact_capacity_and_date_isolation_are_persisted(): void
    {
        $line = $this->deliveryWithLine(5);
        $vehicle = Vehicle::create(['name' => 'Truck', 'capacity_kg' => 5, 'is_active' => true]);
        $officer = User::factory()->create(['role' => 'officer']);
        $this->actingAs($this->admin())->post("/deliveries/{$line->delivery_id}/assign", ['vehicle_id' => $vehicle->id, 'officer_id' => $officer->id, 'lines' => [$line->id => 5]])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('delivery_trip_lines', ['delivery_line_id' => $line->id, 'planned_kg' => 5]);
    }

    public function test_protected_delivery_status_rejects_new_trip(): void
    {
        $line = $this->deliveryWithLine(2);
        $line->delivery->update(['status' => 'delivered']);
        $vehicle = Vehicle::create(['name' => 'Truck', 'capacity_kg' => 2, 'is_active' => true]);
        $officer = User::factory()->create(['role' => 'officer']);
        $this->actingAs($this->admin())->post("/deliveries/{$line->delivery_id}/assign", ['vehicle_id' => $vehicle->id, 'officer_id' => $officer->id, 'lines' => [$line->id => 1]])->assertStatus(422);
    }

    public function test_one_assignment_conserves_shared_reservation_across_delivery_lines(): void
    {
        $contract = $this->contract('harian');
        $delivery = Delivery::create(['partner_id' => $contract->partner_id, 'contract_id' => $contract->id, 'service_date' => '2026-09-01', 'status' => 'planned', 'scheduled_for' => '2026-09-01']);
        $delivery->contracts()->attach($contract->id);
        $allocation = Allocation::create(['partner_id' => $contract->partner_id, 'contract_id' => $contract->id, 'grade' => 'Layak', 'allocated_kg' => 10, 'allocation_type' => 'minimum', 'status' => 'approved', 'week_start' => '2026-08-31']);
        $reservation = Reservation::create(['allocation_id' => $allocation->id, 'grade' => 'Layak', 'intended_use' => 'feed', 'reserved_kg' => 10, 'status' => 'reserved', 'reserved_at' => now()]);
        $one = $delivery->lines()->create(['reservation_id' => $reservation->id, 'grade' => 'Layak', 'intended_use' => 'feed', 'kg' => 10]);
        $two = $delivery->lines()->create(['reservation_id' => $reservation->id, 'grade' => 'Layak', 'intended_use' => 'feed', 'kg' => 10]);
        $vehicle = Vehicle::create(['name' => 'Shared reservation truck', 'capacity_kg' => 20, 'is_active' => true]);
        $officer = User::factory()->create(['role' => 'officer']);
        $admin = $this->admin();
        $payload = ['vehicle_id' => $vehicle->id, 'officer_id' => $officer->id, 'lines' => [$one->id => 10, $two->id => 10]];
        $this->actingAs($admin)->post("/deliveries/{$delivery->id}/assign", $payload)->assertStatus(422);
        $this->assertSame(0, $delivery->fresh()->trips()->count());
        $this->actingAs($admin)->post("/deliveries/{$delivery->id}/assign", ['vehicle_id' => $vehicle->id, 'officer_id' => $officer->id, 'lines' => [$one->id => 4, $two->id => 6]])->assertSessionHasNoErrors();
        $this->assertSame(1, $delivery->fresh()->trips()->count());
        $this->assertSame(10.0, (float) $delivery->fresh()->trips->first()->lines->sum('planned_kg'));
    }
}
