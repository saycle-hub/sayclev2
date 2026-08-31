<?php

namespace App\Http\Controllers;

use App\Models\DeliveryTrip;
use App\Models\Pickup;
use App\Services\DeliveryCompletionService;
use App\Services\PickupCheckinService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OfficerController extends Controller
{
    public function dashboard(): Response
    {
        $officer = auth()->user();

        $pickups = Pickup::query()
            ->with(['supplierReport', 'vehicle:id,name'])
            ->where('officer_id', $officer->id)
            ->whereIn('status', ['assigned', 'in_progress'])
            ->orderBy('stop_order')->get()
            ->map(fn (Pickup $p) => ['id' => $p->id, 'task_type' => 'pickup', 'stop_order' => $p->stop_order, 'status' => $p->status, 'scheduled_for' => $p->scheduled_for?->toISOString(), 'service_date' => $p->scheduled_for?->toDateString(), 'latitude' => $p->supplierReport->latitude !== null ? (float) $p->supplierReport->latitude : null, 'longitude' => $p->supplierReport->longitude !== null ? (float) $p->supplierReport->longitude : null, 'supplier' => ['id' => $p->supplierReport->id, 'name' => $p->supplierReport->contact_name, 'phone' => $p->supplierReport->phone, 'address' => $p->supplierReport->manual_address], 'destination' => null, 'planned_kg' => (float) $p->estimated_kg, 'vehicle' => $p->vehicle ? ['id' => $p->vehicle->id, 'name' => $p->vehicle->name] : null]);

        $deliveries = DeliveryTrip::query()->with(['delivery.partner:id,name,address,latitude,longitude', 'vehicle:id,name'])
            ->where('officer_id', $officer->id)
            ->whereHas('delivery', fn ($q) => $q->whereIn('status', ['planned', 'assigned', 'in_transit']))
            ->orderBy('stop_order')->get()
            ->map(fn (DeliveryTrip $t) => ['id' => $t->id, 'task_type' => 'delivery', 'stop_order' => $t->stop_order, 'status' => $t->status, 'scheduled_for' => $t->scheduled_for?->toISOString(), 'service_date' => $t->delivery->service_date?->toDateString(), 'latitude' => (float) $t->delivery->partner->latitude, 'longitude' => (float) $t->delivery->partner->longitude, 'supplier' => null, 'destination' => ['id' => $t->delivery->partner->id, 'name' => $t->delivery->partner->name, 'address' => $t->delivery->partner->address], 'planned_kg' => (float) $t->planned_kg, 'vehicle' => $t->vehicle ? ['id' => $t->vehicle->id, 'name' => $t->vehicle->name] : null]);

        $tasks = $pickups->concat($deliveries)->sortBy('stop_order')->values();

        return Inertia::render('officer/dashboard', [
            'tasks' => $tasks,
            'pickups' => $pickups,
            'deliveries' => $deliveries,
        ]);
    }

    public function checkinPickup(Request $request, Pickup $pickup, PickupCheckinService $service): RedirectResponse
    {
        $data = $request->validate([
            'actual_total_kg' => 'required|numeric|min:0',
            'grades' => 'required_without:supplier_rejected|array',
            'grades.*.grade' => 'required_with:grades|string',
            'grades.*.kg' => 'required_with:grades|numeric|gt:0',
            'supplier_rejected' => 'nullable|boolean',
            'refusal_reason' => 'required_if:supplier_rejected,true|nullable|string',
            'photo' => 'required|image|mimes:jpeg,jpg,png|max:5120',
            'rejection_photo' => 'required_if:supplier_rejected,true|nullable|image|mimes:jpeg,jpg,png|max:5120',
            'checkin_lat' => 'required|numeric|between:-90,90',
            'checkin_lng' => 'required|numeric|between:-180,180',
        ]);
        abort_if((int) $pickup->officer_id !== (int) $request->user()->id, 403);
        $service->complete($pickup, $data);

        return back();
    }

    public function completeDelivery(Request $request, DeliveryTrip $trip, DeliveryCompletionService $service): RedirectResponse
    {
        $data = $request->validate([
            'photo' => 'required|image|mimes:jpeg,jpg,png|max:5120',
            'received_by' => 'required|string|max:255',
        ]);
        $service->complete($trip, $data);

        return back()->with('success', 'Serah-terima berhasil dicatat.');
    }
}
