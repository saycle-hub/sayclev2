<?php

namespace App\Http\Controllers;

use App\Models\PickupTask;
use App\Models\Sale;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\RouteOptimizationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RouteController extends Controller
{
    private const COLORS = ['#2f6848', '#315c72', '#6b4f2e', '#4a7c59', '#8a5a44', '#6d5843'];

    public function __construct(private RouteOptimizationService $optimizer) {}

    public function index(): Response
    {
        $depot = [
            'lat' => (float) config('saycle.depot.lat'),
            'lng' => (float) config('saycle.depot.lng'),
        ];

        $vehicles = Vehicle::query()->where('is_active', true)->orderBy('name')->get();

        $routes = $vehicles->values()->map(function (Vehicle $v, int $i) {
            $tasks = PickupTask::query()
                ->where('vehicle_id', $v->id)
                ->whereIn('status', ['pending', 'assigned'])
                ->orderBy('stop_order')
                ->with('sale:id,contact,latitude,longitude,manual_address')
                ->get();

            $officer = $tasks->first(fn ($t) => $t->officer_id)?->officer;

            return [
                'vehicle_id' => $v->id,
                'vehicle_name' => $v->name,
                'capacity_kg' => (float) $v->capacity_kg,
                'color' => self::COLORS[$i % count(self::COLORS)],
                'load_kg' => round((float) $tasks->sum('estimated_kg'), 2),
                'distance_km' => round((float) $tasks->sum('distance_m') / 1000, 2),
                'duration_min' => (int) ceil((float) $tasks->sum('duration_s') / 60),
                'all_assigned' => $tasks->isNotEmpty() && $tasks->every(fn ($t) => $t->status === 'assigned'),
                'officer_name' => $officer?->name,
                'stops' => $tasks->map(fn (PickupTask $t) => [
                    'id' => $t->id,
                    'order' => $t->stop_order,
                    'contact' => $t->sale?->contact ?? '—',
                    'address' => $t->sale?->manual_address ?? '',
                    'lat' => (float) ($t->sale?->latitude ?? 0),
                    'lng' => (float) ($t->sale?->longitude ?? 0),
                    'kg' => (float) $t->estimated_kg,
                    'distance_m' => (float) ($t->distance_m ?? 0),
                    'duration_s' => (int) ($t->duration_s ?? 0),
                    'status' => $t->status,
                ])->values(),
            ];
        });

        // Sales eligible but not yet on any route
        $routedSaleIds = PickupTask::query()
            ->whereIn('status', ['pending', 'assigned', 'in_progress'])
            ->pluck('sale_id');

        $unassigned = Sale::query()
            ->whereIn('status', ['Pending review', 'Accepted'])
            ->whereNotNull('latitude')->whereNotNull('longitude')
            ->whereNotIn('id', $routedSaleIds)
            ->get(['id', 'contact', 'estimate_kg', 'latitude', 'longitude'])
            ->map(fn (Sale $s) => [
                'id' => $s->id,
                'contact' => $s->contact,
                'kg' => (float) $s->estimate_kg,
                'lat' => (float) $s->latitude,
                'lng' => (float) $s->longitude,
            ]);

        $noCoordsCount = Sale::query()
            ->whereIn('status', ['Pending review', 'Accepted'])
            ->where(fn ($q) => $q->whereNull('latitude')->orWhereNull('longitude'))
            ->count();

        return Inertia::render('routes/index', [
            'depot' => $depot,
            'routes' => $routes,
            'unassigned' => $unassigned,
            'noCoordsCount' => $noCoordsCount,
            'officers' => User::query()->where('role', 'officer')->orderBy('name')->get(['id', 'name']),
            'allVehicles' => Vehicle::query()->orderBy('name')->get(['id', 'name', 'capacity_kg', 'is_active']),
        ]);
    }

    public function optimize(): RedirectResponse
    {
        $r = $this->optimizer->optimize();

        $msg = $r['assigned_sales'] === 0
            ? 'Tidak ada titik pickup baru untuk dioptimasi.'
            : sprintf('%d titik terbagi ke %d kendaraan.', $r['assigned_sales'], $r['vehicles']);

        if ($r['unassigned_sales'] > 0) {
            $msg .= sprintf(' %d titik (%.1f kg) melebihi kapasitas.', $r['unassigned_sales'], $r['unassigned_kg']);
        }

        return back()->with('success', $msg);
    }

    public function show(Vehicle $vehicle): Response
    {
        $tasks = PickupTask::query()
            ->where('vehicle_id', $vehicle->id)
            ->whereIn('status', ['pending', 'assigned', 'in_progress'])
            ->orderBy('stop_order')
            ->with('sale:id,contact,latitude,longitude,manual_address,estimate_kg')
            ->get();

        return Inertia::render('routes/show', [
            'vehicle' => [
                'id' => $vehicle->id,
                'name' => $vehicle->name,
                'capacity_kg' => (float) $vehicle->capacity_kg,
            ],
            'depot' => [
                'lat' => (float) config('saycle.depot.lat'),
                'lng' => (float) config('saycle.depot.lng'),
            ],
            'stops' => $tasks->map(fn (PickupTask $t) => [
                'id' => $t->id,
                'order' => $t->stop_order,
                'contact' => $t->sale?->contact ?? '—',
                'address' => $t->sale?->manual_address ?? '',
                'lat' => (float) ($t->sale?->latitude ?? 0),
                'lng' => (float) ($t->sale?->longitude ?? 0),
                'kg' => (float) $t->estimated_kg,
                'distance_m' => (float) ($t->distance_m ?? 0),
                'duration_s' => (int) ($t->duration_s ?? 0),
                'status' => $t->status,
            ])->values(),
            'officers' => User::query()->where('role', 'officer')->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function assign(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $data = $request->validate([
            'officer_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', 'officer')],
        ]);

        $count = PickupTask::query()
            ->where('vehicle_id', $vehicle->id)
            ->where('status', 'pending')
            ->update(['officer_id' => $data['officer_id'], 'status' => 'assigned']);

        if ($count === 0) {
            return back()->withErrors(['officer_id' => 'Tidak ada tugas pending untuk kendaraan ini.']);
        }

        $officer = User::find($data['officer_id']);

        return back()->with('success', "Rute {$vehicle->name} ditugaskan ke {$officer->name} ({$count} titik).");
    }
}
