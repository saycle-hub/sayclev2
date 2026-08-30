<?php

namespace Tests\Feature;

use App\Models\Partner;
use App\Models\PickupTask;
use App\Models\Sale;
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

        $sale = Sale::create([
            'partner_id' => $partner->id,
            'public_id' => 'TEST-' . now()->format('YmdHis'),
            'contact_name' => 'Test Supplier',
            'phone' => '081234567890',
            'address' => 'Test Address',
            'estimated_kg' => 50.0,
            'status' => 'scheduled',
            'latitude' => -6.9932,
            'longitude' => 110.4203,
        ]);

        $vehicle = Vehicle::factory()->create();

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
        $task = $this->createTaskForOfficer($officer);

        $response = $this->actingAs($officer)->get(route('officer.dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('officer/dashboard')
            ->has('tasks', 1)
            ->where('tasks.0.id', $task->id)
        );
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
}
