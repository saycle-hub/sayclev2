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
            ->map(function (Pickup $p) use ($officer) {
                $contactName = $p->supplierReport->contact_name;
                $phone = $p->supplierReport->phone ?? $contactName;
                $vehicleName = $p->vehicle?->name ?? 'Armada';
                $waMsg = \App\Services\WhatsAppNotificationService::driverEnRouteMessage(
                    $contactName,
                    $p->supplierReport->public_id,
                    $officer->name,
                    $vehicleName,
                    $p->supplierReport->manual_address
                );

                return [
                    'id' => $p->id,
                    'task_type' => 'pickup',
                    'stop_order' => $p->stop_order,
                    'status' => $p->status,
                    'scheduled_for' => $p->scheduled_for?->toISOString(),
                    'service_date' => $p->scheduled_for?->toDateString(),
                    'latitude' => $p->supplierReport->latitude !== null ? (float) $p->supplierReport->latitude : null,
                    'longitude' => $p->supplierReport->longitude !== null ? (float) $p->supplierReport->longitude : null,
                    'supplier' => [
                        'id' => $p->supplierReport->id,
                        'name' => $contactName,
                        'phone' => $phone,
                        'address' => $p->supplierReport->manual_address,
                    ],
                    'destination' => null,
                    'planned_kg' => (float) $p->estimated_kg,
                    'vehicle' => $p->vehicle ? ['id' => $p->vehicle->id, 'name' => $p->vehicle->name] : null,
                    'wa_enroute_url' => \App\Services\WhatsAppNotificationService::generateUrl($phone, $waMsg),
                ];
            });

        $deliveries = DeliveryTrip::query()->with(['delivery.partner:id,name,address,latitude,longitude', 'vehicle:id,name'])
            ->where('officer_id', $officer->id)
            ->whereHas('delivery', fn ($q) => $q->whereIn('status', ['planned', 'assigned', 'in_transit']))
            ->orderBy('stop_order')->get()
            ->map(function (DeliveryTrip $t) use ($officer) {
                $partnerName = $t->delivery->partner->name;
                $phone = $partnerName;
                $vehicleName = $t->vehicle?->name ?? 'Armada';
                $waMsg = \App\Services\WhatsAppNotificationService::driverEnRouteMessage(
                    $partnerName,
                    "DEL-{$t->id}",
                    $officer->name,
                    $vehicleName,
                    $t->delivery->partner->address
                );

                return [
                    'id' => $t->id,
                    'task_type' => 'delivery',
                    'stop_order' => $t->stop_order,
                    'status' => $t->status,
                    'scheduled_for' => $t->scheduled_for?->toISOString(),
                    'service_date' => $t->delivery->service_date?->toDateString(),
                    'latitude' => (float) $t->delivery->partner->latitude,
                    'longitude' => (float) $t->delivery->partner->longitude,
                    'supplier' => null,
                    'destination' => [
                        'id' => $t->delivery->partner->id,
                        'name' => $partnerName,
                        'phone' => $phone,
                        'address' => $t->delivery->partner->address,
                    ],
                    'planned_kg' => (float) $t->planned_kg,
                    'vehicle' => $t->vehicle ? ['id' => $t->vehicle->id, 'name' => $t->vehicle->name] : null,
                    'wa_enroute_url' => \App\Services\WhatsAppNotificationService::generateUrl($phone, $waMsg),
                ];
            });

        $tasks = $pickups->concat($deliveries)->sortBy('stop_order')->values();

        return Inertia::render('officer/dashboard', [
            'tasks' => $tasks,
            'pickups' => $pickups,
            'deliveries' => $deliveries,
        ]);
    }

    public function showStop(Request $request, string $type, int $id): Response
    {
        abort_if(! in_array($type, ['pickup', 'delivery']), 404);
        $officer = auth()->user();
        $depot = ['lat' => -7.797068, 'lng' => 110.370529];

        if ($type === 'pickup') {
            $pickup = Pickup::query()
                ->with(['supplierReport', 'vehicle:id,name'])
                ->where('officer_id', $officer->id)
                ->findOrFail($id);

            $contactName = $pickup->supplierReport->contact_name;
            $phone = $pickup->supplierReport->phone ?? $contactName;
            $vehicleName = $pickup->vehicle?->name ?? 'Armada';
            $waMsg = \App\Services\WhatsAppNotificationService::driverEnRouteMessage(
                $contactName,
                $pickup->supplierReport->public_id,
                $officer->name,
                $vehicleName,
                $pickup->supplierReport->manual_address
            );

            $reportLat = $pickup->supplierReport->latitude !== null ? (float) $pickup->supplierReport->latitude : null;
            $reportLng = $pickup->supplierReport->longitude !== null ? (float) $pickup->supplierReport->longitude : null;

            if ($reportLat === null || $reportLng === null) {
                $addr = strtolower($pickup->supplierReport->manual_address ?? '');
                if (str_contains($addr, 'sosrowijayan') || str_contains($addr, 'malioboro') || str_contains($addr, 'gedongtengen') || str_contains($addr, 'sosromenduran')) {
                    $reportLat = -7.7915; $reportLng = 110.3653;
                } elseif (str_contains($addr, 'condong') || str_contains($addr, 'ngringin')) {
                    $reportLat = -7.7554; $reportLng = 110.3957;
                } elseif (str_contains($addr, 'kranggan') || str_contains($addr, 'poncowinatan')) {
                    $reportLat = -7.7828; $reportLng = 110.3671;
                } else {
                    $reportLat = -7.7915; $reportLng = 110.3653;
                }
                $pickup->supplierReport->update([
                    'latitude' => $reportLat,
                    'longitude' => $reportLng,
                ]);
            }

            $stop = [
                'id' => $pickup->id,
                'task_type' => 'pickup',
                'stop_order' => $pickup->stop_order,
                'status' => $pickup->status,
                'scheduled_for' => $pickup->scheduled_for?->toISOString(),
                'name' => $contactName,
                'phone' => $phone,
                'address' => $pickup->supplierReport->manual_address,
                'latitude' => $reportLat,
                'longitude' => $reportLng,
                'planned_kg' => (float) $pickup->estimated_kg,
                'vehicle' => $pickup->vehicle ? ['id' => $pickup->vehicle->id, 'name' => $pickup->vehicle->name] : null,
                'wa_enroute_url' => \App\Services\WhatsAppNotificationService::generateUrl($phone, $waMsg),
                'checkin_route' => route('officer.pickups.checkin', $pickup->id),
            ];
        } else {
            $trip = DeliveryTrip::query()
                ->with(['delivery.partner:id,name,address,latitude,longitude', 'vehicle:id,name'])
                ->where('officer_id', $officer->id)
                ->findOrFail($id);

            $partnerName = $trip->delivery->partner->name;
            $phone = $partnerName;
            $vehicleName = $trip->vehicle?->name ?? 'Armada';
            $waMsg = \App\Services\WhatsAppNotificationService::driverEnRouteMessage(
                $partnerName,
                "DEL-{$trip->id}",
                $officer->name,
                $vehicleName,
                $trip->delivery->partner->address
            );

            $stop = [
                'id' => $trip->id,
                'task_type' => 'delivery',
                'stop_order' => $trip->stop_order,
                'status' => $trip->status,
                'scheduled_for' => $trip->scheduled_for?->toISOString(),
                'name' => $partnerName,
                'phone' => $phone,
                'address' => $trip->delivery->partner->address,
                'latitude' => (float) $trip->delivery->partner->latitude,
                'longitude' => (float) $trip->delivery->partner->longitude,
                'planned_kg' => (float) $trip->planned_kg,
                'vehicle' => $trip->vehicle ? ['id' => $trip->vehicle->id, 'name' => $trip->vehicle->name] : null,
                'wa_enroute_url' => \App\Services\WhatsAppNotificationService::generateUrl($phone, $waMsg),
                'complete_route' => route('officer.deliveries.complete', $trip->id),
            ];
        }

        return Inertia::render('officer/stop-detail', [
            'stop' => $stop,
            'depot' => $depot,
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

        return redirect()->route('officer.dashboard')->with('success', 'Check-in pickup berhasil diselesaikan!');
    }

    public function completeDelivery(Request $request, DeliveryTrip $trip, DeliveryCompletionService $service): RedirectResponse
    {
        $data = $request->validate([
            'photo' => 'required|image|mimes:jpeg,jpg,png|max:5120',
            'received_by' => 'required|string|max:255',
        ]);
        $service->complete($trip, $data);

        return redirect()->route('officer.dashboard')->with('success', 'Serah-terima delivery berhasil dicatat.');
    }
}
