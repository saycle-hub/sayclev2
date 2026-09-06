<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\DeliveryTrip;
use App\Models\Vehicle;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class DeliveryRouteOptimizationService
{
    private const ROAD_FACTOR = 1.4;
    private const FALLBACK_SPEED_KMH = 25;

    public function optimize(?Carbon $date = null): array
    {
        $date = $date ? $date->copy()->startOfDay() : now()->startOfDay();

        return DB::transaction(function () use ($date) {
            // Delete planned trips for the given service date so unassigned deliveries re-enter optimization pool
            $deliveryIds = Delivery::whereDate('service_date', $date)->pluck('id');
            DeliveryTrip::query()
                ->whereIn('delivery_id', $deliveryIds)
                ->where('status', 'planned')
                ->delete();

            $deliveries = $this->collectibleDeliveries($date);

            if ($deliveries->isEmpty()) {
                return [
                    'assigned_deliveries' => 0,
                    'unassigned_deliveries' => 0,
                    'unassigned_kg' => 0.0,
                    'vehicles' => 0,
                    'used_osrm' => false,
                ];
            }

            $vehicles = Vehicle::query()->where('is_active', true)->orderByDesc('capacity_kg')->get();
            $points = $this->sweepOrder($deliveries);

            $assignments = [];
            $remaining = $vehicles->mapWithKeys(fn (Vehicle $v) => [$v->id => (float) $v->capacity_kg]);
            $unassigned = collect();

            foreach ($points as $point) {
                $vehicleId = $vehicles->first(fn (Vehicle $v) => $remaining[$v->id] >= $point['kg'])?->id;

                if ($vehicleId === null) {
                    $unassigned->push($point);
                    continue;
                }

                $assignments[$vehicleId][] = $point;
                $remaining[$vehicleId] = round($remaining[$vehicleId] - $point['kg'], 2);
            }

            $usedOsrm = false;

            foreach ($assignments as $vehicleId => $stops) {
                $ordered = $this->nearestNeighborOrder($stops);
                $usedOsrm = $this->persistRoute($vehicleId, $ordered, $date) || $usedOsrm;
            }

            return [
                'assigned_deliveries' => count($points) - $unassigned->count(),
                'unassigned_deliveries' => $unassigned->count(),
                'unassigned_kg' => round($unassigned->sum('kg'), 2),
                'vehicles' => count($assignments),
                'used_osrm' => $usedOsrm,
            ];
        });
    }

    private function collectibleDeliveries(Carbon $date): Collection
    {
        $deliveries = Delivery::with(['partner', 'lines'])
            ->whereDate('service_date', $date)
            ->whereDoesntHave('trips', fn ($q) => $q->whereIn('status', ['assigned', 'in_transit', 'delivered', 'completed']))
            ->get();

        return $deliveries->map(function (Delivery $delivery) {
            $partner = $delivery->partner;
            $lat = $partner?->latitude ? (float) $partner->latitude : null;
            $lng = $partner?->longitude ? (float) $partner->longitude : null;

            if (($lat === null || $lng === null) && $partner?->address) {
                $addr = strtolower($partner->address);
                if (str_contains($addr, 'condong') || str_contains($addr, 'ngringin')) {
                    $lat = -7.7554; $lng = 110.3957;
                } elseif (str_contains($addr, 'kranggan') || str_contains($addr, 'poncowinatan')) {
                    $lat = -7.7828; $lng = 110.3671;
                } elseif (str_contains($addr, 'merapi') || str_contains($addr, 'cangkringan') || str_contains($addr, 'pakem')) {
                    $lat = -7.6500; $lng = 110.4500;
                } elseif (str_contains($addr, 'sleman') || str_contains($addr, 'depok') || str_contains($addr, 'yogyakarta') || str_contains($addr, 'jogja')) {
                    $lat = -7.7600; $lng = 110.3700;
                }

                if ($lat !== null && $lng !== null && $partner) {
                    $partner->update(['latitude' => $lat, 'longitude' => $lng]);
                }
            }

            $kg = (float) $delivery->lines->sum('kg');

            return [
                'delivery_id' => $delivery->id,
                'lat' => $lat ?? 0.0,
                'lng' => $lng ?? 0.0,
                'kg' => $kg > 0 ? $kg : 10.0, // Default 10kg if lines empty
            ];
        })
        ->filter(fn (array $p) => $p['lat'] !== 0.0 && $p['lng'] !== 0.0)
        ->values();
    }

    private function nearestWarehouse(array $stops): array
    {
        $warehouses = Warehouse::where('is_active', true)->get();
        if ($warehouses->isEmpty()) {
            return $this->depot();
        }

        if ($stops === []) {
            $w = Warehouse::getDefault() ?? $warehouses->first();
            return ['lat' => (float) $w->latitude, 'lng' => (float) $w->longitude, 'name' => $w->name, 'code' => $w->code];
        }

        $avgLat = array_sum(array_column($stops, 'lat')) / count($stops);
        $avgLng = array_sum(array_column($stops, 'lng')) / count($stops);

        $best = $warehouses->first();
        $bestDist = INF;

        foreach ($warehouses as $w) {
            $dist = $this->haversineKm((float) $w->latitude, (float) $w->longitude, $avgLat, $avgLng);
            if ($dist < $bestDist) {
                $bestDist = $dist;
                $best = $w;
            }
        }

        return [
            'lat' => (float) $best->latitude,
            'lng' => (float) $best->longitude,
            'name' => $best->name,
            'code' => $best->code,
        ];
    }

    private function sweepOrder(Collection $points): array
    {
        $depot = $this->nearestWarehouse($points->toArray());

        return $points
            ->map(function (array $p) use ($depot) {
                $p['angle'] = atan2($p['lat'] - $depot['lat'], $p['lng'] - $depot['lng']);
                return $p;
            })
            ->sortBy('angle')
            ->values()
            ->all();
    }

    private function nearestNeighborOrder(array $stops): array
    {
        $depot = $this->nearestWarehouse($stops);
        $remaining = $stops;
        $ordered = [];
        $current = $depot;

        while ($remaining !== []) {
            $bestIndex = 0;
            $bestDistance = INF;

            foreach ($remaining as $index => $stop) {
                $distance = $this->haversineKm($current['lat'], $current['lng'], $stop['lat'], $stop['lng']);
                if ($distance < $bestDistance) {
                    $bestDistance = $distance;
                    $bestIndex = $index;
                }
            }

            $current = $remaining[$bestIndex];
            $ordered[] = $current;
            unset($remaining[$bestIndex]);
        }

        return $ordered;
    }

    private function persistRoute(int $vehicleId, array $ordered, Carbon $date): bool
    {
        $legs = $this->computeLegs($ordered);

        foreach ($ordered as $index => $stop) {
            $trip = DeliveryTrip::firstOrNew(['delivery_id' => $stop['delivery_id']]);
            if ($trip->exists && $trip->status !== 'planned') continue;

            $trip->fill([
                'delivery_id' => $stop['delivery_id'],
                'vehicle_id' => $vehicleId,
                'scheduled_for' => $date,
                'stop_order' => $index + 1,
                'status' => 'planned',
                'planned_kg' => $stop['kg'],
                'distance_m' => $legs[$index]['distance_m'],
                'duration_s' => $legs[$index]['duration_s'],
                'estimation_source' => $legs[$index]['source'],
            ]);
            $trip->save();
        }

        return isset($legs[0]) && $legs[0]['source'] === 'osrm';
    }

    private function computeLegs(array $ordered): array
    {
        $depot = $this->nearestWarehouse($ordered);
        $points = array_merge([['lat' => $depot['lat'], 'lng' => $depot['lng']]], $ordered);

        if (! app()->environment('testing') && count($points) >= 2) {
            $osrmLegs = $this->osrmLegs($points);
            if ($osrmLegs !== null) {
                return $osrmLegs;
            }
        }

        $legs = [];
        for ($i = 1, $n = count($points); $i < $n; $i++) {
            $km = $this->haversineKm($points[$i - 1]['lat'], $points[$i - 1]['lng'], $points[$i]['lat'], $points[$i]['lng']);
            $roadKm = $km * self::ROAD_FACTOR;
            $legs[] = [
                'distance_m' => round($roadKm * 1000, 2),
                'duration_s' => (int) max(60, round($roadKm / self::FALLBACK_SPEED_KMH * 3600)),
                'source' => 'haversine',
            ];
        }

        return $legs;
    }

    private function osrmLegs(array $points): ?array
    {
        $coords = implode(';', array_map(fn ($p) => "{$p['lng']},{$p['lat']}", $points));
        $url = rtrim((string) config('saycle.osrm.base_url'), '/')."/route/v1/driving/{$coords}?overview=false";

        try {
            $response = Http::timeout((int) config('saycle.osrm.timeout', 4))->get($url);
            $routeLegs = $response->json('routes.0.legs');

            if (! $response->successful() || ! is_array($routeLegs) || count($routeLegs) !== count($points) - 1) {
                return null;
            }

            return array_map(fn ($leg) => [
                'distance_m' => round((float) ($leg['distance'] ?? 0), 2),
                'duration_s' => (int) max(60, round((float) ($leg['duration'] ?? 60))),
                'source' => 'osrm',
            ], $routeLegs);
        } catch (Throwable $e) {
            Log::warning('OSRM delivery route failed, haversine fallback.', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function depot(): array
    {
        $defaultWarehouse = Warehouse::getDefault();
        if ($defaultWarehouse) {
            return [
                'lat' => (float) $defaultWarehouse->latitude,
                'lng' => (float) $defaultWarehouse->longitude,
            ];
        }

        return [
            'lat' => (float) config('saycle.depot.lat'),
            'lng' => (float) config('saycle.depot.lng'),
        ];
    }

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 2 * $earthRadius * asin(min(1.0, sqrt($a)));
    }
}
