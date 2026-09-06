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
                'evidence' => $pickup->photo_path ? route('pickups.photo', ['pickup' => $pickup, 'inline' => 1]) : null,
            ]))
            ->values();

        return Inertia::render('provenance/index', ['rows' => $rows]);
    }

    public function photo(\Illuminate\Http\Request $request, Pickup $pickup)
    {
        abort_if(! $pickup->photo_path, 404);
        $disk = config('filesystems.private', 's3-private');
        abort_if(! Storage::disk($disk)->exists($pickup->photo_path), 404);

        if ($request->query('inline')) {
            $mime = Storage::disk($disk)->mimeType($pickup->photo_path) ?? 'image/jpeg';
            return response()->stream(
                fn () => fpassthru(Storage::disk($disk)->readStream($pickup->photo_path)),
                200,
                [
                    'Content-Type' => $mime,
                    'Content-Disposition' => 'inline; filename="'.basename($pickup->photo_path).'"',
                ]
            );
        }

        return response()->streamDownload(
            fn () => fpassthru(Storage::disk($disk)->readStream($pickup->photo_path)),
            basename($pickup->photo_path)
        );
    }
}
