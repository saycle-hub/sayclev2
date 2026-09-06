<?php

namespace Tests\Feature;

use App\Models\Allocation;
use App\Models\Contract;
use App\Models\Delivery;
use App\Models\Partner;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartnerContractManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function validPartnerPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Mitra Berkah',
            'address' => 'Jl. Pasar Induk No. 12',
            'grade_preference' => 'Layak',
            'min_capacity_kg' => 100,
            'ideal_capacity_kg' => 250,
            'max_capacity_kg' => 500,
            'frequency' => 'mingguan',
            'receiving_days' => ['monday'],
        ], $overrides);
    }

    private function validContractPayload(array $overrides = []): array
    {
        return array_merge([
            'grade' => 'Layak',
            'min_capacity_kg' => 50,
            'ideal_capacity_kg' => 120,
            'max_capacity_kg' => 300,
            'frequency' => 'mingguan',
            'receiving_days' => ['monday'],
            'buy_price' => 1000,
            'sell_price' => 2500,
        ], $overrides);
    }

    public function test_guest_and_non_admin_are_blocked(): void
    {
        $partner = Partner::create($this->validPartnerPayload());

        $this->get('/partners')->assertRedirect('/login');
        $this->post('/partners', [])->assertRedirect('/login');

        $officer = User::factory()->create(['role' => 'officer']);
        $this->actingAs($officer)->get('/partners')->assertForbidden();
        $this->actingAs($officer)->get("/partners/{$partner->id}")->assertForbidden();
        $this->actingAs($officer)->post('/partners', $this->validPartnerPayload())->assertForbidden();
        $this->actingAs($officer)->post("/partners/{$partner->id}/contracts", $this->validContractPayload())->assertForbidden();
    }

    public function test_admin_can_list_partners_with_stats(): void
    {
        $withContract = Partner::create($this->validPartnerPayload(['name' => 'Aktif']));
        $withContract->contracts()->create($this->validContractPayload());
        $withContract->contracts()->create($this->validContractPayload(['grade' => 'Kurang Layak']));
        // A paused contract should not count toward "Kontrak aktif".
        $withContract->contracts()->create($this->validContractPayload(['grade' => 'Tidak Layak', 'status' => 'paused']));
        Partner::create($this->validPartnerPayload(['name' => 'Tanpa Kontrak']));

        $this->actingAs($this->admin())->get('/partners')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('partners/index')
                ->has('partners', 2)
                ->where('stats.total', 2)
                ->where('stats.active', 2)
                ->where('stats.without_contract', 1));
    }

    public function test_admin_can_search_partners(): void
    {
        Partner::create($this->validPartnerPayload(['name' => 'Tani Makmur']));
        Partner::create($this->validPartnerPayload(['name' => 'Sayur Segar']));

        $this->actingAs($this->admin())->get('/partners?q=Tani')
            ->assertInertia(fn ($page) => $page->has('partners', 1)->where('partners.0.name', 'Tani Makmur'));
    }

    public function test_admin_can_create_partner(): void
    {
        $response = $this->actingAs($this->admin())->post('/partners', $this->validPartnerPayload());

        $partner = Partner::where('name', 'Mitra Berkah')->firstOrFail();
        $response->assertRedirect("/partners/{$partner->id}");
        $this->assertDatabaseHas('partners', ['name' => 'Mitra Berkah', 'min_capacity_kg' => 100]);
    }

    public function test_partner_store_validates_capacity_order(): void
    {
        // Ideal below minimum must fail.
        $this->actingAs($this->admin())
            ->post('/partners', $this->validPartnerPayload(['min_capacity_kg' => 200, 'ideal_capacity_kg' => 100]))
            ->assertSessionHasErrors(['ideal_capacity_kg']);

        // Max below ideal must fail.
        $this->actingAs($this->admin())
            ->post('/partners', $this->validPartnerPayload(['ideal_capacity_kg' => 300, 'max_capacity_kg' => 100]))
            ->assertSessionHasErrors(['max_capacity_kg']);

        $this->actingAs($this->admin())
            ->post('/partners', $this->validPartnerPayload(['grade_preference' => 'Tidak Valid']))
            ->assertSessionHasErrors(['grade_preference']);

        $this->actingAs($this->admin())->post('/partners', [])->assertSessionHasErrors(['name', 'address', 'min_capacity_kg', 'ideal_capacity_kg', 'max_capacity_kg', 'frequency']);
    }

    public function test_admin_can_update_and_delete_partner(): void
    {
        $partner = Partner::create($this->validPartnerPayload());

        $this->actingAs($this->admin())
            ->put("/partners/{$partner->id}", $this->validPartnerPayload(['name' => 'Nama Baru', 'frequency' => 'harian']))
            ->assertRedirect('/partners');

        $this->assertDatabaseHas('partners', ['id' => $partner->id, 'name' => 'Nama Baru', 'frequency' => 'harian']);

        $this->actingAs($this->admin())->delete("/partners/{$partner->id}")->assertRedirect('/partners');
        $this->assertDatabaseMissing('partners', ['id' => $partner->id]);
    }

    public function test_deleting_partner_cascades_contracts(): void
    {
        $partner = Partner::create($this->validPartnerPayload());
        $contract = $partner->contracts()->create($this->validContractPayload());

        $this->actingAs($this->admin())->delete("/partners/{$partner->id}");
        $this->assertDatabaseMissing('contracts', ['id' => $contract->id]);
    }

    public function test_admin_can_create_contract_for_partner(): void
    {
        $partner = Partner::create($this->validPartnerPayload());

        $this->actingAs($this->admin())
            ->post("/partners/{$partner->id}/contracts", $this->validContractPayload(['end_date' => '2026-12-31', 'start_date' => '2026-01-01']))
            ->assertRedirect();

        $this->assertDatabaseHas('contracts', [
            'partner_id' => $partner->id,
            'grade' => 'Layak',
            'status' => 'active',
            'buy_price' => 1000,
        ]);
    }

    public function test_contract_store_validates_input(): void
    {
        $partner = Partner::create($this->validPartnerPayload());

        $this->actingAs($this->admin())
            ->post("/partners/{$partner->id}/contracts", [])
            ->assertSessionHasErrors(['grade', 'min_capacity_kg', 'ideal_capacity_kg', 'max_capacity_kg', 'frequency', 'buy_price', 'sell_price']);

        $this->actingAs($this->admin())
            ->post("/partners/{$partner->id}/contracts", $this->validContractPayload(['min_capacity_kg' => 500, 'ideal_capacity_kg' => 100]))
            ->assertSessionHasErrors(['ideal_capacity_kg']);

        $this->actingAs($this->admin())
            ->post("/partners/{$partner->id}/contracts", $this->validContractPayload(['start_date' => '2026-06-01', 'end_date' => '2026-01-01']))
            ->assertSessionHasErrors(['end_date']);
    }

    public function test_admin_can_update_pause_cancel_and_delete_contract(): void
    {
        $partner = Partner::create($this->validPartnerPayload());
        $contract = $partner->contracts()->create($this->validContractPayload());

        // Update.
        $this->actingAs($this->admin())
            ->put("/contracts/{$contract->id}", $this->validContractPayload(['sell_price' => 3000, 'status' => 'paused']))
            ->assertRedirect();
        $this->assertDatabaseHas('contracts', ['id' => $contract->id, 'sell_price' => 3000, 'status' => 'paused']);

        // Pause via action endpoint.
        $this->actingAs($this->admin())->put("/contracts/{$contract->id}", $this->validContractPayload(['status' => 'active']));
        $this->actingAs($this->admin())->post("/contracts/{$contract->id}/action", ['action' => 'pause']);
        $this->assertDatabaseHas('contracts', ['id' => $contract->id, 'status' => 'paused']);

        // Cancel via action.
        $this->actingAs($this->admin())->post("/contracts/{$contract->id}/action", ['action' => 'cancel']);
        $this->assertDatabaseHas('contracts', ['id' => $contract->id, 'status' => 'cancelled']);

        // Invalid action is rejected.
        $this->actingAs($this->admin())->post("/contracts/{$contract->id}/action", ['action' => 'bogus'])
            ->assertSessionHasErrors(['action']);

        // Hard delete via action.
        $this->actingAs($this->admin())->post("/contracts/{$contract->id}/action", ['action' => 'delete']);
        $this->assertDatabaseMissing('contracts', ['id' => $contract->id]);
    }

    public function test_contract_transition_releases_only_undispatched_reservations(): void
    {
        $partner = Partner::create($this->validPartnerPayload());
        $contract = $partner->contracts()->create($this->validContractPayload());
        $allocation = Allocation::create(['partner_id' => $partner->id, 'contract_id' => $contract->id, 'grade' => 'Layak', 'allocated_kg' => 10, 'allocation_type' => 'minimum', 'status' => 'approved', 'week_start' => '2026-01-01']);
        $unused = Reservation::create(['allocation_id' => $allocation->id, 'grade' => 'Layak', 'intended_use' => 'feed', 'reserved_kg' => 4, 'status' => 'reserved', 'reserved_at' => now()]);
        $used = Reservation::create(['allocation_id' => $allocation->id, 'grade' => 'Layak', 'intended_use' => 'feed', 'reserved_kg' => 6, 'status' => 'partially_delivered', 'reserved_at' => now()]);
        $vehicle = Vehicle::create(['name' => 'Truck', 'capacity_kg' => 10, 'is_active' => true]);
        $officer = User::factory()->create(['role' => 'officer']);
        $delivery = Delivery::create(['partner_id' => $partner->id, 'contract_id' => $contract->id, 'service_date' => '2026-09-01', 'status' => 'assigned', 'scheduled_for' => '2026-09-01']);
        $line = $delivery->lines()->create(['reservation_id' => $used->id, 'grade' => 'Layak', 'intended_use' => 'feed', 'kg' => 6]);
        $delivery->trips()->create(['vehicle_id' => $vehicle->id, 'officer_id' => $officer->id, 'planned_kg' => 6, 'status' => 'planned'])->lines()->create(['delivery_line_id' => $line->id, 'planned_kg' => 6]);

        $this->actingAs($this->admin())->post("/contracts/{$contract->id}/action", ['action' => 'cancel'])->assertRedirect();
        $this->assertSame('released', $unused->fresh()->status);
        $this->assertSame('partially_delivered', $used->fresh()->status);
        $this->assertDatabaseHas('delivery_lines', ['id' => $line->id]);
    }

    public function test_contract_delete_rejects_lineage_and_allows_unused_contract(): void
    {
        $partner = Partner::create($this->validPartnerPayload());
        $used = $partner->contracts()->create($this->validContractPayload());
        Allocation::create(['partner_id' => $partner->id, 'contract_id' => $used->id, 'grade' => 'Layak', 'allocated_kg' => 1, 'allocation_type' => 'minimum', 'status' => 'approved', 'week_start' => '2026-01-01']);
        $this->actingAs($this->admin())->post("/contracts/{$used->id}/action", ['action' => 'delete'])->assertStatus(409);
        $unused = $partner->contracts()->create($this->validContractPayload());
        $this->actingAs($this->admin())->post("/contracts/{$unused->id}/action", ['action' => 'delete'])->assertRedirect();
        $this->assertDatabaseMissing('contracts', ['id' => $unused->id]);
    }

    public function test_admin_can_view_global_contracts_index(): void
    {
        $partner = Partner::create($this->validPartnerPayload());
        $partner->contracts()->create($this->validContractPayload());
        $partner->contracts()->create($this->validContractPayload(['grade' => 'Kurang Layak', 'status' => 'paused']));

        $this->actingAs($this->admin())->get('/contracts')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('contracts/index')
                ->has('contracts', 2)
                ->where('contracts.0.partner.name', 'Mitra Berkah')
                ->where('stats.total', 2)
                ->where('stats.active', 1));

        $officer = User::factory()->create(['role' => 'officer']);
        $this->actingAs($officer)->get('/contracts')->assertForbidden();
    }

    public function test_admin_can_view_partner_detail_with_contracts(): void
    {
        $partner = Partner::create($this->validPartnerPayload());
        $partner->contracts()->create($this->validContractPayload());
        $partner->contracts()->create($this->validContractPayload(['grade' => 'Tidak Layak', 'status' => 'paused']));

        $this->actingAs($this->admin())->get("/partners/{$partner->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('partners/show')
                ->where('partner.name', 'Mitra Berkah')
                ->has('partner.contracts', 2));
    }
}
