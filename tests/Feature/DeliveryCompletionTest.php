<?php

namespace Tests\Feature;

use App\Models\Allocation;
use App\Models\ClassificationLot;
use App\Models\Contract;
use App\Models\Delivery;
use App\Models\DeliveryTrip;
use App\Models\FinancialLine;
use App\Models\Partner;
use App\Models\Price;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WarehouseMutation;
use App\Services\DeliverySchedulingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DeliveryCompletionTest extends TestCase
{
    use RefreshDatabase;

    private User $officer;
    private Partner $partner;
    private Vehicle $vehicle;

    private function setupFlow(float $lotKg = 120, array $capacity = ['min' => 100, 'ideal' => 200, 'max' => 300], string $grade = 'Layak'): DeliveryTrip
    {
        Storage::fake('s3-private');
        $this->officer = User::factory()->create(['role' => 'officer']);
        $user = User::factory()->create(['role' => 'partner']);
        $this->partner = Partner::create(['user_id' => $user->id, 'name' => 'Mitra', 'address' => 'Jl. Mitra', 'grade_preference' => $grade, 'min_capacity_kg' => $capacity['min'], 'ideal_capacity_kg' => $capacity['ideal'], 'max_capacity_kg' => $capacity['max'], 'frequency' => 'harian', 'overcapacity_terms_version' => Partner::OVERCAPACITY_TERMS_VERSION, 'overcapacity_terms_accepted_at' => now()]);
        Contract::create(['partner_id' => $this->partner->id, 'name' => 'Kontrak', 'status' => 'active', 'grade' => $grade, 'intended_use' => \App\Domain\Grade::INTENDED_USES[$grade], 'min_capacity_kg' => $capacity['min'], 'ideal_capacity_kg' => $capacity['ideal'], 'max_capacity_kg' => $capacity['max'], 'frequency' => 'harian', 'sell_price' => 2000, 'buy_price' => 1500, 'start_date' => now()->subDay()->toDateString()]);

        $report = \App\Models\SupplierReport::create(['public_id' => uniqid('R'), 'contact_name' => 'S', 'phone' => '1', 'estimated_kg' => $lotKg, 'photo_path' => 'x.jpg', 'location_consent' => true, 'latitude' => 0, 'longitude' => 0, 'manual_address' => 'x', 'status' => 'picked_up', 'pin_hash' => 'x']);
        $this->vehicle = Vehicle::create(['name' => 'V', 'capacity_kg' => 999999, 'is_active' => true]);
        $pickup = \App\Models\Pickup::create(['supplier_report_id' => $report->id, 'vehicle_id' => $this->vehicle->id, 'officer_id' => $this->officer->id, 'status' => 'completed', 'estimated_kg' => $lotKg]);
        $lot = ClassificationLot::create(['pickup_id' => $pickup->id, 'grade' => $grade, 'intended_use' => \App\Domain\Grade::INTENDED_USES[$grade], 'kg' => $lotKg, 'classified_at' => now(), 'classified_by' => $this->officer->id]);
        WarehouseMutation::create(['classification_lot_id' => $lot->id, 'type' => 'receipt', 'reference_type' => 'test', 'reference_id' => 0, 'grade' => $grade, 'intended_use' => $lot->intended_use, 'kg' => $lotKg, 'performed_by' => $this->officer->id, 'occurred_at' => now()]);

        $this->actingAs(User::factory()->create(['role' => 'admin']))->post('/allocation/run');

        $date = \Carbon\Carbon::today();
        app(DeliverySchedulingService::class)->schedule($date);
        $delivery = Delivery::where('partner_id', $this->partner->id)->firstOrFail();

        // Assign a trip through the production path (Fase 4).
        $lineKg = [];
        foreach ($delivery->lines as $line) {
            $lineKg[$line->id] = (float) $line->kg;
        }
        app(DeliverySchedulingService::class)->assign($delivery, $this->vehicle->id, $this->officer->id, $lineKg);

        return DeliveryTrip::where('delivery_id', $delivery->id)->where('officer_id', $this->officer->id)->firstOrFail();
    }

    private function handoverPayload(): array
    {
        return ['photo' => UploadedFile::fake()->image('proof.jpg'), 'received_by' => 'Budi Mitra'];
    }

    public function test_completion_creates_stock_out_invoice_and_fulfils_reservation_once(): void
    {
        Price::create(['grade' => 'Layak', 'buy_price' => 1500, 'sell_price' => 9999]);
        $trip = $this->setupFlow(120);

        $this->actingAs($this->officer)->post("/officer/deliveries/{$trip->id}/complete", $this->handoverPayload())->assertRedirect();

        $delivery = Delivery::firstOrFail();
        $this->assertSame('delivered', $delivery->status);
        $this->assertSame('Budi Mitra', $delivery->received_by);
        $this->assertNotNull($delivery->delivered_at);
        $this->assertNotNull($delivery->proof_path);

        // Stock-out per trip line (1 receipt + 2 stock-out from 2 lines).
        $this->assertDatabaseCount('warehouse_mutations', 3);
        $this->assertSame(120.0, (float) WarehouseMutation::where('type', 'stock_out')->sum('kg'));
        $this->assertSame(2, WarehouseMutation::where('type', 'stock_out')->count());
        WarehouseMutation::where('type', 'stock_out')->get()->each(fn ($m) => $this->assertNotNull($m->classification_lot_id));

        // Reservation fulfilled.
        $this->assertSame('fulfilled', Reservation::firstOrFail()->status);

        // Invoice snapshot uses CONTRACT sell price (2000), not current global.
        $invoices = FinancialLine::where('type', 'partner_invoice')->get();
        $this->assertSame(2, $invoices->count());
        $invoice = $invoices->first(fn ($i) => (float) $i->kg === 100.0);
        $this->assertSame('receivable', $invoice->direction);
        $this->assertSame('issued', $invoice->status);
        $this->assertSame('2000.00', (string) $invoice->unit_price);
        $this->assertSame('200000.00', (string) $invoice->amount);
        $this->assertNotNull($invoice->due_at);
        $this->assertSame(240000.0, (float) $invoices->sum('amount'));

        // Retry idempotent: no duplicate stock-out or invoice.
        $this->actingAs($this->officer)->post("/officer/deliveries/{$trip->id}/complete", $this->handoverPayload())->assertStatus(422);
        $this->assertDatabaseCount('warehouse_mutations', 3);
        $this->assertDatabaseCount('financial_lines', 2); // two lines from two allocations, not duplicated
    }

    public function test_overcapacity_line_uses_cost_price(): void
    {
        // Surplus scenario: contract max 220, stock 260 → 20 overcapacity kg.
        Price::create(['grade' => 'Layak', 'buy_price' => 1500, 'sell_price' => 9999]);
        $trip = $this->setupFlow(260, ['min' => 100, 'ideal' => 200, 'max' => 220]);

        $this->actingAs($this->officer)->post("/officer/deliveries/{$trip->id}/complete", $this->handoverPayload())->assertRedirect();

        $invoices = FinancialLine::where('type', 'partner_invoice')->get();
        $over = $invoices->first(fn ($i) => str_contains((string) $i->description, 'harga modal'));
        $this->assertNotNull($over, 'Overcapacity invoice line must mention modal price.');
        $this->assertSame('1500.00', (string) $over->unit_price);
        // Normal lines use contract sell price 2000.
        $normal = $invoices->where('unit_price', 2000.0);
        $this->assertGreaterThan(0, $normal->count());
    }

    public function test_proof_and_receiver_are_required_and_wrong_officer_forbidden(): void
    {
        $trip = $this->setupFlow(120);

        $this->actingAs($this->officer)->post("/officer/deliveries/{$trip->id}/complete", ['received_by' => 'Budi'])->assertSessionHasErrors('photo');
        $this->actingAs($this->officer)->post("/officer/deliveries/{$trip->id}/complete", ['photo' => UploadedFile::fake()->image('p.jpg')])->assertSessionHasErrors('received_by');
        $this->actingAs(User::factory()->create(['role' => 'officer']))->post("/officer/deliveries/{$trip->id}/complete", $this->handoverPayload())->assertForbidden();
        $this->post("/officer/deliveries/{$trip->id}/complete", $this->handoverPayload())->assertForbidden();

        $this->assertSame('planned', $trip->fresh()->status);
    }

    public function test_admin_can_mark_invoice_paid_and_only_once(): void
    {
        $trip = $this->setupFlow(120);
        $this->actingAs($this->officer)->post("/officer/deliveries/{$trip->id}/complete", $this->handoverPayload())->assertRedirect();
        $invoice = FinancialLine::where('type', 'partner_invoice')->firstOrFail();

        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin)->post("/partner-invoices/{$invoice->id}/pay")->assertRedirect();
        $this->assertSame('paid', $invoice->fresh()->status);
        $this->assertNotNull($invoice->fresh()->paid_at);

        $this->actingAs($admin)->post("/partner-invoices/{$invoice->id}/pay")->assertStatus(422);
    }

    public function test_partner_portal_billing_reads_invoices_not_pickups(): void
    {
        Price::create(['grade' => 'Layak', 'buy_price' => 1500, 'sell_price' => 9999]);
        $trip = $this->setupFlow(120);
        $this->actingAs($this->officer)->post("/officer/deliveries/{$trip->id}/complete", $this->handoverPayload())->assertRedirect();

        $user = User::where('id', $this->partner->user_id)->first();
        $response = $this->actingAs($user)->get('/partner/billing');
        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('partner/billing')
            ->where('totalKg', 120)
            ->where('grandTotal', 240000)
        );
    }
}
