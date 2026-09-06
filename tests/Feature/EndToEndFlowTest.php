<?php

namespace Tests\Feature;

use App\Domain\Grade;
use App\Models\Contract;
use App\Models\Delivery;
use App\Models\DeliveryTrip;
use App\Models\FinancialLine;
use App\Models\Partner;
use App\Models\Pickup;
use App\Models\Price;
use App\Models\SupplierReport;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WarehouseMutation;
use App\Services\DeliverySchedulingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Fase 8 exit gate: one test proves kg and money end-to-end without
 * duplication or loss:
 *   intake (public report) → accept → route → pickup check-in (supplier
 *   payment snapshot) → allocation → schedule → assign → delivery
 *   completion (invoice snapshot) → payment → stats reconcile.
 */
class EndToEndFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_intake_to_payment_produces_reconcilable_ledger_and_stats(): void
    {
        Storage::fake('s3-private');

        // --- Prices & contract ---
        Price::create(['grade' => 'Layak', 'buy_price' => 1500, 'sell_price' => 2000]);
        $admin = User::factory()->create(['role' => 'admin']);
        $officer = User::factory()->create(['role' => 'officer']);
        $partnerUser = User::factory()->create(['role' => 'partner']);
        Partner::create(['user_id' => $partnerUser->id, 'name' => 'Mitra Uji', 'address' => 'Jl. Mitra', 'grade_preference' => 'Layak', 'min_capacity_kg' => 100, 'ideal_capacity_kg' => 200, 'max_capacity_kg' => 300, 'frequency' => 'harian', 'overcapacity_terms_version' => Partner::OVERCAPACITY_TERMS_VERSION, 'overcapacity_terms_accepted_at' => now()]);
        Contract::create(['partner_id' => Partner::firstOrFail()->id, 'name' => 'Kontrak Uji', 'status' => 'active', 'grade' => 'Layak', 'intended_use' => Grade::INTENDED_USES['Layak'], 'min_capacity_kg' => 100, 'ideal_capacity_kg' => 200, 'max_capacity_kg' => 300, 'frequency' => 'harian', 'sell_price' => 2000, 'buy_price' => 1500, 'start_date' => now()->subDay()->toDateString()]);

        // --- 1. Intake: public report through the public endpoint ---
        $this->post('/lapor', [
            'contact' => 'Pak Budi',
            'estimate_kg' => 120,
            'location_consent' => '1',
            'manual_address' => 'Jl. Kenanga 1',
            'latitude' => -6.2,
            'longitude' => 106.8,
            'photo' => UploadedFile::fake()->image('sampah.jpg'),
        ])->assertOk();

        $report = SupplierReport::where('contact_name', 'Pak Budi')->firstOrFail();
        $this->assertSame('submitted', $report->status);

        // --- 2. Review + route + assign: accepted → planned pickup → assigned ---
        $this->actingAs($admin)->post("/supplier-reports/{$report->id}/accept")->assertRedirect();
        $vehicle = Vehicle::create(['name' => 'Armada Uji', 'capacity_kg' => 1000, 'is_active' => true]);
        $this->actingAs($admin)->post('/routes/optimize')->assertRedirect();
        $pickup = Pickup::where('supplier_report_id', $report->id)->firstOrFail();
        $this->actingAs($admin)->post("/routes/{$vehicle->id}/assign", ['officer_id' => $officer->id])->assertRedirect();
        $this->assertSame('assigned', $pickup->fresh()->status);

        // --- 3. Pickup check-in: 120 kg all Layak; snapshot payment 120×1500 ---
        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", [
            'actual_total_kg' => 120,
            'grades' => [['grade' => 'Layak', 'kg' => 120]],
            'photo' => UploadedFile::fake()->image('bukti.jpg'),
            'checkin_lat' => -6.2,
            'checkin_lng' => 106.8,
        ])->assertRedirect();
        $this->assertSame('completed', $pickup->fresh()->status);
        $this->assertDatabaseCount('warehouse_mutations', 1);
        $this->assertDatabaseCount('financial_lines', 1);
        $this->assertSame(180000.0, (float) FinancialLine::where('type', 'supplier_payment')->sum('amount'));

        // --- 4. Allocation + schedule + assign trip ---
        $this->actingAs($admin)->post('/allocation/run')->assertRedirect();
        $date = Carbon::today();
        app(DeliverySchedulingService::class)->schedule($date);
        $delivery = Delivery::where('partner_id', Partner::firstOrFail()->id)->firstOrFail();
        $lineKg = [];
        foreach ($delivery->lines as $line) {
            $lineKg[$line->id] = (float) $line->kg;
        }
        app(DeliverySchedulingService::class)->assign($delivery, $vehicle->id, $officer->id, $lineKg);

        // --- 5. Delivery completion: invoice snapshot at contract price ---
        $trip = DeliveryTrip::where('delivery_id', $delivery->id)->firstOrFail();
        $this->actingAs($officer)->post("/officer/deliveries/{$trip->id}/complete", [
            'photo' => UploadedFile::fake()->image('serah.jpg'),
            'received_by' => 'Budi Mitra',
        ])->assertRedirect();

        // Ledger reconciliation: 120 in. Partner min=100 → 100 min + 20 ideal
        // fill, all under contract price (stock 120 ≤ ideal 200 → normal tier).
        $this->assertSame(120.0, (float) WarehouseMutation::where('type', 'receipt')->sum('kg'));
        $deliveredKg = (float) WarehouseMutation::where('type', 'stock_out')->sum('kg');
        $this->assertSame(120.0, $deliveredKg);
        $this->assertSame(120.0, (float) FinancialLine::where('type', 'partner_invoice')->where('description', 'like', '%normal%')->sum('kg'));
        $this->assertSame(0, FinancialLine::where('type', 'partner_invoice')->where('description', 'like', '%modal%')->count());
        $this->assertSame(240000.0, (float) FinancialLine::where('type', 'partner_invoice')->sum('amount'));

        // --- 6. Payment recorded once ---
        $invoice = FinancialLine::where('type', 'partner_invoice')->firstOrFail();
        $this->actingAs($admin)->post("/partner-invoices/{$invoice->id}/pay")->assertRedirect();
        $this->assertSame('paid', $invoice->fresh()->status);
        $this->actingAs($admin)->post("/partner-invoices/{$invoice->id}/pay")->assertStatus(422);

        // --- 7. Stats reconcile to ledger + snapshots ---
        $this->actingAs($admin)->get('/stats')->assertOk()->assertInertia(fn ($page) => $page
            ->component('stats/index')
            ->where('kpi.kg_terolah', 120)
            ->where('kpi.pengeluaran', 180000)
            ->where('kpi.pendapatan', 240000)
            ->where('kpi.margin', 60000)
            ->where('kpi.total_mitra', 1)
            ->where('kpi.total_pemasok', 1)
        );

        // Admin dashboard reflects realized figures + allocation status per grade.
        $this->actingAs($admin)->get('/dashboard')->assertOk()->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('stats.realized_pendapatan', 240000)
            ->where('stats.realized_pengeluaran', 180000)
            ->where('stats.realized_margin', 60000)
            ->where('stats.active_pickup_tasks', 0)
            ->where('allocationStatus.0.grade', 'Layak')
            ->where('allocationStatus.0.status', 'Defisit')
            ->where('allocationStatus.0.stock_kg', 0)
        );
    }
}
