<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\DeliveryTrip;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Warehouse;
use App\Services\DeliveryRouteOptimizationService;
use App\Services\DeliverySchedulingService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DeliveryRouteController extends Controller
{
    private const COLORS = ['#2f6848', '#315c72', '#6b4f2e', '#4a7c59', '#8a5a44', '#6d5843'];

    private DeliveryRouteOptimizationService $optimizer;
    private DeliverySchedulingService $scheduler;

    public function __construct(?DeliveryRouteOptimizationService $optimizer = null, ?DeliverySchedulingService $scheduler = null)
    {
        $this->optimizer = $optimizer ?? app(DeliveryRouteOptimizationService::class);
        $this->scheduler = $scheduler ?? app(DeliverySchedulingService::class);
    }

    public function index(Request $request): Response
    {
        $date = $this->date($request);
        $this->scheduler->schedule($date);
        $data = $this->data($date);
        $depot = $this->depot();

        $vehicles = Vehicle::query()->where('is_active', true)->orderBy('name')->get();
        $officers = User::query()->where('role', 'officer')->orderBy('name')->get(['id', 'name']);

        $horizonStart = Carbon::now()->startOfWeek();
        $scheduleHorizon = collect(range(0, 6))->map(function ($dayOffset) use ($horizonStart) {
            $d = $horizonStart->copy()->addDays($dayOffset);
            $dStr = $d->toDateString();
            $count = Delivery::whereDate('service_date', $dStr)->count();

            return [
                'date' => $dStr,
                'day_name' => $d->locale('id')->isoFormat('dddd'),
                'day_short' => $d->locale('id')->isoFormat('D MMM'),
                'is_today' => $d->isToday(),
                'delivery_count' => $count,
            ];
        })->values();

        return Inertia::render('delivery-routes/index', [
            'selectedDate' => $date->toDateString(),
            'scheduleHorizon' => $scheduleHorizon,
            'deliveryRoutes' => $data['routes'],
            'unassignedDeliveries' => $data['unassigned'],
            'depot' => $depot,
            'officers' => $officers,
            'allVehicles' => $vehicles->map(fn (Vehicle $v) => [
                'id' => $v->id,
                'name' => $v->name,
                'capacity_kg' => (float) $v->capacity_kg,
                'is_active' => (bool) $v->is_active,
            ]),
        ]);
    }

    public function optimize(Request $request): RedirectResponse
    {
        $date = $this->date($request);
        $this->scheduler->schedule($date);
        $res = $this->optimizer->optimize($date);

        $msg = $res['assigned_deliveries'] === 0
            ? 'Tidak ada pengiriman baru untuk dioptimasi pada tanggal ini.'
            : sprintf('%d pengiriman terbagi ke %d kendaraan.', $res['assigned_deliveries'], $res['vehicles']);

        if ($res['unassigned_deliveries'] > 0) {
            $msg .= sprintf(' %d pengiriman (%.1f kg) melebihi kapasitas kendaraan.', $res['unassigned_deliveries'], $res['unassigned_kg']);
        }

        return back()->with('success', $msg);
    }

    public function assign(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $data = $request->validate([
            'officer_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', 'officer')],
            'service_date' => ['nullable', 'date'],
        ]);

        $date = $this->date($request);
        $deliveryIds = Delivery::whereDate('service_date', $date)->pluck('id');

        $count = DeliveryTrip::query()
            ->whereIn('delivery_id', $deliveryIds)
            ->where('vehicle_id', $vehicle->id)
            ->whereIn('status', ['planned', 'assigned'])
            ->update(['officer_id' => $data['officer_id'], 'status' => 'assigned']);

        if ($count === 0) {
            return back()->withErrors(['officer_id' => 'Tidak ada rute pengiriman pending untuk kendaraan ini.']);
        }

        $officer = User::find($data['officer_id']);

        return back()->with('success', "Rute pengiriman {$vehicle->name} berhasil ditugaskan ke {$officer->name} ({$count} titik).");
    }

    public function show(Request $request, Vehicle $vehicle): Response
    {
        $date = $this->date($request);
        $route = collect($this->data($date)['routes'])->firstWhere('vehicle_id', $vehicle->id);

        return Inertia::render('delivery-routes/show', [
            'selectedDate' => $date->toDateString(),
            'depot' => $this->depot(),
            'vehicle' => ['id' => $vehicle->id, 'name' => $vehicle->name, 'capacity_kg' => (float) $vehicle->capacity_kg],
            'deliveryRoute' => $route ?: ['vehicle_id' => $vehicle->id, 'vehicle_name' => $vehicle->name, 'capacity_kg' => (float) $vehicle->capacity_kg, 'trips' => []],
            'officers' => User::query()->where('role', 'officer')->orderBy('name')->get(['id', 'name']),
        ]);
    }

    private function depot(): array
    {
        $warehouse = Warehouse::getDefault();
        if ($warehouse) {
            return [
                'id' => $warehouse->id,
                'name' => $warehouse->name,
                'address' => $warehouse->address,
                'lat' => (float) $warehouse->latitude,
                'lng' => (float) $warehouse->longitude,
            ];
        }

        return [
            'name' => 'Depot Utama Saycle Sleman',
            'address' => 'Jl. Kaliurang Km 9.3, Sleman, Yogyakarta',
            'lat' => (float) config('saycle.depot.lat', -7.7123),
            'lng' => (float) config('saycle.depot.lng', 110.3621),
        ];
    }

    private function date(Request $request): Carbon
    {
        $value = $request->validate(['service_date' => ['nullable', 'date']])['service_date'] ?? now()->toDateString();
        return Carbon::parse($value)->startOfDay();
    }

    private function data(Carbon $date): array
    {
        $deliveries = Delivery::with(['partner', 'lines', 'contracts:id,status', 'trips.vehicle', 'trips.officer'])
            ->whereDate('service_date', $date)->get();
        $trips = $deliveries->flatMap->trips->where('status', '!=', 'cancelled');

        $routes = $trips->filter(fn ($trip) => $trip->vehicle !== null)->groupBy('vehicle_id')->values()->map(function ($vehicleTrips, int $i) {
            $vehicle = $vehicleTrips->first()->vehicle;
            $officer = $vehicleTrips->first(fn ($t) => $t->officer_id)?->officer;
            $distanceM = (float) $vehicleTrips->sum('distance_m');
            $durationS = (int) $vehicleTrips->sum('duration_s');

            return [
                'vehicle_id' => $vehicle->id,
                'vehicle_name' => $vehicle->name,
                'capacity_kg' => (float) $vehicle->capacity_kg,
                'color' => self::COLORS[$i % count(self::COLORS)],
                'load_kg' => round((float) $vehicleTrips->sum('planned_kg'), 2),
                'distance_km' => round($distanceM / 1000, 2),
                'duration_min' => (int) ceil($durationS / 60),
                'all_assigned' => $vehicleTrips->isNotEmpty() && $vehicleTrips->every(fn ($t) => $t->status === 'assigned'),
                'officer_id' => $officer?->id,
                'officer_name' => $officer?->name,
                'trips' => $vehicleTrips->sortBy('stop_order')->values()->map(fn (DeliveryTrip $trip) => [
                    'id' => $trip->id,
                    'delivery_id' => $trip->delivery_id,
                    'stop_order' => $trip->stop_order,
                    'stop' => $trip->stop_order,
                    'load_kg' => (float) $trip->planned_kg,
                    'capacity_kg' => (float) $vehicle->capacity_kg,
                    'officer' => $trip->officer ? ['id' => $trip->officer->id, 'name' => $trip->officer->name] : null,
                    'status' => $trip->status,
                    'distance_m' => (float) ($trip->distance_m ?? 0),
                    'duration_s' => (int) ($trip->duration_s ?? 0),
                    'estimation_source' => $trip->estimation_source,
                    'partner' => [
                        'id' => $trip->delivery->partner?->id,
                        'name' => $trip->delivery->partner?->name,
                        'address' => $trip->delivery->partner?->address,
                        'lat' => (float) ($trip->delivery->partner?->latitude ?? 0),
                        'lng' => (float) ($trip->delivery->partner?->longitude ?? 0),
                    ],
                    'destination' => [
                        'id' => $trip->delivery->partner?->id,
                        'name' => $trip->delivery->partner?->name,
                        'address' => $trip->delivery->partner?->address,
                        'lat' => (float) ($trip->delivery->partner?->latitude ?? 0),
                        'lng' => (float) ($trip->delivery->partner?->longitude ?? 0),
                    ],
                    'metrics' => [
                        'distance_m' => (float) ($trip->distance_m ?? 0),
                        'duration_s' => (int) ($trip->duration_s ?? 0),
                        'estimation_source' => $trip->estimation_source,
                    ],
                    'contracts' => $trip->delivery->contracts->map(fn ($contract) => [
                        'id' => $contract->id,
                        'status' => $contract->status,
                        'service_date' => optional($contract->service_date)->toDateString(),
                    ])->values(),
                ])->all(),
            ];
        })->values();

        $assigned = $trips->filter(fn ($trip) => $trip->vehicle !== null)->groupBy('delivery_id')->map(fn ($items) => (float) $items->sum('planned_kg'));
        $unassigned = $deliveries->filter(fn ($delivery) => !$assigned->has($delivery->id) || $assigned[$delivery->id] <= 0)
            ->map(fn ($delivery) => [
                'delivery_id' => $delivery->id,
                'partner' => $delivery->partner?->name,
                'kg' => (float) $delivery->lines->sum('kg'),
                'reason' => $delivery->partner?->latitude === null || $delivery->partner?->longitude === null ? 'no coordinates' : 'no vehicle capacity',
            ])->values();

        return ['routes' => $routes, 'unassigned' => $unassigned];
    }
}
