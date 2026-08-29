<?php

namespace Tests\Feature;

use App\Models\Sale;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SupplierReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_submission_stores_sale_and_photo(): void
    {
        Storage::fake('s3-private');
        $response = $this->post(route('report.store'), [
            'contact' => '08123456789', 'estimate_kg' => 25.5, 'location_consent' => true,
            'manual_address' => 'Market', 'photo' => UploadedFile::fake()->image('proof.jpg'),
        ]);

        $response->assertOk()->assertInertia(fn ($page) => $page->component('report-success')
            ->has('sale.public_id')->has('sale.pin'));
        $sale = Sale::firstOrFail();
        $this->assertSame('Pending review', $sale->status);
        $this->assertTrue(Storage::disk('s3-private')->exists($sale->photo_path));
        $this->assertFalse(Storage::disk('public')->exists($sale->photo_path));
        $this->assertTrue(Hash::check($response->original->getData()['page']['props']['sale']['pin'], $sale->pin_hash));
    }

    public function test_tracking_requires_valid_id_and_pin(): void
    {
        $sale = (new Sale)->forceFill(['public_id' => str_repeat('a', 32), 'contact' => 'x', 'estimate_kg' => 1,
            'location_consent' => false, 'photo_path' => 'x', 'pin_hash' => Hash::make('123456'), 'status' => 'Pending review']);
        $sale->save();
        $this->get(route('tracking.show', ['public_id' => $sale->public_id]))->assertMethodNotAllowed();
        $this->post(route('tracking.show'), ['public_id' => $sale->public_id, 'pin' => '654321'])->assertSessionHasErrors('public_id');
        $this->post(route('tracking.show'), ['public_id' => $sale->public_id, 'pin' => '123456'])->assertOk()
            ->assertInertia(fn ($page) => $page->component('tracking')->where('sale.status', 'Pending review'));
    }
}
