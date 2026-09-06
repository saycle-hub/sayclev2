<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSaleRequest;
use App\Http\Requests\TrackSaleRequest;
use App\Models\SupplierReport;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Inertia\Inertia;
use Inertia\Response;

class SaleController extends Controller
{
    public function create(): Response { return Inertia::render('report'); }
    public function tracking(): Response { return Inertia::render('tracking'); }

    public function store(StoreSaleRequest $request): SymfonyResponse
    {
        $pin = (string) random_int(100000, 999999);
        do { $publicId = Str::random(32); } while (SupplierReport::where('public_id', $publicId)->exists());

        $lat = $request->safe()->input('latitude');
        $lng = $request->safe()->input('longitude');
        $manualAddress = $request->safe()->input('manual_address');

        if (($lat === null || $lng === null) && ! empty($manualAddress)) {
            $addr = strtolower($manualAddress);
            if (str_contains($addr, 'condong') || str_contains($addr, 'ngringin')) {
                $lat = -7.7554; $lng = 110.3957;
            } elseif (str_contains($addr, 'kranggan') || str_contains($addr, 'poncowinatan')) {
                $lat = -7.7828; $lng = 110.3671;
            } elseif (str_contains($addr, 'merapi') || str_contains($addr, 'cangkringan') || str_contains($addr, 'pakem')) {
                $lat = -7.6500; $lng = 110.4500;
            } elseif (str_contains($addr, 'sleman') || str_contains($addr, 'depok')) {
                $lat = -7.7600; $lng = 110.3700;
            } else {
                $lat = -7.7828; $lng = 110.3671;
            }
        }

        $sale = (new SupplierReport)->forceFill([
            'contact_name' => $request->safe()->input('contact'),
            'estimated_kg' => $request->safe()->input('estimate_kg'),
            'location_consent' => $request->safe()->input('location_consent', true),
            'manual_address' => $manualAddress,
            'latitude' => $lat,
            'longitude' => $lng,
            'public_id' => $publicId,
            'pin_hash' => Hash::make($pin),
            'photo_path' => $request->file('photo')->store('supplier-reports', 's3-private'),
            'status' => 'submitted',
        ]);
        $sale->save();

        $response = Inertia::render('report-success', ['sale' => ['public_id' => $sale->public_id, 'pin' => $pin]])->toResponse($request);
        $response->headers->set('Cache-Control', 'private, no-store');
        return $response;
    }

    public function show(\Illuminate\Http\Request $request): SymfonyResponse|RedirectResponse
    {
        $publicId = trim((string) $request->input('public_id', ''));
        $pin = trim((string) $request->input('pin', ''));

        if ($request->isMethod('get') && ($publicId === '' || $pin === '')) {
            return redirect()->route('tracking.create');
        }

        $request->validate([
            'public_id' => ['required', 'string'],
            'pin' => ['required', 'string'],
        ]);

        $sale = SupplierReport::with(['pickups.vehicle', 'pickups.officer', 'pickups.lots'])
            ->where('public_id', $publicId)
            ->first();

        if (! $sale || ! Hash::check($pin, $sale->pin_hash)) {
            return redirect()->route('tracking.create')->withErrors(['public_id' => 'ID Laporan atau PIN tidak valid. Mohon periksa kembali Sale ID dan PIN Anda.']);
        }

        $latestPickup = $sale->pickups->sortByDesc('id')->first();
        $lots = $latestPickup ? $latestPickup->lots->map(fn ($lot) => [
            'grade' => $lot->grade,
            'kg' => (float) $lot->kg,
        ])->values()->all() : [];

        $response = Inertia::render('tracking', ['sale' => [
            'public_id' => $sale->public_id,
            'contact_name' => $sale->contact_name,
            'address' => $sale->manual_address,
            'status' => $sale->status,
            'estimate_kg' => $sale->estimated_kg ? (float) $sale->estimated_kg : null,
            'created_at' => $sale->created_at?->toISOString(),
            'pickup' => $latestPickup ? [
                'status' => $latestPickup->status,
                'vehicle_name' => $latestPickup->vehicle?->name,
                'officer_name' => $latestPickup->officer?->name,
                'actual_total_kg' => $latestPickup->actual_total_kg ? (float) $latestPickup->actual_total_kg : null,
                'completed_at' => $latestPickup->completed_at?->toISOString(),
                'lots' => $lots,
            ] : null,
        ]])->toResponse($request);

        $response->headers->set('Cache-Control', 'private, no-store');
        return $response;
    }
}
