<?php

namespace Tests\Feature;

use App\Models\Allocation;
use App\Models\ClassificationLot;
use App\Models\Contract;
use App\Models\Delivery;
use App\Models\Partner;
use App\Models\Reservation;
use App\Models\User;
use App\Models\WarehouseMutation;
use App\Services\DeliverySchedulingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeliveryCandidateTest extends TestCase
{
    use RefreshDatabase;

    private function partnerWithContract(array $capacity, string $grade = 'Layak', string $frequency = 'harian'): array
    {
        $user = User::factory()->create(['role' => 'partner']);
        $partner = Partner::create([
            'user_id' => $user->id,
            'name' => 'Mitra '.$capacity['min'],
            'address' => 'Jl. Test',
            'grade_preference' => $grade,
            'min_capacity_kg' => $capacity['min'],
            'ideal_capacity_kg' => $capacity['ideal'],
            'max_capacity_kg' => $capacity['max'],
            'frequency' => $frequency,
        ]);
        $contract = Contract::create([
            'partner_id' => $partner->id,
            'name' => 'Kontrak',
            'status' => 'active',
            'grade' => $grade,
            'intended_use' => \App\Domain\Grade::INTENDED_USES[$grade],
            'min_capacity_kg' => $capacity['min'],
            'ideal_capacity_kg' => $capacity['ideal'],
            'max_capacity_kg' => $capacity['max'],
            'frequency' => $frequency,
            'start_date' => now()->subDay()->toDateString(),
        ]);

        return [$partner, $contract];
    }

    private function lotWithReceipt(string $grade, float $kg): ClassificationLot
    {
        $report = \App\Models\SupplierReport::create([
            'public_id' => uniqid('R'), 'contact_name' => 'Supplier', 'phone' => '1',
            'estimated_kg' => $kg, 'photo_path' => 'x.jpg', 'location_consent' => true,
            'latitude' => 0, 'longitude' => 0, 'manual_address' => 'x',
            'status' => 'picked_up', 'pin_hash' => 'x',
        ]);
        $vehicle = \App\Models\Vehicle::create(['name' => 'V', 'capacity_kg' => 999999, 'is_active' => true]);
        $pickup = \App\Models\Pickup::create([
            'supplier_report_id' => $report->id, 'vehicle_id' => $vehicle->id,
            'officer_id' => User::factory()->create(['role' => 'officer'])->id, 'status' => 'completed', 'estimated_kg' => $kg,
        ]);
        $lot = ClassificationLot::create([
            'pickup_id' => $pickup->id,
            'grade' => $grade,
            'intended_use' => \App\Domain\Grade::INTENDED_USES[$grade],
            'kg' => $kg,
            'classified_at' => now(),
            'classified_by' => $pickup->officer_id,
        ]);
        WarehouseMutation::create([
            'classification_lot_id' => $lot->id,
            'type' => 'receipt',
            'reference_type' => 'test',
            'reference_id' => 0,
            'grade' => $grade,
            'intended_use' => $lot->intended_use,
            'kg' => $kg,
            'performed_by' => $pickup->officer_id,
            'occurred_at' => now(),
        ]);

        return $lot;
    }

    private function allocatedDelivery(): array
    {
        [$partner, $contract] = $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 300]);
        $this->lotWithReceipt('Layak', 120);

        $this->actingAs(User::factory()->create(['role' => 'admin']))->post('/allocation/run');
        $allocation = Allocation::where('partner_id', $partner->id)->first();
        $this->assertNotNull($allocation);

        $date = \Carbon\Carbon::tomorrow();
        /** @var DeliverySchedulingService $service */
        $service = app(DeliverySchedulingService::class);
        $service->schedule($date);
        $delivery = Delivery::where('partner_id', $partner->id)->whereDate('service_date', $date->toDateString())->first();
        $this->assertNotNull($delivery);

        return [$delivery, $allocation, $partner];
    }

    public function test_schedule_builds_lines_from_reservations(): void
    {
        [$delivery] = $this->allocatedDelivery();

        $lines = $delivery->lines()->get();
        $this->assertGreaterThan(0, $lines->count());
        $this->assertSame(120.0, (float) $lines->sum('kg'));
        $this->assertSame('Layak', $lines->first()->grade);
        $this->assertSame('pakan_ternak', $lines->first()->intended_use);
    }

    public function test_schedule_is_idempotent_no_duplicate_lines(): void
    {
        [$delivery] = $this->allocatedDelivery();

        /** @var DeliverySchedulingService $service */
        $service = app(DeliverySchedulingService::class);
        $service->schedule(\Carbon\Carbon::tomorrow());
        $service->schedule(\Carbon\Carbon::tomorrow());

        // Two allocations (minimum + ideal increment) → two reservation-backed lines.
        $this->assertSame(120.0, (float) $delivery->lines()->get()->sum('kg'));
        $this->assertSame(2, $delivery->lines()->count());
    }

    public function test_lines_only_from_own_partner_and_period(): void
    {
        // Partner B also has a reservation, but must not receive A's kg.
        [$partnerA, $contractA] = $this->partnerWithContract(['min' => 100, 'ideal' => 200, 'max' => 300]);
        [$partnerB, $contractB] = $this->partnerWithContract(['min' => 50, 'ideal' => 100, 'max' => 150]);
        $this->lotWithReceipt('Layak', 150);

        $this->actingAs(User::factory()->create(['role' => 'admin']))->post('/allocation/run');
        // Stock 150 < total min 150? No: 150 = 100 + 50 minimums, normal tier edge.
        $this->assertSame(150.0, (float) Allocation::query()->sum('allocated_kg'));

        $date = \Carbon\Carbon::tomorrow();
        app(DeliverySchedulingService::class)->schedule($date);

        $linesA = Delivery::where('partner_id', $partnerA->id)->first()->lines()->get();
        $linesB = Delivery::where('partner_id', $partnerB->id)->first()->lines()->get();
        $this->assertSame(100.0, (float) $linesA->sum('kg'));
        $this->assertSame(50.0, (float) $linesB->sum('kg'));
    }

    public function test_out_of_period_allocation_is_not_candidated(): void
    {
        [$delivery, $allocation, $partner] = $this->allocatedDelivery();

        // Move ALL of the partner's allocation periods into the past;
        // re-candidating must add nothing.
        Allocation::where('partner_id', $partner->id)->update([
            'period_start' => now()->subDays(30)->toDateString(),
            'period_end' => now()->subDays(24)->toDateString(),
        ]);
        $delivery->lines()->delete();

        app(DeliverySchedulingService::class)->schedule(\Carbon\Carbon::tomorrow());

        $this->assertSame(0, $delivery->lines()->count());
    }

    public function test_assigned_delivery_gets_no_new_lines(): void
    {
        [$delivery] = $this->allocatedDelivery();
        $delivery->update(['status' => 'assigned']);
        $before = $delivery->lines()->count();

        // New stock for a second reservation round.
        $this->lotWithReceipt('Layak', 60);
        $this->actingAs(User::factory()->create(['role' => 'admin']))->post('/allocation/run');

        app(DeliverySchedulingService::class)->schedule(\Carbon\Carbon::tomorrow());
        $this->assertSame($before, $delivery->fresh()->lines()->count());
    }
}
