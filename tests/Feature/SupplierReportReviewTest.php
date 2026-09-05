<?php

namespace Tests\Feature;

use App\Models\SupplierReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class SupplierReportReviewTest extends TestCase
{
    use RefreshDatabase;

    private function report(string $status = 'submitted'): SupplierReport
    {
        return SupplierReport::create([
            'public_id' => Str::random(32),
            'contact_name' => 'Supplier Contact',
            'phone' => '08123456789',
            'estimated_kg' => 12.5,
            'photo_path' => 'reports/proof.jpg',
            'location_consent' => true,
            'latitude' => -6.2,
            'longitude' => 106.8,
            'manual_address' => 'Market address',
            'status' => $status,
            'pin_hash' => Hash::make('123456'),
        ]);
    }

    private function user(string $role): User
    {
        return User::factory()->create(['role' => $role]);
    }

    public function test_guest_is_redirected_from_list_actions_and_photo(): void
    {
        $report = $this->report();
        foreach ([
            ['get', route('supplier-reports.index')],
            ['get', route('supplier-reports.show', $report)],
            ['get', route('supplier-reports.photo', $report)],
            ['post', route('supplier-reports.accept', $report)],
            ['post', route('supplier-reports.reject', $report)],
        ] as [$method, $url]) {
            $this->{$method}($url)->assertRedirect(route('login'));
        }
    }

    public function test_partner_and_officer_are_forbidden(): void
    {
        $report = $this->report();
        foreach (['partner', 'officer'] as $role) {
            $this->actingAs($this->user($role))->get(route('supplier-reports.index'))->assertForbidden();
            $this->actingAs($this->user($role))->post(route('supplier-reports.accept', $report))->assertForbidden();
            $this->actingAs($this->user($role))->get(route('supplier-reports.photo', $report))->assertForbidden();
        }
    }

    public function test_admin_list_contains_only_reviewable_public_fields_and_detail_is_allowed(): void
    {
        $submitted = $this->report('submitted');
        $underReview = $this->report('under_review');
        $this->report('accepted');
        $response = $this->withoutMiddleware(\App\Http\Middleware\HandleInertiaRequests::class)
            ->actingAs($this->user('admin'))->withHeaders(['X-Inertia' => 'true', 'X-Requested-With' => 'XMLHttpRequest'])
            ->get(route('supplier-reports.index'));
        $response->assertOk();
        $rows = $response->json('props.reports');
        $this->assertCount(2, $rows);
        foreach ($rows as $row) {
            $this->assertContains($row['id'], [$submitted->id, $underReview->id]);
            $this->assertArrayNotHasKey('pin_hash', $row);
            $this->assertArrayNotHasKey('photo_path', $row);
        }
        $this->withoutMiddleware(\App\Http\Middleware\HandleInertiaRequests::class)
            ->actingAs($this->user('admin'))->withHeaders(['X-Inertia' => 'true', 'X-Requested-With' => 'XMLHttpRequest'])
            ->get(route('supplier-reports.show', $submitted))
            ->assertOk();
        $this->assertArrayNotHasKey('pin_hash', $this->getJson(route('supplier-reports.show', $submitted))->json('props.report'));
    }

    public function test_admin_can_download_private_photo(): void
    {
        Storage::fake('s3-private');
        $report = $this->report();
        Storage::disk('s3-private')->put($report->photo_path, 'proof');
        $this->actingAs($this->user('admin'))->get(route('supplier-reports.photo', $report))
            ->assertOk()->assertDownload('proof.jpg');
    }

    public function test_admin_can_accept_and_reject_submitted_or_under_review_reports(): void
    {
        foreach (['submitted', 'under_review'] as $from) {
            $report = $this->report($from);
            $route = $from === 'submitted' ? 'supplier-reports.accept' : 'supplier-reports.reject';
            $expected = $from === 'submitted' ? 'accepted' : 'rejected';
            $this->actingAs($this->user('admin'))->post(route($route, $report))->assertRedirect();
            $this->assertDatabaseHas('supplier_reports', ['id' => $report->id, 'status' => $expected]);
        }
    }

    public function test_repeat_or_invalid_transition_is_rejected(): void
    {
        foreach (['accepted', 'rejected'] as $status) {
            $report = $this->report($status);
            $this->actingAs($this->user('admin'))->post(route('supplier-reports.accept', $report))->assertStatus(409);
        }
    }
}
