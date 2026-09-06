<?php

namespace Tests\Feature;

use App\Models\Price;
use App\Models\Stock;
use App\Models\User;
use App\Models\WarehouseMutation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    public function test_guests_cannot_access_stock_pages(): void
    {
        $this->get('/stock')->assertRedirect('/login');
        $this->get('/prices')->assertRedirect('/login');
        $this->post('/stock/adjust')->assertRedirect('/login');
        $this->post('/prices')->assertRedirect('/login');
    }

    public function test_non_admin_cannot_access_stock_pages(): void
    {
        $officer = User::factory()->create(['role' => 'officer']);

        $this->actingAs($officer)->get('/stock')->assertForbidden();
        $this->actingAs($officer)->get('/prices')->assertForbidden();
        $this->actingAs($officer)->post('/stock/adjust', [])->assertForbidden();
    }

    public function test_admin_can_view_stock_index(): void
    {
        // Stock totals read the canonical ledger; entries come via the admin
        // adjust endpoint which mirrors into warehouse_mutations.
        $admin = $this->admin();
        $this->actingAs($admin)->post('/stock/adjust', ['grade' => 'Layak', 'type' => 'in', 'kg' => 10]);
        $this->actingAs($admin)->post('/stock/adjust', ['grade' => 'Layak', 'type' => 'out', 'kg' => 3]);
        $this->actingAs($admin)->post('/stock/adjust', ['grade' => 'Tidak Layak', 'type' => 'in', 'kg' => 5]);

        $response = $this->actingAs($admin)->get('/stock');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('stock/index')
            ->has('stock', 3)
            ->where('stock.0.grade', 'Layak')
            ->where('stock.0.total_kg', 7)
            ->where('stock.2.total_kg', 5)
            ->has('entries', 3));
    }

    public function test_admin_can_adjust_stock(): void
    {
        $response = $this->actingAs($this->admin())->post('/stock/adjust', [
            'grade' => 'Kurang Layak',
            'type' => 'in',
            'kg' => 12.5,
            'description' => 'Panen maggot batch 1',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Mutasi stok berhasil dicatat.');
        $this->assertDatabaseHas('stocks', [
            'grade' => 'Kurang Layak',
            'type' => 'in',
            'kg' => 12.5,
        ]);
    }

    public function test_adjust_type_accepts_signed_delta(): void
    {
        $admin = $this->admin();

        // Positive correction.
        $this->actingAs($admin)->post('/stock/adjust', [
            'grade' => 'Layak',
            'type' => 'adjust',
            'kg' => 4.5,
        ])->assertRedirect();

        // Negative correction.
        $this->actingAs($admin)->post('/stock/adjust', [
            'grade' => 'Layak',
            'type' => 'adjust',
            'kg' => -1.5,
        ])->assertRedirect();

        // Baseline movement to verify net total: 10 in + 4.5 - 1.5 = 13.
        $this->actingAs($admin)->post('/stock/adjust', [
            'grade' => 'Layak',
            'type' => 'in',
            'kg' => 10,
        ])->assertRedirect();

        $this->actingAs($admin)->get('/stock')->assertInertia(fn ($page) => $page->where('stock.0.total_kg', 13));
    }

    public function test_adjust_type_rejects_zero_delta(): void
    {
        $this->actingAs($this->admin())->post('/stock/adjust', [
            'grade' => 'Layak',
            'type' => 'adjust',
            'kg' => 0,
        ])->assertSessionHasErrors(['kg']);
    }

    public function test_stock_adjust_validates_input(): void
    {
        $this->actingAs($this->admin())->post('/stock/adjust', [])->assertSessionHasErrors(['grade', 'type', 'kg']);

        $this->actingAs($this->admin())->post('/stock/adjust', [
            'grade' => 'Invalid',
            'type' => 'in',
            'kg' => 1,
        ])->assertSessionHasErrors(['grade']);

        // Movement types (in/out) still require positive quantities.
        $this->actingAs($this->admin())->post('/stock/adjust', [
            'grade' => 'Layak',
            'type' => 'in',
            'kg' => -5,
        ])->assertSessionHasErrors(['kg']);

        $this->actingAs($this->admin())->post('/stock/adjust', [
            'grade' => 'Layak',
            'type' => 'out',
            'kg' => -5,
        ])->assertSessionHasErrors(['kg']);
    }

    public function test_admin_can_view_prices_with_defaults(): void
    {
        Price::create(['grade' => 'Layak', 'buy_price' => 1000, 'sell_price' => 2500]);

        $response = $this->actingAs($this->admin())->get('/prices');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('prices/index')
            ->has('prices', 3)
            ->where('prices.0.buy_price', 1000)
            ->where('prices.1.buy_price', 0));
    }

    public function test_admin_can_update_price(): void
    {
        $this->actingAs($this->admin())->post('/prices', [
            'grade' => 'Layak',
            'buy_price' => 1200,
            'sell_price' => 3000,
        ])->assertRedirect();

        $this->assertDatabaseHas('prices', ['grade' => 'Layak', 'buy_price' => 1200, 'sell_price' => 3000]);

        // Upsert semantics: second call updates the same row.
        $this->actingAs($this->admin())->post('/prices', [
            'grade' => 'Layak',
            'buy_price' => 1500,
            'sell_price' => 3500,
        ])->assertRedirect();

        $this->assertDatabaseCount('prices', 1);
        $this->assertDatabaseHas('prices', ['grade' => 'Layak', 'buy_price' => 1500]);
    }

    public function test_price_update_validates_input(): void
    {
        $this->actingAs($this->admin())->post('/prices', [])->assertSessionHasErrors(['grade', 'buy_price', 'sell_price']);

        $this->actingAs($this->admin())->post('/prices', [
            'grade' => 'Layak',
            'buy_price' => -1,
            'sell_price' => 100,
        ])->assertSessionHasErrors(['buy_price']);
    }

    public function test_dashboard_shows_stock_stats(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->post('/stock/adjust', ['grade' => 'Layak', 'type' => 'in', 'kg' => 20]);
        $this->actingAs($admin)->post('/stock/adjust', ['grade' => 'Layak', 'type' => 'out', 'kg' => 5]);
        Price::create(['grade' => 'Layak', 'buy_price' => 0, 'sell_price' => 1000]);

        $response = $this->actingAs($admin)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('stock', 3)
            ->where('stats.total_stock_kg', 15)
            ->where('stats.estimated_revenue', 15000));
    }

    public function test_receipt_and_stock_out_net_to_zero_in_stock_displays(): void
    {
        $admin = $this->admin();

        WarehouseMutation::create([
            'type' => 'receipt',
            'grade' => 'Layak',
            'kg' => 120,
            'performed_by' => $admin->id,
            'occurred_at' => now(),
        ]);
        WarehouseMutation::create([
            'type' => 'stock_out',
            'grade' => 'Layak',
            'kg' => 120,
            'performed_by' => $admin->id,
            'occurred_at' => now(),
        ]);

        $this->actingAs($admin)->get('/stock')->assertInertia(fn ($page) => $page
            ->where('stock.0.total_kg', 0)
            ->where('trend.0.total_kg', 120));

        $this->actingAs($admin)->get('/dashboard')->assertInertia(fn ($page) => $page
            ->where('stock.0.total_kg', 0)
            ->where('trend.0.total_kg', 120)
            ->where('stats.total_stock_kg', 0));
    }

    public function test_admin_module_pages_render(): void
    {
        $admin = $this->admin();

        // All admin nav targets render real pages (nav never 404s): routes
        // (Fase 5) and stats (Fase 8) replaced their stubs.
        $this->actingAs($admin)->get('/routes')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('routes/index'));

        $this->actingAs($admin)->get('/stats')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('stats/index'));
    }

    public function test_flash_success_is_shared_with_inertia(): void
    {
        $this->actingAs($this->admin())
            ->followingRedirects()
            ->post('/prices', ['grade' => 'Layak', 'buy_price' => 100, 'sell_price' => 200])
            ->assertInertia(fn ($page) => $page->where('flash.success', 'Harga Layak berhasil diperbarui.'));
    }
}
