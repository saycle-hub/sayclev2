<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\DeliveryTrip;
use App\Models\Vehicle;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeliveryRouteController extends Controller
{
    public function index(Request $request): Response
    {
        $date = $this->date($request);
        $data = $this->data($date);

        return Inertia::render('delivery-routes/index', [
            'selectedDate' => $date->toDateString(),
            'deliveryRoutes' => $data['routes'],
            'unassignedDeliveries' => $data['unassigned'],
        ]);
    }

    public function show(Request $request, Vehicle $vehicle): Response
    {
        $date = $this->date($request);
        $route = collect($this->data($date)['routes'])->firstWhere('vehicle_id', $vehicle->id);

        return Inertia::render('delivery-routes/show', [
            'selectedDate' => $date->toDateString(),
            'vehicle' => ['id' => $vehicle->id, 'name' => $vehicle->name, 'capacity_kg' => (float) $vehicle->capacity_kg],
            'deliveryRoute' => $route ?: ['vehicle_id' => $vehicle->id, 'vehicle_name' => $vehicle->name, 'capacity_kg' => (float) $vehicle->capacity_kg, 'trips' => []],
        ]);
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

        $routes = $trips->filter(fn ($trip) => $trip->vehicle !== null)->groupBy('vehicle_id')->map(function ($vehicleTrips) {
            $vehicle = $vehicleTrips->first()->vehicle;
            return ['vehicle_id' => $vehicle->id, 'vehicle_name' => $vehicle->name, 'capacity_kg' => (float) $vehicle->capacity_kg,
                'load_kg' => round((float) $vehicleTrips->sum('planned_kg'), 2),
                'trips' => $vehicleTrips->sortBy('stop_order')->values()->map(fn (DeliveryTrip $trip) => [
                    'id' => $trip->id, 'delivery_id' => $trip->delivery_id, 'stop_order' => $trip->stop_order, 'stop' => $trip->stop_order,
                    'load_kg' => (float) $trip->planned_kg, 'capacity_kg' => (float) $vehicle->capacity_kg,
                    'officer' => $trip->officer ? ['id' => $trip->officer->id, 'name' => $trip->officer->name] : null,
                    'status' => $trip->status, 'distance_m' => (float) ($trip->distance_m ?? 0), 'duration_s' => (int) ($trip->duration_s ?? 0),
                    'estimation_source' => $trip->estimation_source, 'partner' => ['id' => $trip->delivery->partner?->id, 'name' => $trip->delivery->partner?->name,
                        'address' => $trip->delivery->partner?->address, 'lat' => $trip->delivery->partner?->latitude, 'lng' => $trip->delivery->partner?->longitude],
                    'destination' => ['id' => $trip->delivery->partner?->id, 'name' => $trip->delivery->partner?->name,
                        'address' => $trip->delivery->partner?->address, 'lat' => $trip->delivery->partner?->latitude, 'lng' => $trip->delivery->partner?->longitude],
                    'metrics' => ['distance_m' => (float) ($trip->distance_m ?? 0), 'duration_s' => (int) ($trip->duration_s ?? 0), 'estimation_source' => $trip->estimation_source],
                    'contracts' => $trip->delivery->contracts->map(fn ($contract) => ['id' => $contract->id, 'status' => $contract->status, 'service_date' => optional($contract->service_date)->toDateString()])->values(),
                ])->all()];
        })->values();

        $assigned = $trips->filter(fn ($trip) => $trip->vehicle !== null)->groupBy('delivery_id')->map(fn ($items) => (float) $items->sum('planned_kg'));
        $unassigned = $deliveries->filter(fn ($delivery) => !$assigned->has($delivery->id) || $assigned[$delivery->id] <= 0)
            ->map(fn ($delivery) => ['delivery_id' => $delivery->id, 'partner' => $delivery->partner?->name, 'kg' => (float) $delivery->lines->sum('kg'),
                'reason' => $delivery->partner?->latitude === null || $delivery->partner?->longitude === null ? 'no coordinates' : 'no vehicle capacity'])->values();

        return ['routes' => $routes, 'unassigned' => $unassigned];
    }
}
