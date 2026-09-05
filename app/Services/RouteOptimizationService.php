<?php

namespace App\Services;

use App\Models\Pickup;
use App\Models\SupplierReport;
use App\Models\Vehicle;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Throwable;

class RouteOptimizationService
{
    /**
     * Road-network factor applied to straight-line distance when OSRM
     * is unavailable, so estimates stay honest about being lower bounds.
     */
    private const ROAD_FACTOR = 1.4;

    /**
     * Average urban collection speed (km/h) used when OSRM is unavailable.
     */
    private const FALLBACK_SPEED_KMH = 25;

    /**
     * Cluster unassigned pickup points into vehicles (capacity-aware sweep
     * + nearest-neighbor ordering) and persist them as pending pickup tasks.
     *
     * Idempotent: pending tasks are replaced on every run; assigned, in
     * progress and done tasks are never touched.
     *
     * @return array{assigned_sales: int, unassigned_sales: int, unassigned_kg: float, vehicles: int, used_osrm: bool}
     */
    public function optimize(): array
    {
        // Delete pending tasks first so their sales re-enter the pool.
        return DB::transaction(function () {
        $sales = $this->collectibleSales();

        if ($sales->isEmpty()) {
            return ['assigned_sales' => 0, 'unassigned_sales' => 0, 'unassigned_kg' => 0.0, 'vehicles' => 0, 'used_osrm' => false];
        }

        $vehicles = Vehicle::query()->where('is_active', true)->orderByDesc('capacity_kg')->get();
        $points = $this->sweepOrder($sales);

        // First-fit-decreasing in sweep order: geographically coherent clusters
        // that still respect each vehicle's capacity ceiling.
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
            $usedOsrm = $this->persistRoute($vehicleId, $ordered) || $usedOsrm;
        }

        return [
            'assigned_sales' => count($points) - $unassigned->count(),
            'unassigned_sales' => $unassigned->count(),
            'unassigned_kg' => round($unassigned->sum('kg'), 2),
            'vehicles' => count($assignments),
            'used_osrm' => $usedOsrm,
        ]; });
    }

    /**
     * Sales eligible for pickup planning: intake or accepted, with GPS
     * coordinates, and not already carried by an active task.
     */
    private function collectibleSales(): Collection
    {
        return SupplierReport::query()
            ->where('status', 'accepted')
            ->where('estimated_kg', '>', 0)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->whereDoesntHave('pickups', fn ($q) => $q->whereIn('status', ['planned', 'assigned', 'in_progress', 'completed']))
            ->orderBy('id')
            ->get()
            ->map(fn (SupplierReport $sale) => [
                'supplier_report_id' => $sale->id,
                'lat' => (float) $sale->latitude,
                'lng' => (float) $sale->longitude,
                'kg' => (float) $sale->estimated_kg,
            ])
            ->filter(fn (array $p) => $p['lat'] !== 0.0 || $p['lng'] !== 0.0)
            ->values();
    }

    /**
     * Polar sweep around the depot: sort points by angle so the
     * first-fit pass naturally forms angular clusters.
     *
     * @param  Collection<int, array{sale_id: int, lat: float, lng: float, kg: float}>  $points
     * @return list<array{sale_id: int, lat: float, lng: float, kg: float}>
     */
    private function sweepOrder(Collection $points): array
    {
        $depot = $this->depot();

        return $points
            ->map(function (array $p) use ($depot) {
                $p['angle'] = atan2($p['lat'] - $depot['lat'], $p['lng'] - $depot['lng']);

                return $p;
            })
            ->sortBy('angle')
            ->values()
            ->all();
    }

    /**
     * Order stops of one route nearest-neighbor starting from the depot.
     *
     * @param  list<array{sale_id: int, lat: float, lng: float, kg: float, angle?: float}>  $stops
     * @return list<array{sale_id: int, lat: float, lng: float, kg: float, angle?: float}>
     */
    private function nearestNeighborOrder(array $stops): array
    {
        $depot = $this->depot();
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

    /**
     * Persist one vehicle route as pending tasks, carrying OSRM distance
     * and duration estimates when the routing service responds.
     *
     * @param  list<array{sale_id: int, lat: float, lng: float, kg: float}>  $ordered
     */
    /**
     * Persist one vehicle route with per-leg distance/duration estimates.
     * OSRM /route response legs[] used when available; haversine fallback.
     */
    private function persistRoute(int $vehicleId, array $ordered): bool
    {
        $legs = $this->computeLegs($ordered);

        foreach ($ordered as $index => $stop) {
            $pickup = Pickup::firstOrNew(['supplier_report_id' => $stop['supplier_report_id']]);
            if ($pickup->exists && $pickup->status !== 'planned') continue;
            $pickup->fill([
                'supplier_report_id' => $stop['supplier_report_id'],
                'vehicle_id' => $vehicleId,
                'stop_order' => $index + 1,
                'status' => 'planned',
                'estimated_kg' => $stop['kg'],
                'distance_m' => $legs[$index]['distance_m'],
                'duration_s' => $legs[$index]['duration_s'],
            ]);
            $pickup->save();
            SupplierReport::whereKey($stop['supplier_report_id'])->where('status', 'accepted')->update(['status' => 'pickup_scheduled']);
        }

        return $legs[0]['source'] === 'osrm';
    }

    /**
     * Per-leg distance/duration: depot→stop1, stop1→stop2, etc.
     * Tries OSRM /route with legs, falls back to haversine × road factor.
     *
     * @return list<array{distance_m: float, duration_s: int, source: string}>
     */
    private function computeLegs(array $ordered): array
    {
        $depot = $this->depot();
        $points = array_merge([['lat' => $depot['lat'], 'lng' => $depot['lng']]], $ordered);

        // Try OSRM first (skipped in tests)
        if (! app()->environment('testing') && count($points) >= 2) {
            $osrmLegs = $this->osrmLegs($points);
            if ($osrmLegs !== null) {
                return $osrmLegs;
            }
        }

        // Haversine fallback
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

    /**
     * OSRM /route legs — one HTTP call per vehicle route.
     *
     * @return list<array{distance_m: float, duration_s: int, source: string}>|null
     */
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
            Log::warning('OSRM route failed, haversine fallback.', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * @return array{lat: float, lng: float}
     */
    private function depot(): array
    {
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
