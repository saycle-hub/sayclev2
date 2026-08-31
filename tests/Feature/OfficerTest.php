<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\Delivery;
use App\Models\DeliveryTrip;
use App\Models\Partner;
use App\Models\Pickup;
use App\Models\PickupTask;
use App\Models\Sale;
use App\Models\SupplierReport;
use App\Models\User;
use App\Models\Vehicle;
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

    private function createTaskForOfficer(User $officer, array $overrides = []): PickupTask
    {
        $partner = Partner::create([
            'name' => 'Test Partner',
            'type' => 'pakan',
            'contact_person' => 'John Doe',
            'phone' => '081234567890',
            'email' => 'test@partner.com',
            'address' => 'Test Address',
            'min_capacity_kg' => 100.0,
            'ideal_capacity_kg' => 200.0,
            'max_capacity_kg' => 300.0,
            'frequency' => 'harian',
        ]);

        $sale = (new Sale)->forceFill([
            'partner_id' => $partner->id,
            'public_id' => 'TEST-'.now()->format('YmdHis').'-'.bin2hex(random_bytes(2)),
            'contact_name' => 'Test Supplier',
            'phone' => '081234567890',
            'address' => 'Test Address',
            'estimated_kg' => 50.0,
            'status' => 'scheduled',
            'latitude' => -6.9932,
            'longitude' => 110.4203,
            // Legacy intake columns (still NOT NULL, still written by the
            // public intake flow) must be filled for the insert to pass.
            'contact' => 'Test Supplier',
            'estimate_kg' => 50.0,
            'location_consent' => true,
            'photo_path' => 'test/sales/fake.jpg',
            'pin_hash' => 'test-pin',
        ]);
        $sale->save();

        $vehicle = Vehicle::create(['name' => 'Test Vehicle', 'capacity_kg' => 500, 'is_active' => true]);

        return PickupTask::create(array_merge([
            'sale_id' => $sale->id,
            'vehicle_id' => $vehicle->id,
            'officer_id' => $officer->id,
            'stop_order' => 1,
            'status' => 'assigned',
            'estimated_kg' => 50.0,
        ], $overrides));
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

    public function test_checkin_updates_task_with_valid_data(): void
    {
        Storage::fake('s3-private');
        $officer = $this->createOfficer();
        $task = $this->createTaskForOfficer($officer);

        $photo = UploadedFile::fake()->image('pickup.jpg');

        $response = $this->actingAs($officer)->post(route('officer.tasks.checkin', $task->id), [
            'actual_kg' => 45.5,
            'grade' => 'layak',
            'photo' => $photo,
            'checkin_lat' => -6.9931, // ~11m from sale
            'checkin_lng' => 110.4202,
        ]);

        $response->assertRedirect(route('officer.dashboard'));
        $response->assertSessionHas('success');

        $task->refresh();
        $this->assertEquals(45.5, $task->actual_kg);
        $this->assertEquals('layak', $task->grade);
        $this->assertEquals('done', $task->status);
        $this->assertNotNull($task->photo_path);
        $this->assertNotNull($task->checked_in_at);

        Storage::disk('s3-private')->assertExists($task->photo_path);
    }

    public function test_checkin_rejects_location_too_far(): void
    {
        Storage::fake('s3-private');
        $officer = $this->createOfficer();
        $task = $this->createTaskForOfficer($officer);

        $photo = UploadedFile::fake()->image('pickup.jpg');

        $response = $this->actingAs($officer)->post(route('officer.tasks.checkin', $task->id), [
            'actual_kg' => 45.5,
            'grade' => 'layak',
            'photo' => $photo,
            'checkin_lat' => -6.9900, // ~400m away
            'checkin_lng' => 110.4200,
        ]);

        $response->assertSessionHasErrors('checkin_lat');

        $task->refresh();
        $this->assertNull($task->actual_kg);
        $this->assertEquals('assigned', $task->status);
    }

    public function test_checkin_validates_required_fields(): void
    {
        $officer = $this->createOfficer();
        $task = $this->createTaskForOfficer($officer);

        $response = $this->actingAs($officer)->post(route('officer.tasks.checkin', $task->id), []);

        $response->assertSessionHasErrors(['actual_kg', 'grade', 'photo', 'checkin_lat', 'checkin_lng']);
    }

    public function test_checkin_rejects_invalid_grade(): void
    {
        Storage::fake('s3-private');
        $officer = $this->createOfficer();
        $task = $this->createTaskForOfficer($officer);

        $photo = UploadedFile::fake()->image('pickup.jpg');

        $response = $this->actingAs($officer)->post(route('officer.tasks.checkin', $task->id), [
            'actual_kg' => 45.5,
            'grade' => 'invalid_grade',
            'photo' => $photo,
            'checkin_lat' => -6.9931,
            'checkin_lng' => 110.4202,
        ]);

        $response->assertSessionHasErrors('grade');
    }

    public function test_officer_cannot_checkin_other_officer_task(): void
    {
        Storage::fake('s3-private');
        $officer1 = $this->createOfficer();
        $officer2 = $this->createOfficer();
        $task = $this->createTaskForOfficer($officer1);

        $photo = UploadedFile::fake()->image('pickup.jpg');

        $response = $this->actingAs($officer2)->post(route('officer.tasks.checkin', $task->id), [
            'actual_kg' => 45.5,
            'grade' => 'layak',
            'photo' => $photo,
            'checkin_lat' => -6.9931,
            'checkin_lng' => 110.4202,
        ]);

        $response->assertSessionHasErrors('task');
    }

    public function test_checkin_rejects_already_done_task(): void
    {
        Storage::fake('s3-private');
        $officer = $this->createOfficer();
        $task = $this->createTaskForOfficer($officer, ['status' => 'done']);

        $photo = UploadedFile::fake()->image('pickup.jpg');

        $response = $this->actingAs($officer)->post(route('officer.tasks.checkin', $task->id), [
            'actual_kg' => 45.5,
            'grade' => 'layak',
            'photo' => $photo,
            'checkin_lat' => -6.9931,
            'checkin_lng' => 110.4202,
        ]);

        $response->assertSessionHasErrors('task');
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
}
