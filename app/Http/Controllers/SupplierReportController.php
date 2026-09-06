<?php

namespace App\Http\Controllers;

use App\Models\SupplierReport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SupplierReportController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'masuk');
        $selectedDate = $request->query('date', now()->toDateString());

        $applyDateFilter = function ($q) use ($selectedDate) {
            if ($selectedDate && $selectedDate !== 'all') {
                $q->where(function ($sub) use ($selectedDate) {
                    $sub->whereDate('supplier_reports.created_at', $selectedDate)
                       ->orWhereHas('pickups', function ($p) use ($selectedDate) {
                           $p->whereDate('scheduled_for', $selectedDate)
                             ->orWhereDate('created_at', $selectedDate)
                             ->orWhereDate('completed_at', $selectedDate);
                       });
                });
            }
        };

        $query = SupplierReport::with(['pickup.vehicle', 'pickup.officer']);
        $applyDateFilter($query);

        if ($tab === 'diterima') {
            $query->where(function ($q) {
                $q->where('status', 'accepted')
                  ->orWhere(function ($q2) {
                      $q2->where('status', 'pickup_scheduled')
                         ->whereDoesntHave('pickups', fn ($p) => $p->whereNotNull('officer_id')->where('status', '!=', 'planned'));
                  });
            });
        } elseif ($tab === 'dijemput') {
            $query->where(function ($q) {
                $q->whereIn('status', ['in_progress', 'picked_up', 'closed', 'rejected', 'supplier_rejected'])
                  ->orWhere(function ($q2) {
                      $q2->where('status', 'pickup_scheduled')
                         ->whereHas('pickups', fn ($p) => $p->whereNotNull('officer_id')->where('status', '!=', 'planned'));
                  });
            });
        } else {
            $query->whereIn('status', ['submitted', 'under_review', 'Pending review']);
        }

        $reports = $query->latest()->get()->map(fn (SupplierReport $r) => $this->row($r));

        $masukQuery = SupplierReport::whereIn('status', ['submitted', 'under_review', 'Pending review']);
        $applyDateFilter($masukQuery);

        $diterimaQuery = SupplierReport::where(function ($q) {
            $q->where('status', 'accepted')
              ->orWhere(function ($q2) {
                  $q2->where('status', 'pickup_scheduled')
                     ->whereDoesntHave('pickups', fn ($p) => $p->whereNotNull('officer_id')->where('status', '!=', 'planned'));
              });
        });
        $applyDateFilter($diterimaQuery);

        $dijemputQuery = SupplierReport::where(function ($q) {
            $q->whereIn('status', ['in_progress', 'picked_up', 'closed', 'rejected', 'supplier_rejected'])
              ->orWhere(function ($q2) {
                  $q2->where('status', 'pickup_scheduled')
                     ->whereHas('pickups', fn ($p) => $p->whereNotNull('officer_id')->where('status', '!=', 'planned'));
              });
        });
        $applyDateFilter($dijemputQuery);

        $counts = [
            'masuk' => $masukQuery->count(),
            'diterima' => $diterimaQuery->count(),
            'dijemput' => $dijemputQuery->count(),
        ];

        return Inertia::render('supplier-reports/index', [
            'reports' => $reports,
            'activeTab' => $tab,
            'counts' => $counts,
            'selectedDate' => $selectedDate,
        ]);
    }

    public function show(SupplierReport $supplierReport): Response
    {
        return Inertia::render('supplier-reports/show', [
            'report' => $this->row($supplierReport),
        ]);
    }

    public function photo(Request $request, SupplierReport $supplierReport)
    {
        $disk = config('filesystems.private', 's3-private');
        abort_if(! Storage::disk($disk)->exists($supplierReport->photo_path), 404);

        if ($request->query('inline')) {
            $mime = Storage::disk($disk)->mimeType($supplierReport->photo_path) ?? 'image/jpeg';

            return response()->stream(
                fn () => fpassthru(Storage::disk($disk)->readStream($supplierReport->photo_path)),
                200,
                [
                    'Content-Type' => $mime,
                    'Content-Disposition' => 'inline; filename="'.basename($supplierReport->photo_path).'"',
                ]
            );
        }

        return response()->streamDownload(
            fn () => fpassthru(Storage::disk($disk)->readStream($supplierReport->photo_path)),
            basename($supplierReport->photo_path)
        );
    }

    public function accept(SupplierReport $supplierReport): RedirectResponse
    {
        $this->transition($supplierReport, 'accepted');

        return redirect()->route('supplier-reports.index', ['tab' => 'diterima'])->with('success', 'Laporan berhasil diterima dan siap dijadwalkan!');
    }

    public function reject(SupplierReport $supplierReport): RedirectResponse
    {
        $this->transition($supplierReport, 'rejected');

        return redirect()->route('supplier-reports.index', ['tab' => 'dijemput'])->with('success', 'Laporan telah ditolak.');
    }

    private function transition(SupplierReport $report, string $status): void
    {
        abort_unless(in_array($report->status, ['submitted', 'under_review', 'Pending review'], true), 409);
        $report->update(['status' => $status]);
    }

    private function row(SupplierReport $r): array
    {
        $lat = $r->latitude !== null ? (float) $r->latitude : null;
        $lng = $r->longitude !== null ? (float) $r->longitude : null;

        if ($lat === null || $lng === null) {
            $addr = strtolower($r->manual_address ?? '');
            if (str_contains($addr, 'sosrowijayan') || str_contains($addr, 'malioboro') || str_contains($addr, 'gedongtengen') || str_contains($addr, 'sosromenduran')) {
                $lat = -7.7915; $lng = 110.3653;
            } elseif (str_contains($addr, 'condong') || str_contains($addr, 'ngringin')) {
                $lat = -7.7554; $lng = 110.3957;
            } elseif (str_contains($addr, 'kranggan') || str_contains($addr, 'poncowinatan')) {
                $lat = -7.7828; $lng = 110.3671;
            } elseif (str_contains($addr, 'merapi') || str_contains($addr, 'cangkringan') || str_contains($addr, 'pakem')) {
                $lat = -7.6500; $lng = 110.4500;
            } elseif (str_contains($addr, 'sleman') || str_contains($addr, 'depok') || str_contains($addr, 'yogyakarta') || str_contains($addr, 'jogja')) {
                $lat = -7.7600; $lng = 110.3700;
            }
            if ($lat !== null && $lng !== null) {
                $r->update(['latitude' => $lat, 'longitude' => $lng]);
            }
        }

        $contact = $r->contact_name;
        $phone = $r->phone ?? $contact;

        $pickup = $r->pickups->first(fn ($p) => $p->officer_id !== null && $p->status !== 'planned') ?? $r->pickup;
        $isAssigned = $pickup && $pickup->officer_id !== null && $pickup->status !== 'planned';

        return [
            'id' => $r->id,
            'public_id' => $r->public_id,
            'contact' => $contact,
            'phone' => $phone,
            'estimated_kg' => (float) $r->estimated_kg,
            'status' => $r->status,
            'pickup_driver' => $isAssigned ? $pickup->officer?->name : null,
            'pickup_vehicle' => $isAssigned ? $pickup->vehicle?->name : null,
            'pickup_status' => $pickup?->status,
            'address' => $r->manual_address,
            'latitude' => $lat,
            'longitude' => $lng,
            'created_at' => $r->created_at?->toISOString(),
            'updated_at' => $r->updated_at?->toISOString(),
            'photo_url' => route('supplier-reports.photo', ['supplierReport' => $r, 'inline' => 1]),
            'wa_accepted_url' => \App\Services\WhatsAppNotificationService::generateUrl(
                $phone,
                \App\Services\WhatsAppNotificationService::reportAcceptedMessage($contact, $r->public_id, (float) $r->estimated_kg)
            ),
        ];
    }
}
