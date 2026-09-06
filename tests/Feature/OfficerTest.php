<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\Delivery;
use App\Models\DeliveryTrip;
use App\Models\FinancialLine;
use App\Models\Partner;
use App\Models\Pickup;
use App\Models\SupplierReport;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WarehouseMutation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OfficerTest extends TestCase
{
    use RefreshDatabase;

    private function createOfficer(): User
    {
        return User::factory()->create(['role' => 'officer']);
    }

    /**
     * Canonical fixture (mirrors CanonicalPickupCheckinTest::fixture):
     * SupplierReport with exact coordinates + Pickup assigned to the officer.
     */
    private function createAssignedPickupForOfficer(User $officer): Pickup
    {
        $report = SupplierReport::create([
            'public_id' => uniqid('R'), 'contact_name' => 'Supplier', 'phone' => '1',
            'estimated_kg' => 10, 'photo_path' => 'x.jpg', 'location_consent' => true,
            'latitude' => 0, 'longitude' => 0, 'manual_address' => 'x',
            'status' => 'pickup_scheduled', 'pin_hash' => 'x',
        ]);
        $vehicle = Vehicle::create(['name' => 'V', 'capacity_kg' => 100, 'is_active' => true]);

        return Pickup::create([
            'supplier_report_id' => $report->id, 'vehicle_id' => $vehicle->id,
            'officer_id' => $officer->id, 'status' => 'assigned', 'estimated_kg' => 10,
        ]);
    }

    private function canonicalPayload(float $kg = 10): array
    {
        return [
            'actual_total_kg' => $kg,
            'grades' => [['grade' => 'Layak', 'kg' => $kg]],
            'photo' => UploadedFile::fake()->image('pickup.jpg'),
            'checkin_lat' => 0,
            'checkin_lng' => 0,
        ];
    }

    public function test_officer_dashboard_shows_assigned_tasks(): void
    {
        $officer = $this->createOfficer();
        $otherOfficer = $this->createOfficer();
        $partner = Partner::create([
            'name' => 'Canonical Partner', 'type' => 'pakan', 'contact_person' => 'Jane Doe',
            'phone' => '081234567890', 'email' => 'canonical@partner.com', 'address' => 'Canonical Address',
            'min_capacity_kg' => 1, 'ideal_capacity_kg' => 2, 'max_capacity_kg' => 3, 'frequency' => 'harian',
            'latitude' => -6.99, 'longitude' => 110.42,
        ]);
        $report = SupplierReport::create([
            'public_id' => 'CANONICAL-REPORT', 'contact_name' => 'Canonical Supplier',
            'phone' => '081234567890', 'estimated_kg' => 12, 'photo_path' => 'test/canonical.jpg',
            'location_consent' => true, 'latitude' => -6.9932, 'longitude' => 110.4203,
            'manual_address' => 'Canonical Pickup Address', 'status' => 'pickup_scheduled', 'pin_hash' => 'pin',
        ]);
        $vehicle = Vehicle::create(['name' => 'Canonical Vehicle', 'capacity_kg' => 100, 'is_active' => true]);
        $contract = Contract::create([
            'partner_id' => $partner->id, 'name' => 'Canonical Contract', 'status' => 'active',
            'grade' => 'Layak', 'min_capacity_kg' => 1, 'ideal_capacity_kg' => 2, 'max_capacity_kg' => 3,
            'frequency' => 'harian', 'receiving_days' => [], 'start_date' => '2026-01-01',
            'buy_price' => 1, 'sell_price' => 2,
        ]);
        $pickup = Pickup::create([
            'supplier_report_id' => $report->id, 'vehicle_id' => $vehicle->id, 'officer_id' => $officer->id,
            'scheduled_for' => '2026-09-01 08:00:00', 'stop_order' => 1, 'status' => 'assigned', 'estimated_kg' => 12,
        ]);
        $delivery = Delivery::create([
            'partner_id' => $partner->id, 'contract_id' => $contract->id, 'service_date' => '2026-09-01',
            'status' => 'assigned', 'scheduled_for' => '2026-09-01 10:00:00',
        ]);
        $trip = DeliveryTrip::create([
            'delivery_id' => $delivery->id, 'vehicle_id' => $vehicle->id, 'officer_id' => $officer->id,
            'scheduled_for' => '2026-09-01 10:00:00', 'stop_order' => 2, 'planned_kg' => 8, 'status' => 'assigned',
        ]);

        $response = $this->actingAs($officer)->get(route('officer.dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('officer/dashboard')
            ->has('tasks', 2)
            ->where('tasks.0.id', $pickup->id)
            ->where('tasks.0.task_type', 'pickup')
            ->where('tasks.0.planned_kg', 12)
            ->where('tasks.1.id', $trip->id)
            ->where('tasks.1.task_type', 'delivery')
            ->where('tasks.1.planned_kg', 8)
            ->has('pickups', 1)
            ->has('deliveries', 1)
        );

        $this->actingAs($otherOfficer)->get(route('officer.dashboard'))
            ->assertInertia(fn ($page) => $page->has('tasks', 0)->has('pickups', 0)->has('deliveries', 0));
    }

    public function test_non_officer_cannot_access_dashboard(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->get(route('officer.dashboard'));

        $response->assertForbidden();
    }

    public function test_canonical_pickup_checkin_completes_and_writes_ledger_and_payment(): void
    {
        Storage::fake('s3-private');
        $officer = $this->createOfficer();
        $pickup = $this->createAssignedPickupForOfficer($officer);

        $response = $this->actingAs($officer)
            ->post(route('officer.pickups.checkin', $pickup->id), $this->canonicalPayload(10));

        $response->assertRedirect();
        $this->assertSame('completed', $pickup->fresh()->status);

        // Canonical stock ledger receipt exists for this pickup.
        $this->assertTrue(
            WarehouseMutation::query()
                ->where('type', 'receipt')
                ->where('reference_type', Pickup::class)
                ->where('reference_id', $pickup->id)
                ->exists()
        );

        // Supplier payment financial line exists for this pickup.
        $this->assertTrue(
            FinancialLine::query()
                ->where('type', 'supplier_payment')
                ->where('pickup_id', $pickup->id)
                ->exists()
        );
    }

    public function test_canonical_pickup_checkin_rejects_wrong_officer(): void
    {
        Storage::fake('s3-private');
        $assignedOfficer = $this->createOfficer();
        $otherOfficer = $this->createOfficer();
        $pickup = $this->createAssignedPickupForOfficer($assignedOfficer);

        $response = $this->actingAs($otherOfficer)
            ->post(route('officer.pickups.checkin', $pickup->id), $this->canonicalPayload(10));

        $response->assertForbidden();
        $this->assertSame('assigned', $pickup->fresh()->status);
    }

    public function test_officer_workload_routes_render_dashboard_and_are_role_gated(): void
    {
        // PLAN Fase 3: 'Ganti route tasks coming-soon dengan workload nyata'.
        // Sidebar links /officer/tasks, /officer/routes, /officer/weighing must
        // render the canonical workload dashboard instead of 404ing.
        $officer = $this->createOfficer();

        foreach (['/officer/tasks', '/officer/routes', '/officer/weighing'] as $uri) {
            $this->actingAs($officer)->get($uri)->assertOk()
                ->assertInertia(fn ($page) => $page->component('officer/dashboard'));
        }

        // actingAs persists on the test case; reset to guest before the
        // unauthenticated check.
        $this->actingAsGuest()->get('/officer/tasks')->assertRedirect('/login');
        $this->actingAs(User::factory()->create(['role' => 'admin']))->get('/officer/tasks')->assertForbidden();
        $this->actingAs(User::factory()->create(['role' => 'partner']))->get('/officer/weighing')->assertForbidden();
    }

    public function test_officer_can_view_dedicated_stop_page(): void
    {
        $officer = $this->createOfficer();
        $pickup = $this->createAssignedPickupForOfficer($officer);

        $response = $this->actingAs($officer)->get(route('officer.stop.show', ['type' => 'pickup', 'id' => $pickup->id]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('officer/stop-detail')
            ->where('stop.id', $pickup->id)
            ->where('stop.task_type', 'pickup')
        );
    }
}
