<?php

namespace App\Http\Controllers;

use App\Models\PickupTask;
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

        $tasks = PickupTask::query()
            ->with(['sale:id,contact_name,phone,address,latitude,longitude', 'vehicle:id,name'])
            ->where('officer_id', $officer->id)
            ->whereIn('status', ['assigned', 'in_progress'])
            ->orderBy('stop_order')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'stop_order' => $t->stop_order,
                'status' => $t->status,
                'contact_name' => $t->sale->contact_name,
                'phone' => $t->sale->phone,
                'address' => $t->sale->address,
                'latitude' => $t->sale->latitude,
                'longitude' => $t->sale->longitude,
                'estimated_kg' => $t->estimated_kg,
                'actual_kg' => $t->actual_kg,
                'grade' => $t->grade,
                'vehicle_name' => $t->vehicle?->name,
                'checked_in_at' => $t->checked_in_at,
            ]);

        return Inertia::render('officer/dashboard', [
            'tasks' => $tasks,
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
