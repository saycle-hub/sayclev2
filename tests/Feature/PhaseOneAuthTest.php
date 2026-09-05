<?php

namespace Tests\Feature;

use App\Http\Middleware\RoleMiddleware;
use App\Models\Partner;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class PhaseOneAuthTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $extra = []): array
    {
        return array_merge(['name' => 'Mitra', 'email' => 'mitra@example.com', 'password' => 'password', 'password_confirmation' => 'password', 'address' => 'Address', 'latitude' => -6.2000000, 'longitude' => 106.8166667, 'grade_preference' => 'Layak', 'min_capacity_kg' => 1, 'ideal_capacity_kg' => 2, 'max_capacity_kg' => 3, 'frequency' => 'mingguan', 'receiving_days' => ['monday'], 'overcapacity_terms_accepted' => true], $extra);
    }

    public function test_registration_forces_partner_and_stores_profile_terms(): void
    {
        $this->post('/register', $this->payload(['role' => 'admin']))->assertRedirect(route('partner.index', absolute: false));
        $user = User::first();
        $this->assertSame('partner', $user->role);
        $this->assertNotNull($user->partner->overcapacity_terms_accepted_at);
        $this->assertSame(Partner::OVERCAPACITY_TERMS_VERSION, $user->partner->overcapacity_terms_version);
    }

    public function test_missing_onboarding_is_rejected(): void
    {
        $this->from('/register')->post('/register', ['name' => 'Mitra', 'email' => 'x@example.com', 'password' => 'password', 'password_confirmation' => 'password'])
            ->assertSessionHasErrors(['address', 'receiving_days', 'overcapacity_terms_accepted']);
    }

    public function test_terms_gate_and_access(): void
    {
        $user = User::factory()->create(['role' => 'partner']);
        $partner = Partner::create(['user_id' => $user->id, 'name' => 'Mitra', 'address' => 'Address', 'min_capacity_kg' => 1, 'ideal_capacity_kg' => 2, 'max_capacity_kg' => 3, 'frequency' => 'mingguan', 'receiving_days' => ['monday'], 'overcapacity_terms_version' => null, 'overcapacity_terms_accepted_at' => null]);
        $this->actingAs($user)->get(route('partner.index'))->assertRedirect(route('partner.terms', absolute: false));
        $partner->update(['overcapacity_terms_version' => Partner::OVERCAPACITY_TERMS_VERSION, 'overcapacity_terms_accepted_at' => now()]);
        $this->actingAs($user)->get(route('partner.index'))->assertOk();
    }

    public function test_guest_and_wrong_roles_are_blocked(): void
    {
        $this->get(route('partner.index'))->assertRedirect(route('login'));
        foreach (['admin', 'officer'] as $role) {
            $this->actingAs(User::factory()->create(['role' => $role]))->get(route('partner.index'))->assertForbidden();
            $this->actingAs(User::factory()->create(['role' => $role]))->get(route('partner.terms'))->assertForbidden();
        }
    }

    public function test_role_middleware_fails_closed_without_user(): void
    {
        // If the auth guard somehow yields no user (stale session token, user
        // deleted mid-session), the role middleware must reject instead of
        // silently promoting. (It once defaulted a missing user to admin.)
        $middleware = new RoleMiddleware;
        $request = Request::create('/dashboard');
        $this->expectException(HttpException::class);
        $middleware->handle($request, fn () => response('ok'), 'admin');
    }

    public function test_officer_login_redirects(): void
    {
        $officer = User::factory()->create(['role' => 'officer', 'password' => Hash::make('password')]);
        $this->post('/login', ['email' => $officer->email, 'password' => 'password'])->assertRedirect(route('officer.dashboard', absolute: false));
    }
}
