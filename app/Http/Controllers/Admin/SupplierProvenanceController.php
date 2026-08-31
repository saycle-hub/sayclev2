<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Pickup;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SupplierProvenanceController extends Controller
{
    public function index(): Response
    {
        $rows = Pickup::query()
            ->with(['supplierReport', 'officer', 'lots'])
            ->whereIn('status', ['completed', 'supplier_rejected'])
            ->latest()
            ->get()
            ->flatMap(fn (Pickup $pickup) => $pickup->lots->map(fn ($lot) => [
                'supplier_id' => $pickup->supplier_report_id,
                'supplier' => $pickup->supplierReport?->contact_name,
                'pickup_id' => $pickup->id,
                'pickup_status' => $pickup->status,
                'grade' => $lot->grade,
                'intended_use' => $lot->intended_use,
                'kg' => (float) $lot->kg,
                'officer' => $pickup->officer?->name,
                'checked_in_at' => $pickup->checked_in_at?->toIso8601String(),
                'evidence' => $pickup->photo_path ? route('pickups.photo', $pickup) : null,
            ]))
            ->values();

        return Inertia::render('provenance/index', ['rows' => $rows]);
    }

    public function photo(Pickup $pickup)
    {
        abort_if(! $pickup->photo_path, 404);
        abort_if(! Storage::disk('s3-private')->exists($pickup->photo_path), 404);

        return response()->streamDownload(
            fn () => fpassthru(Storage::disk('s3-private')->readStream($pickup->photo_path)),
            basename($pickup->photo_path),
        );
    }
}
