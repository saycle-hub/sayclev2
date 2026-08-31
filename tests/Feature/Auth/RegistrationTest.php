<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register()
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password', 'address' => 'Test address', 'latitude' => -6.2000000, 'longitude' => 106.8166667, 'grade_preference' => 'Layak', 'min_capacity_kg' => 10, 'ideal_capacity_kg' => 20, 'max_capacity_kg' => 30,
            'frequency' => 'mingguan', 'receiving_days' => ['monday'], 'overcapacity_terms_accepted' => true,
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('partner.index', absolute: false));
    }

    public function test_partner_can_register_with_capacity()
    {
        $response = $this->post('/register', [
            'name' => 'Mitra Sejahtera',
            'email' => 'mitra@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'address' => 'Jl. Contoh No. 1',
            'latitude' => -6.2000000,
            'longitude' => 106.8166667,
            'grade_preference' => 'Layak',
            'min_capacity_kg' => 50,
            'ideal_capacity_kg' => 100,
            'max_capacity_kg' => 200,
            'frequency' => 'mingguan',
            'receiving_days' => ['monday'], 'overcapacity_terms_accepted' => true,
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('partner.index', absolute: false));
    }
}
