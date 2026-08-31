<?php

namespace App\Http\Controllers;

use App\Models\{DeliveryTrip, Pickup, PickupTask};
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
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
            ->map(fn (Pickup $p) => ['id'=>$p->id, 'task_type'=>'pickup', 'stop_order'=>$p->stop_order, 'status'=>$p->status, 'scheduled_for'=>$p->scheduled_for?->toISOString(), 'service_date'=>$p->scheduled_for?->toDateString(), 'latitude'=>$p->supplierReport->latitude !== null ? (float)$p->supplierReport->latitude : null, 'longitude'=>$p->supplierReport->longitude !== null ? (float)$p->supplierReport->longitude : null, 'supplier'=>['id'=>$p->supplierReport->id,'name'=>$p->supplierReport->contact_name,'phone'=>$p->supplierReport->phone,'address'=>$p->supplierReport->manual_address], 'destination'=>null, 'planned_kg'=>(float)$p->estimated_kg, 'vehicle'=>$p->vehicle ? ['id'=>$p->vehicle->id,'name'=>$p->vehicle->name] : null]);

        $deliveries = DeliveryTrip::query()->with(['delivery.partner:id,name,address,latitude,longitude', 'vehicle:id,name'])
            ->where('officer_id', $officer->id)
            ->whereHas('delivery', fn ($q) => $q->whereIn('status', ['planned', 'assigned', 'in_transit']))
            ->orderBy('stop_order')->get()
            ->map(fn (DeliveryTrip $t) => ['id'=>$t->id, 'task_type'=>'delivery', 'stop_order'=>$t->stop_order, 'status'=>$t->status, 'scheduled_for'=>$t->scheduled_for?->toISOString(), 'service_date'=>$t->delivery->service_date?->toDateString(), 'latitude'=>(float)$t->delivery->partner->latitude, 'longitude'=>(float)$t->delivery->partner->longitude, 'supplier'=>null, 'destination'=>['id'=>$t->delivery->partner->id,'name'=>$t->delivery->partner->name,'address'=>$t->delivery->partner->address], 'planned_kg'=>(float)$t->planned_kg, 'vehicle'=>$t->vehicle ? ['id'=>$t->vehicle->id,'name'=>$t->vehicle->name] : null]);

        $tasks = $pickups->concat($deliveries)->sortBy('stop_order')->values();
        return Inertia::render('officer/dashboard', [
            'tasks' => $tasks,
            'pickups' => $pickups,
            'deliveries' => $deliveries,
        ]);
    }

    public function checkin(Request $request, PickupTask $task): RedirectResponse
    {
        $officer = auth()->user();

        if ($task->officer_id !== $officer->id) {
            return back()->withErrors(['task' => 'Tugas ini bukan milik Anda.']);
        }

        if (!in_array($task->status, ['assigned', 'in_progress'])) {
            return back()->withErrors(['task' => 'Tugas sudah selesai atau tidak valid.']);
        }

        $validated = $request->validate([
            'actual_kg' => 'required|numeric|min:0.01|max:9999999',
            'grade' => ['required', Rule::in(['layak', 'kurang_layak', 'tidak_layak'])],
            'photo' => 'required|image|mimes:jpeg,jpg,png|max:5120', // 5MB
            'checkin_lat' => 'required|numeric|between:-90,90',
            'checkin_lng' => 'required|numeric|between:-180,180',
        ]);

        // GPS validation: max 100m from sale coordinates
        $sale = $task->sale;
        $distance = $this->haversineDistance(
            $sale->latitude,
            $sale->longitude,
            $validated['checkin_lat'],
            $validated['checkin_lng']
        );

        if ($distance > 100) {
            return back()->withErrors(['checkin_lat' => 'Lokasi Anda terlalu jauh dari titik pickup (max 100m).']);
        }

        // Upload photo to S3
        $photo = $request->file('photo');
        $path = $photo->storeAs(
            'pickup-photos',
            "{$task->id}_" . now()->format('YmdHis') . '.jpg',
            's3-private'
        );

        // Update task
        $task->update([
            'actual_kg' => $validated['actual_kg'],
            'grade' => $validated['grade'],
            'photo_path' => $path,
            'checkin_lat' => $validated['checkin_lat'],
            'checkin_lng' => $validated['checkin_lng'],
            'checked_in_at' => now(),
            'status' => 'done',
        ]);

        // Update sale status to weighed & classified
        $task->sale->update(['status' => 'weighed']);

        // If this was the first check-in for this officer today, mark vehicle route as in_progress
        if ($task->status === 'assigned') {
            PickupTask::query()
                ->where('officer_id', $officer->id)
                ->where('status', 'assigned')
                ->update(['status' => 'in_progress']);
        }

        return redirect()->route('officer.dashboard')->with('success', 'Check-in berhasil.');
    }

    public function checkinPickup(Request $request, Pickup $pickup, \App\Services\PickupCheckinService $service): RedirectResponse
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

    private function haversineDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000; // meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLng / 2) * sin($dLng / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
