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
        $sale = (new SupplierReport)->forceFill([
            'contact_name' => $request->safe()->input('contact'), 'estimated_kg' => $request->safe()->input('estimate_kg'),
            ...$request->safe()->only(['location_consent', 'manual_address', 'latitude', 'longitude']),
            'public_id' => $publicId,
            'pin_hash' => Hash::make($pin),
            'photo_path' => $request->file('photo')->store('supplier-reports', 's3-private'),
            // Pending review is intake state before PRD downstream statuses begin.
            'status' => 'submitted',
        ]);
        $sale->save();

        $response = Inertia::render('report-success', ['sale' => ['public_id' => $sale->public_id, 'pin' => $pin]])->toResponse($request);
        $response->headers->set('Cache-Control', 'private, no-store');
        return $response;
    }

    public function show(TrackSaleRequest $request): SymfonyResponse|RedirectResponse
    {
        $sale = SupplierReport::where('public_id', $request->string('public_id'))->first();
        if (! $sale || ! Hash::check($request->string('pin'), $sale->pin_hash)) {
            return back()->withErrors(['public_id' => 'Invalid sale ID or PIN.']);
        }

        $response = Inertia::render('tracking', ['sale' => [
            'public_id' => $sale->public_id, 'status' => $sale->status,
            'estimate_kg' => $sale->estimated_kg, 'created_at' => $sale->created_at,
        ]])->toResponse($request);
        $response->headers->set('Cache-Control', 'private, no-store');
        return $response;
    }
}
