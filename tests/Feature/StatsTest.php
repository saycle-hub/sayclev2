<?php

namespace Tests\Feature;

use App\Models\FinancialLine;
use App\Models\Partner;
use App\Models\Pickup;
use App\Models\Price;
use App\Models\SupplierReport;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WarehouseMutation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Fase 8: admin statistics must reconcile to canonical ledgers.
 * Money = financial_lines snapshot amounts; kg = warehouse_mutations
 * receipts. Legacy PickupTask/price-current paths must be gone.
 */
class StatsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_kpi_reads_snapshots_and_ledger_not_current_prices(): void
    {
        // Ledger: 120 kg Layak receipt; snapshot lines exist.
        WarehouseMutation::create(['type' => 'receipt', 'grade' => 'Layak', 'kg' => 120, 'performed_by' => $this->admin->id, 'occurred_at' => now()]);
        FinancialLine::create(['type' => 'supplier_payment', 'direction' => 'payable', 'grade' => 'Layak', 'kg' => 120, 'unit_price' => 1500, 'amount' => 180000, 'currency' => 'IDR', 'status' => 'paid', 'paid_at' => now()]);
        FinancialLine::create(['type' => 'partner_invoice', 'direction' => 'receivable', 'grade' => 'Layak', 'kg' => 100, 'unit_price' => 2000, 'amount' => 200000, 'currency' => 'IDR', 'status' => 'issued']);

        // Current prices differ wildly; realized figures must ignore them.
        Price::create(['grade' => 'Layak', 'buy_price' => 1, 'sell_price' => 999999]);

        $response = $this->actingAs($this->admin)->get('/stats');

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('stats/index')
            ->where('kpi.kg_terolah', 120)
            ->where('kpi.pengeluaran', 180000)
            ->where('kpi.pendapatan', 200000)
            ->where('kpi.margin', 20000)
        );
    }

    public function test_kg_terolah_is_receipts_not_stock_outs_or_legacy_tasks(): void
    {
        WarehouseMutation::create(['type' => 'receipt', 'grade' => 'Layak', 'kg' => 100, 'performed_by' => $this->admin->id, 'occurred_at' => now()]);
        WarehouseMutation::create(['type' => 'stock_out', 'grade' => 'Layak', 'kg' => 40, 'performed_by' => $this->admin->id, 'occurred_at' => now()]);
        WarehouseMutation::create(['type' => 'adjustment', 'grade' => 'Layak', 'kg' => -10, 'performed_by' => $this->admin->id, 'occurred_at' => now()]);

        $response = $this->actingAs($this->admin)->get('/stats');

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('stats/index')
            ->where('kpi.kg_terolah', 100)
        );
    }

    public function test_pricing_change_does_not_move_historical_stats(): void
    {
        WarehouseMutation::create(['type' => 'receipt', 'grade' => 'Layak', 'kg' => 100, 'performed_by' => $this->admin->id, 'occurred_at' => now()]);
        FinancialLine::create(['type' => 'partner_invoice', 'direction' => 'receivable', 'grade' => 'Layak', 'kg' => 100, 'unit_price' => 2000, 'amount' => 200000, 'currency' => 'IDR', 'status' => 'issued']);

        $before = $this->actingAs($this->admin)->get('/stats')->viewData('page');
        // Simulate a later price edit; stats must not move.
        Price::create(['grade' => 'Kurang Layak', 'buy_price' => 100, 'sell_price' => 5000]);
        $after = $this->actingAs($this->admin)->get('/stats')->viewData('page');

        $jsonBefore = json_encode($before['props']['kpi']);
        $jsonAfter = json_encode($after['props']['kpi']);
        $this->assertSame($jsonBefore, $jsonAfter);
        $this->assertStringContainsString('200000', $jsonAfter);
    }

    public function test_revenue_lists_financial_lines_with_snapshot_amounts(): void
    {
        $report = SupplierReport::create(['public_id' => uniqid('R'), 'contact_name' => 'Pak Suplier', 'phone' => '1', 'estimated_kg' => 10, 'photo_path' => 'x.jpg', 'location_consent' => true, 'latitude' => 0, 'longitude' => 0, 'manual_address' => 'x', 'status' => 'picked_up', 'pin_hash' => 'x']);
        FinancialLine::create(['type' => 'supplier_payment', 'direction' => 'payable', 'supplier_report_id' => $report->id, 'grade' => 'Layak', 'kg' => 50, 'unit_price' => 1500, 'amount' => 75000, 'currency' => 'IDR', 'status' => 'issued']);
        FinancialLine::create(['type' => 'partner_invoice', 'direction' => 'receivable', 'grade' => 'Kurang Layak', 'kg' => 30, 'unit_price' => 900, 'amount' => 27000, 'currency' => 'IDR', 'status' => 'issued']);

        $response = $this->actingAs($this->admin)->get('/stats/revenue');

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('stats/revenue')
            ->has('transactions', 2)
            ->where('transactions.0.pengeluaran', 0)
            ->where('transactions.0.pendapatan', 27000)
            ->where('transactions.0.pihak', 'Mitra')
            ->where('totals.pendapatan', 27000)
            ->where('totals.pengeluaran', 75000)
            ->where('totals.margin', -48000)
        );
    }

    public function test_impact_counts_receipt_kg_per_grade(): void
    {
        WarehouseMutation::create(['type' => 'receipt', 'grade' => 'Layak', 'kg' => 70, 'performed_by' => $this->admin->id, 'occurred_at' => now()]);
        WarehouseMutation::create(['type' => 'receipt', 'grade' => 'Tidak Layak', 'kg' => 30, 'performed_by' => $this->admin->id, 'occurred_at' => now()]);
        WarehouseMutation::create(['type' => 'stock_out', 'grade' => 'Layak', 'kg' => 20, 'performed_by' => $this->admin->id, 'occurred_at' => now()]);

        $response = $this->actingAs($this->admin)->get('/stats/impact');

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('stats/impact')
            ->where('impact.0.kg', 70)
            ->where('impact.2.kg', 30)
            ->where('totalKg', 100)
        );
    }

    public function test_partners_totals_count_partners_and_supplier_reports(): void
    {
        Partner::create(['user_id' => User::factory()->create(['role' => 'partner'])->id, 'name' => 'M1', 'address' => 'A', 'min_capacity_kg' => 10, 'ideal_capacity_kg' => 20, 'max_capacity_kg' => 30, 'frequency' => 'harian']);

        $response = $this->actingAs($this->admin)->get('/stats/partners');

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('stats/partners')
            ->where('totals.mitra', 1)
        );
    }

    public function test_stats_are_admin_only(): void
    {
        $this->get('/stats')->assertRedirect('/login');
        $this->actingAs(User::factory()->create(['role' => 'officer']))->get('/stats')->assertForbidden();
        $this->actingAs(User::factory()->create(['role' => 'partner']))->get('/stats')->assertForbidden();
    }

    public function test_supplier_payments_are_paid_at_checkin_and_kpi_pengeluaran_sums_paid_lines(): void
    {
        Storage::fake('s3-private');
        $officer = User::factory()->create(['role' => 'officer']);
        $report = SupplierReport::create(['public_id' => uniqid('R'), 'contact_name' => 'Supplier', 'phone' => '1', 'estimated_kg' => 10, 'photo_path' => 'x.jpg', 'location_consent' => true, 'latitude' => 0, 'longitude' => 0, 'manual_address' => 'x', 'status' => 'pickup_scheduled', 'pin_hash' => 'x']);
        $vehicle = Vehicle::create(['name' => 'V', 'capacity_kg' => 100, 'is_active' => true]);
        $pickup = Pickup::create(['supplier_report_id' => $report->id, 'vehicle_id' => $vehicle->id, 'officer_id' => $officer->id, 'status' => 'assigned', 'estimated_kg' => 10]);
        Price::create(['grade' => 'Layak', 'buy_price' => 1500, 'sell_price' => 3000]);

        $this->actingAs($officer)->post("/officer/pickups/{$pickup->id}/checkin", ['actual_total_kg' => 10, 'grades' => [['grade' => 'Layak', 'kg' => 10]], 'photo' => UploadedFile::fake()->image('p.jpg'), 'checkin_lat' => 0, 'checkin_lng' => 0])->assertRedirect();

        $payments = FinancialLine::where('type', 'supplier_payment')->get();
        $this->assertGreaterThan(0, $payments->count());
        $payments->each(fn (FinancialLine $line) => $this->assertSame('paid', $line->status));
        $payments->each(fn (FinancialLine $line) => $this->assertNotNull($line->paid_at));

        $expected = (float) $payments->sum('amount');
        $this->actingAs($this->admin)->get('/stats')->assertOk()->assertInertia(fn ($page) => $page
            ->component('stats/index')
            // Closure: JSON round-trip may deliver whole rupiah as int.
            ->where('kpi.pengeluaran', fn ($v) => abs((float) $v - $expected) < 0.005)
        );
    }
}
