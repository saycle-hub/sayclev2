<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\Partner;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartnerPortalScheduleTest extends TestCase
{
    use RefreshDatabase;

    private function partner(): Partner
    {
        $user = User::factory()->create(['role' => 'partner']);

        return Partner::create([
            'user_id' => $user->id,
            'name' => 'Mitra Portal',
            'address' => 'Alamat',
            'grade_preference' => 'Layak',
            'min_capacity_kg' => 10,
            'ideal_capacity_kg' => 20,
            'max_capacity_kg' => 30,
            'frequency' => 'mingguan',
            'receiving_days' => ['monday'],
            'overcapacity_terms_version' => Partner::OVERCAPACITY_TERMS_VERSION,
            'overcapacity_terms_accepted_at' => now(),
        ]);
    }

    private function contractPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Kontrak Mingguan',
            'status' => 'active',
            'grade' => 'Layak',
            'min_capacity_kg' => 10,
            'ideal_capacity_kg' => 20,
            'max_capacity_kg' => 30,
            'frequency' => 'mingguan',
            'receiving_days' => ['monday'],
            'buy_price' => 1000,
            'sell_price' => 2000,
        ], $overrides);
    }

    public function test_portal_contract_exposes_weekly_schedule(): void
    {
        $partner = $this->partner();
        $partner->contracts()->create($this->contractPayload());

        $this->actingAs($partner->user)->get('/partner/contract')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('contracts', 1)
                ->where('contracts.0.receiving_days', ['monday'])
                ->where('contracts.0.schedule_summary', 'Setiap Senin'));
    }

    public function test_portal_contract_exposes_daily_schedule_without_days(): void
    {
        $partner = $this->partner();
        $partner->contracts()->create($this->contractPayload([
            'name' => 'Kontrak Harian',
            'frequency' => 'harian',
            'receiving_days' => ['monday'],
        ]));

        $this->actingAs($partner->user)->get('/partner/contract')
            ->assertInertia(fn ($page) => $page
                ->where('contracts.0.receiving_days', [])
                ->where('contracts.0.schedule_summary', 'Setiap hari'));
    }
}
