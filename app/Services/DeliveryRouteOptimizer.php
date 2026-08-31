<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\DeliveryTrip;
use App\Models\DeliveryTripLine;
use App\Models\Vehicle;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class DeliveryRouteOptimizer
{
    public function optimize(string $date): array
    {
        $day = Carbon::parse($date);
        abort_if($day->isPast() || $day->gt(now()->addDays(90)), 422, 'Service date outside dispatch horizon.');
        $depot = $this->depot();

        return DB::transaction(function () use ($date, $depot) {
            $deliveries = Delivery::with(['partner', 'lines.reservation'])->whereDate('service_date', $date)->where('status', 'planned')->lockForUpdate()->get()
                ->sortBy(fn ($d) => [(float) $d->partner?->latitude, (float) $d->partner?->longitude, $d->id])->values();
            $replaceTrips = DeliveryTrip::where('status', 'planned')->whereDate('scheduled_for', $date)
                ->whereNull('officer_id')
                ->whereIn('delivery_id', $deliveries->filter(fn ($d) => $d->partner && $d->partner->latitude !== null && $d->partner->longitude !== null && $d->lines->contains(fn ($l) => (float) $l->kg > 0 && $l->reservation?->status === 'reserved'))->pluck('id'))
                ->lockForUpdate()->get();
            // Phantom cleanup: planned officer-less trips for today's deliveries that
            // can no longer be dispatched (partner lost coordinates or no reserved
            // load) would linger with stale planned_kg and block vehicle capacity.
            DeliveryTrip::where('status', 'planned')->whereDate('scheduled_for', $date)
                ->whereNull('officer_id')
                ->whereIn('delivery_id', $deliveries->filter(fn ($d) => ! ($d->partner && $d->partner->latitude !== null && $d->partner->longitude !== null && $d->lines->contains(fn ($l) => (float) $l->kg > 0 && $l->reservation?->status === 'reserved')))->pluck('id'))
                ->get()
                ->each(function (DeliveryTrip $trip) {
                    $trip->lines()->delete();
                    $trip->delete();
                });
            $replace = $replaceTrips->pluck('id');
            $replaceByKey = $replaceTrips->keyBy(fn ($trip) => $trip->delivery_id.':'.$trip->vehicle_id);
            $vehicles = Vehicle::where('is_active', true)->orderBy('id')->lockForUpdate()->get()
                ->mapWithKeys(fn ($v) => [$v->id => max(0, (float) $v->capacity_kg - (float) DeliveryTrip::where('vehicle_id', $v->id)->whereDate('scheduled_for', $date)->whereNotIn('status', ['cancelled'])->whereNotIn('id', $replace)->sum('planned_kg'))]);
            DeliveryTripLine::whereIn('trip_id', $replace)->delete();
            $unassigned = [];
            $assigned = 0;
            $usedReservations = DeliveryTripLine::whereNotIn('trip_id', $replace)->whereHas('trip', fn ($q) => $q->whereNotIn('status', ['cancelled']))
                ->with('deliveryLine')->get()->groupBy(fn ($l) => $l->deliveryLine->reservation_id)
                ->map(fn ($lines) => (float) $lines->sum('planned_kg'));
            $orders = [];
            foreach ($deliveries as $delivery) {
                $valid = $delivery->lines->filter(fn ($l) => (float) $l->kg > 0 && $l->reservation?->status === 'reserved')->sortBy('id')->values();
                $loads = [];
                foreach ($valid as $line) {
                    $reservation = $line->reservation;
                    $available = max(0, (float) $reservation->reserved_kg - (float) ($usedReservations[$reservation->id] ?? 0));
                    $loads[$line->id] = min((float) $line->kg, $available);
                    $usedReservations[$reservation->id] = ($usedReservations[$reservation->id] ?? 0) + $loads[$line->id];
                }
                $kg = array_sum($loads);
                if (! $kg) {
                    $unassigned[] = ['delivery_id' => $delivery->id, 'kg' => 0, 'reason' => 'no reserved load'];

                    continue;
                }
                if (! $delivery->partner || $delivery->partner->latitude === null || $delivery->partner->longitude === null) {
                    $unassigned[] = ['delivery_id' => $delivery->id, 'kg' => $kg, 'reason' => 'no coordinates'];

                    continue;
                }
                foreach ($vehicles as $vehicleId => $free) {
                    if ($kg <= .00001 || $free <= .00001) {
                        continue;
                    }
                    $take = min($kg, $free);
                    $key = $delivery->id.':'.$vehicleId;
                    $trip = $replaceByKey->get($key);
                    if ($trip) {
                        $trip->update(['scheduled_for' => $delivery->scheduled_for, 'stop_order' => count($orders[$vehicleId] ?? []) + 1, 'planned_kg' => $take, 'estimation_source' => 'haversine']);
                    } else {
                        $trip = $delivery->trips()->create(['vehicle_id' => $vehicleId, 'scheduled_for' => $delivery->scheduled_for, 'stop_order' => count($orders[$vehicleId] ?? []) + 1, 'planned_kg' => $take, 'status' => 'planned', 'estimation_source' => 'haversine']);
                    }
                    $left = $take;
                    foreach ($loads as $lineId => &$load) {
                        $part = min($left, $load);
                        if ($part > 0) {
                            $trip->lines()->create(['delivery_line_id' => $lineId, 'planned_kg' => $part]);
                            $load -= $part;
                            $left -= $part;
                        }if ($left <= .00001) {
                            break;
                        }
                    }unset($load);
                    $vehicles[$vehicleId] -= $take;
                    $kg -= $take;
                    $assigned += $take;
                    $orders[$vehicleId][] = ['delivery' => $delivery, 'trip' => $trip];
                }
                if ($kg > .00001) {
                    $unassigned[] = ['delivery_id' => $delivery->id, 'kg' => round($kg, 2), 'reason' => 'no vehicle capacity'];
                }
            }
            foreach ($orders as $vehicleId => $stops) {
                $this->metrics($stops, $depot);
            }

            return ['assigned_kg' => round($assigned, 2), 'unassigned_kg' => round(collect($unassigned)->sum('kg'), 2), 'unassigned' => $unassigned, 'planned_trips' => DeliveryTrip::where('status', 'planned')->whereDate('scheduled_for', $date)->count()];
        });
    }

    private function depot(): array
    {
        $lat = config('saycle.depot.lat');
        $lng = config('saycle.depot.lng');
        if ($lat === null || $lng === null || ! is_numeric($lat) || ! is_numeric($lng)) {
            abort(422, 'Delivery optimizer requires SAYCLE_DEPOT_LAT and SAYCLE_DEPOT_LNG.');
        }

        return ['lat' => (float) $lat, 'lng' => (float) $lng];
    }

    private function metrics(array $stops, array $depot): void
    {
        $from = $depot;
        foreach ($stops as $item) {
            $stop = $item['delivery'];
            $to = ['lat' => (float) $stop->partner->latitude, 'lng' => (float) $stop->partner->longitude];
            [$m,$s] = $this->leg($from, $to);
            $item['trip']->update(['distance_m' => $m, 'duration_s' => $s, 'estimation_source' => $this->source]);
            $from = $to;
        }
    }

    private string $source = 'haversine';

    private function leg(array $a, array $b): array
    {
        try {
            $r = Http::timeout((int) config('saycle.osrm.timeout', 4))->get(rtrim(config('saycle.osrm.base_url'), '/')."/route/v1/driving/{$a['lng']},{$a['lat']};{$b['lng']},{$b['lat']}", ['overview' => 'false'])->json();
            if (($r['code'] ?? null) === 'Ok' && isset($r['routes'][0]['distance'],$r['routes'][0]['duration'])) {
                $this->source = 'osrm';

                return [$r['routes'][0]['distance'], (int) round($r['routes'][0]['duration'])];
            }
        } catch (\Throwable $e) {
        }$this->source = 'haversine';
        $d = 6371000 * 2 * asin(sqrt(sin(deg2rad($b['lat'] - $a['lat']) / 2) ** 2 + cos(deg2rad($a['lat'])) * cos(deg2rad($b['lat'])) * sin(deg2rad($b['lng'] - $a['lng']) / 2) ** 2));

        return [$d, (int) round($d / 8.333)];
    }
}
