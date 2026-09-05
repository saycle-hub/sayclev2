<?php
namespace App\Http\Controllers;
use App\Models\SupplierReport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
class SupplierReportController extends Controller
{
 public function index(): Response { return Inertia::render('supplier-reports/index', ['reports' => SupplierReport::whereIn('status', ['submitted', 'under_review'])->latest()->get()->map(fn (SupplierReport $r) => $this->row($r))]); }
 public function show(SupplierReport $supplierReport): Response { return Inertia::render('supplier-reports/show', ['report' => $this->row($supplierReport)]); }
 public function photo(SupplierReport $supplierReport) { abort_if(! Storage::disk('s3-private')->exists($supplierReport->photo_path), 404); return response()->streamDownload(fn () => fpassthru(Storage::disk('s3-private')->readStream($supplierReport->photo_path)), basename($supplierReport->photo_path)); }
 public function accept(SupplierReport $supplierReport): RedirectResponse { $this->transition($supplierReport, 'accepted'); return back(); }
 public function reject(SupplierReport $supplierReport): RedirectResponse { $this->transition($supplierReport, 'rejected'); return back(); }
 private function transition(SupplierReport $report, string $status): void { abort_unless(in_array($report->status, ['submitted', 'under_review'], true), 409); $report->update(['status' => $status]); }
 private function row(SupplierReport $r): array { return ['id' => $r->id, 'public_id' => $r->public_id, 'contact' => $r->contact_name, 'estimated_kg' => (float) $r->estimated_kg, 'status' => $r->status, 'address' => $r->manual_address, 'latitude' => $r->latitude !== null ? (float) $r->latitude : null, 'longitude' => $r->longitude !== null ? (float) $r->longitude : null, 'created_at' => $r->created_at?->toISOString(), 'updated_at' => $r->updated_at?->toISOString(), 'photo_url' => route('supplier-reports.photo', $r)]; }
}
