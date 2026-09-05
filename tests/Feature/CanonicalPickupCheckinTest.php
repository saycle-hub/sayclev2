<?php

namespace Tests\Feature;

use App\Models\FinancialLine;
use App\Models\Pickup;
use App\Models\Price;
use App\Models\SupplierReport;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WarehouseMutation;
use App\Services\PickupCheckinService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CanonicalPickupCheckinTest extends TestCase
{
    use RefreshDatabase;

    private function fixture(string $status = 'assigned'): array
    {
        Storage::fake('s3-private');
        $officer = User::factory()->create(['role' => 'officer']);
        $report = SupplierReport::create(['public_id' => uniqid('R'), 'contact_name' => 'Supplier', 'phone' => '1', 'estimated_kg' => 10, 'photo_path' => 'x.jpg', 'location_consent' => true, 'latitude' => 0, 'longitude' => 0, 'manual_address' => 'x', 'status' => 'pickup_scheduled', 'pin_hash' => 'x']);
        $vehicle = Vehicle::create(['name' => 'V', 'capacity_kg' => 100, 'is_active' => true]);
        $pickup = Pickup::create(['supplier_report_id' => $report->id, 'vehicle_id' => $vehicle->id, 'officer_id' => $officer->id, 'status' => $status, 'estimated_kg' => 10]);

        return [$pickup, $report, $officer];
    }

    private function payload(float $kg = 10, array $extra = []): array
    {
        return array_merge(['actual_total_kg' => $kg, 'grades' => [['grade' => 'Layak', 'kg' => $kg]], 'photo' => UploadedFile::fake()->image('p.jpg'), 'checkin_lat' => 0, 'checkin_lng' => 0], $extra);
    }

    public function test_assigned_officer_completes_three_grade_pickup_atomically(): void
    {
        [$pickup, $report, $officer] = $this->fixture();
        $payload = $this->payload(9, ['grades' => [['grade' => 'Layak', 'kg' => 3], ['grade' => 'Kurang Layak', 'kg' => 4], ['grade' => 'Tidak Layak', 'kg' => 2]]]);
        $two = $payload;
        $two['photo'] = UploadedFile::fake()->image('same-copy.jpg');
        $this->withoutExceptionHandling();
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $payload)->assertRedirect();
        $this->assertSame('completed', $pickup->fresh()->status);
        $this->assertSame('picked_up', $report->fresh()->status);
        $this->assertDatabaseCount('classification_lots', 3);
        $this->assertDatabaseCount('warehouse_mutations', 3);
        $this->assertDatabaseCount('financial_lines', 3);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $two)->assertRedirect();
        $this->assertDatabaseCount('classification_lots', 3);
        $this->assertDatabaseCount('warehouse_mutations', 3);
    }

    public function test_rejects_wrong_officer_guest_sum_mismatch_duplicate_or_unknown(): void
    {
        [$pickup, , $officer] = $this->fixture();
        $this->post("/officer/pickups/{$pickup->id}/checkin", $this->payload())->assertRedirect('/login');
        $this->actingAs(User::factory()->create(['role' => 'admin']))->post("/officer/pickups/{$pickup->id}/checkin", $this->payload())->assertForbidden();
        $this->actingAs(User::factory()->create(['role' => 'officer']))->post("/officer/pickups/{$pickup->id}/checkin", $this->payload())->assertForbidden();
        $bad = $this->payload(10, ['grades' => [['grade' => 'Layak', 'kg' => 7]]]);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $bad)->assertStatus(422);
        $this->assertSame('assigned', $pickup->fresh()->status);
        $dup = $this->payload(10, ['grades' => [['grade' => 'Layak', 'kg' => 5], ['grade' => 'Layak', 'kg' => 5]]]);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $dup)->assertStatus(422);
    }

    public function test_gps_photo_and_rejection_photo_are_required(): void
    {
        [$pickup, , $officer] = $this->fixture();
        $far = $this->payload(10, ['checkin_lat' => 0.01]);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $far)->assertStatus(422);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", collect($this->payload())->except('photo')->toArray())->assertSessionHasErrors('photo');
        $reject = $this->payload(0, ['grades' => [], 'supplier_rejected' => true, 'refusal_reason' => 'spoiled']);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $reject)->assertSessionHasErrors('rejection_photo');
    }

    public function test_supplier_rejection_creates_no_lots_or_receipts_and_retry_is_safe(): void
    {
        [$pickup, $report, $officer] = $this->fixture();
        $payload = $this->payload(0, ['grades' => [], 'supplier_rejected' => true, 'refusal_reason' => 'spoiled', 'rejection_photo' => UploadedFile::fake()->image('reject.jpg')]);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $payload)->assertRedirect();
        $this->assertSame('supplier_rejected', $pickup->fresh()->status);
        $this->assertSame('supplier_rejected', $report->fresh()->status);
        $this->assertSame(0, $pickup->lots()->count());
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $payload)->assertRedirect();
        $this->assertDatabaseCount('classification_lots', 0);
    }

    public function test_admin_provenance_is_admin_only_and_traces_evidence(): void
    {
        [$pickup, , $officer] = $this->fixture();
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $this->payload(4))->assertRedirect();
        $this->actingAs($officer)->get('/provenance')->assertForbidden();
        $this->actingAs($admin)->get('/provenance')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('provenance/index')
                ->has('rows', 1)
                ->where('rows.0.kg', 4)
                ->where('rows.0.pickup_id', $pickup->id)
                ->where('rows.0.officer', $officer->name)
            );
    }

    public function test_legacy_endpoint_remains_separate_and_does_not_write_canonical(): void
    {
        [$pickup, , $officer] = $this->fixture();
        $this->actingAs($officer)->post("/officer/tasks/{$pickup->id}/checkin", [])->assertNotFound();
        $this->assertSame('assigned', $pickup->fresh()->status);
    }

    public function test_same_image_bytes_are_idempotent_and_different_bytes_rejected(): void
    {
        [$pickup,, $officer] = $this->fixture();
        $one = UploadedFile::fake()->createWithContent('a.jpg', 'same-bytes');
        $two = UploadedFile::fake()->createWithContent('b.jpg', 'different-bytes');
        $payload = $this->payload(4, ['photo' => $one]);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $payload)->assertRedirect();
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $payload)->assertRedirect();
        $this->assertDatabaseCount('classification_lots', 1);
        $changed = $this->payload(4, ['photo' => $two]);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $changed)->assertStatus(422);
        $this->assertDatabaseCount('classification_lots', 1);
    }

    public function test_photo_types_are_limited_and_oversize_rejected(): void
    {
        [$pickup,, $officer] = $this->fixture();
        $bad = $this->payload(4, ['photo' => UploadedFile::fake()->create('bad.txt', 1, 'text/plain')]);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $bad)->assertSessionHasErrors('photo');
        $large = $this->payload(4, ['photo' => UploadedFile::fake()->image('large.jpg')->size(5121)]);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $large)->assertSessionHasErrors('photo');
    }

    public function test_failed_transaction_removes_staged_files_and_rows(): void
    {
        [$pickup,, $officer] = $this->fixture();
        $payload = $this->payload(4);
        $serviceMock = new class extends PickupCheckinService
        {
            public function complete(Pickup $sourcePickup, array $data): Pickup
            {
                WarehouseMutation::flushEventListeners();
                DB::beginTransaction();
                Storage::disk('s3-private')->put('pickup-evidence/test-fail.jpg', 'x');
                DB::rollBack();
                if (Storage::disk('s3-private')->exists('pickup-evidence/test-fail.jpg')) {
                    Storage::disk('s3-private')->delete('pickup-evidence/test-fail.jpg');
                }

                return $sourcePickup;
            }
        };
        $this->app->instance(PickupCheckinService::class, $serviceMock);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $payload)->assertRedirect();
        $this->assertFalse(Storage::disk('s3-private')->exists('pickup-evidence/test-fail.jpg'));
        $this->assertDatabaseCount('classification_lots', 0);
    }

    public function test_supplier_rejected_status_is_distinct_from_review_rejected(): void
    {
        [$pickup,$report,$officer] = $this->fixture();
        $payload = $this->payload(0, ['grades' => [], 'supplier_rejected' => true, 'refusal_reason' => 'spoiled', 'rejection_photo' => UploadedFile::fake()->image('reject.jpg')]);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $payload)->assertRedirect();
        $this->assertSame('supplier_rejected', $report->fresh()->status);
        $this->assertNotSame('rejected', $report->fresh()->status);
    }

    public function test_supplier_payment_lines_snapshot_buy_price_and_never_duplicate(): void
    {
        [$pickup, , $officer] = $this->fixture();
        Price::create(['grade' => 'Layak', 'buy_price' => 1500, 'sell_price' => 3000]);
        Price::create(['grade' => 'Tidak Layak', 'buy_price' => 0, 'sell_price' => 500]);
        $payload = $this->payload(5, ['grades' => [['grade' => 'Layak', 'kg' => 3], ['grade' => 'Tidak Layak', 'kg' => 2]]]);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $payload)->assertRedirect();

        $payments = FinancialLine::where('pickup_id', $pickup->id)->get();
        $this->assertSame(2, $payments->count());
        $layak = $payments->firstWhere('grade', 'Layak');
        $this->assertSame('supplier_payment', $layak->type);
        $this->assertSame('payable', $layak->direction);
        // Cash on pickup (D5/D7): freshly created supplier_payment lines settle
        // immediately at weigh-in via markPaid(); retries stay untouched.
        $this->assertSame('paid', $layak->status);
        $this->assertSame('1500.00', (string) $layak->unit_price);
        $this->assertSame('4500.00', (string) $layak->amount);
        $this->assertSame($pickup->supplier_report_id, $layak->supplier_report_id);
        $this->assertSame('IDR', $layak->currency);

        // Retry with identical payload must not duplicate payment lines.
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $payload)->assertRedirect();
        $this->assertSame(2, FinancialLine::where('pickup_id', $pickup->id)->count());
    }

    public function test_supplier_rejection_creates_no_payment_lines(): void
    {
        [$pickup, , $officer] = $this->fixture();
        $payload = $this->payload(0, ['grades' => [], 'supplier_rejected' => true, 'refusal_reason' => 'spoiled', 'rejection_photo' => UploadedFile::fake()->image('reject.jpg')]);
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", $payload)->assertRedirect();
        $this->assertDatabaseCount('financial_lines', 0);
    }
}
