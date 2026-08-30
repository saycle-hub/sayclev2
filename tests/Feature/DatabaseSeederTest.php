<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_configured_admin_and_officer_are_seeded(): void
    {
        putenv('ADMIN_EMAIL=seed-admin@example.test');
        putenv('ADMIN_PASSWORD=admin-secret');
        putenv('OFFICER_EMAIL=seed-officer@example.test');
        putenv('OFFICER_PASSWORD=officer-secret');

        $this->seed(DatabaseSeeder::class);

        $this->assertSame('admin', User::whereEmail('seed-admin@example.test')->value('role'));
        $this->assertTrue(Hash::check('admin-secret', User::whereEmail('seed-admin@example.test')->value('password')));
        $this->assertSame('officer', User::whereEmail('seed-officer@example.test')->value('role'));
    }
}
