<?php
namespace App\Services;
use App\Models\Contract;
use App\Models\Delivery;
use App\Models\DeliveryTrip;
use App\Models\DeliveryTripLine;
use App\Models\Vehicle;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class DeliverySchedulingService {
    public function schedule(CarbonInterface $date): int {
        $contracts = Contract::query()->where('status','active')->whereDate('start_date','<=',$date)
            ->where(fn($q) => $q->whereNull('end_date')->orWhereDate('end_date','>=',$date))->get()
            ->filter(fn(Contract $c) => $this->recurs($c, $date));
        $count = 0;
        foreach ($contracts->groupBy('partner_id') as $partnerId => $group) {
            $delivery = DB::transaction(function() use($partnerId,$group,$date){ $d=Delivery::where(['partner_id'=>$partnerId,'service_date'=>$date->toDateString()])->lockForUpdate()->first(); if(!$d) $d=Delivery::create(['partner_id'=>$partnerId,'contract_id'=>$group->sortBy('id')->first()->id,'service_date'=>$date,'status'=>'planned','scheduled_for'=>$date]); if(!in_array($d->status,['assigned','in_transit','delivered','failed','cancelled'],true)) $d->contracts()->syncWithoutDetaching($group->pluck('id')); return $d; });
            // Fase 6: turn reserved allocations into concrete delivery lines.
            $this->buildCandidateLines($delivery);
            $count++;
        }
        return $count;
    }

    /**
     * Build delivery candidate lines from active reservations for a planned
     * delivery (Fase 6: allocation → delivery candidate). Idempotent: lines
     * already created for a reservation are not duplicated, and reservation
     * kg already consumed by active trips is never re-candidated.
     */
    public function buildCandidateLines(Delivery $delivery): int {
        if (!in_array($delivery->status, ['planned'], true)) return 0;
        return DB::transaction(function () use ($delivery) {
            $delivery = Delivery::whereKey($delivery->id)->lockForUpdate()->firstOrFail();
            if ($delivery->status !== 'planned') return 0;
            $existingReservationIds = $delivery->lines()->pluck('reservation_id')->all();
            $serviceDate = $delivery->service_date;
            $contractIds = $delivery->contracts()->pluck('contracts.id')->all();

            $reservations = \App\Models\Reservation::query()
                ->where('status', 'reserved')
                ->whereHas('allocation', function ($q) use ($delivery, $contractIds) {
                    $q->where('partner_id', $delivery->partner_id)
                        ->where('status', 'approved')
                        ->whereIn('contract_id', $contractIds);
                })
                ->with('allocation')
                ->lockForUpdate()
                ->get()
                ->filter(function (\App\Models\Reservation $r) use ($delivery, $serviceDate, $contractIds, $existingReservationIds) {
                    if (in_array($r->id, $existingReservationIds, true)) return false;
                    $a = $r->allocation;
                    if (!$a) return false;
                    if ($a->period_start && $serviceDate->lt($a->period_start)) return false;
                    if ($a->period_end && $serviceDate->gt($a->period_end)) return false;
                    return true;
                });

            $created = 0;
            foreach ($reservations as $r) {
                $consumed = (float) \App\Models\DeliveryTripLine::query()
                    ->whereHas('trip', fn ($q) => $q->whereNotIn('status', ['cancelled']))
                    ->whereHas('deliveryLine', fn ($q) => $q->where('reservation_id', $r->id))
                    ->sum('planned_kg');
                $free = round((float) $r->reserved_kg - $consumed, 2);
                if ($free <= 0.00001) continue;
                $delivery->lines()->create([
                    'reservation_id' => $r->id,
                    'grade' => $r->grade,
                    'intended_use' => $r->intended_use,
                    'kg' => $free,
                ]);
                $created++;
            }
            return $created;
        });
    }
    private function recurs(Contract $c, CarbonInterface $date): bool {
        return match ($c->frequency) {
            'harian' => true,
            'mingguan' => in_array(strtolower($date->englishDayOfWeek), array_map('strtolower', is_array($c->receiving_days)?$c->receiving_days:[]), true),
            'bulanan' => $date->day === (int) $c->monthly_day && $c->monthly_day >= 1 && $c->monthly_day <= 28,
            default => false,
        };
    }
    public function assign(Delivery $delivery, ?int $vehicleId, ?int $officerId, array $lines): DeliveryTrip {
        return DB::transaction(function () use ($delivery,$vehicleId,$officerId,$lines) {
            $delivery=Delivery::whereKey($delivery->id)->lockForUpdate()->firstOrFail();
            ksort($lines); $existing=$delivery->trips()->whereNotIn('status',['cancelled'])->with('lines')->get();
            $match=$existing->first(fn($t)=>$t->vehicle_id===$vehicleId&&$t->officer_id===$officerId&&$t->lines->pluck('planned_kg','delivery_line_id')->map(fn($v)=>(float)$v)->toArray()==array_map('floatval',$lines)); if($match)return $match;
            if(in_array($delivery->status,['assigned','in_transit','delivered','failed','cancelled'],true)) abort(422,'Delivery lifecycle forbids new trip.');
            if(!$vehicleId||!$officerId) abort(422,'Vehicle and officer required.');
            $vehicle=Vehicle::whereKey($vehicleId)->where('is_active',true)->lockForUpdate()->firstOrFail(); $officer=\App\Models\User::whereKey($officerId)->where('role','officer')->firstOrFail();
            $remaining=[]; $pendingByReservation=[]; $kg=0;
            foreach($lines as $id=>$requested){$line=$delivery->lines()->whereKey($id)->lockForUpdate()->whereHas('reservation',fn($q)=>$q->where('status','reserved'))->firstOrFail();$reservation=$line->reservation()->lockForUpdate()->firstOrFail();$allocation=$reservation->allocation()->lockForUpdate()->firstOrFail();if((int)$allocation->partner_id !== (int)$delivery->partner_id || !$delivery->contracts()->whereKey($allocation->contract_id)->exists()) abort(422,'Delivery lineage mismatch.'); if($allocation->period_start && $delivery->service_date < $allocation->period_start || $allocation->period_end && $delivery->service_date > $allocation->period_end) abort(422,'Allocation period excludes service date.'); if($line->grade!==$reservation->grade || $line->intended_use!==$reservation->intended_use) abort(422,'Delivery line semantics mismatch.');$used=(float)$existing->flatMap->lines->where('delivery_line_id',(int)$id)->sum('planned_kg');$reservationUsed=(float)DeliveryTripLine::whereHas('trip',fn($q)=>$q->whereNotIn('status',['cancelled']))->whereHas('deliveryLine',fn($q)=>$q->where('reservation_id',$reservation->id))->sum('planned_kg');$qty=(float)$requested;$pending=(float)($pendingByReservation[$reservation->id]??0);$available=min((float)$line->kg-$used,(float)$reservation->reserved_kg-$reservationUsed-$pending);if($qty<=0||$qty>$available+0.00001) abort(422,'Requested quantity exceeds remaining reserved quantity.'); $pendingByReservation[$reservation->id]=$pending+$qty;$remaining[$id]=$qty;$kg+=$qty;}
            if(!$kg) abort(422,'Dispatchable load required.');
            $work=(float)DeliveryTripLine::whereHas('trip',fn($q)=>$q->where('vehicle_id',$vehicle->id)->whereDate('scheduled_for',$delivery->service_date)->whereNotIn('status',['cancelled']))->sum('planned_kg');
            if($work+$kg>(float)$vehicle->capacity_kg) abort(422,'Vehicle date capacity exceeded.');
            $match=$existing->first(fn($t)=>$t->vehicle_id===$vehicle->id&&$t->officer_id===$officer->id&&$t->lines->pluck('planned_kg','delivery_line_id')->map(fn($v)=>(float)$v)->toArray()==$remaining); if($match)return $match;
            $trip=$delivery->trips()->create(['vehicle_id'=>$vehicle->id,'officer_id'=>$officer->id,'scheduled_for'=>$delivery->scheduled_for,'planned_kg'=>$kg,'status'=>'planned','estimation_source'=>'manual']); foreach($remaining as $id=>$qty)$trip->lines()->create(['delivery_line_id'=>$id,'planned_kg'=>$qty]);
            $total=(float)$delivery->lines()->whereHas('reservation',fn($q)=>$q->where('status','reserved'))->sum('kg'); $covered=(float)$delivery->trips()->whereNotIn('status',['cancelled'])->with('lines')->get()->flatMap->lines->sum('planned_kg'); if($covered+0.00001 >= $total) $delivery->update(['status'=>'assigned']); return $trip;
        });
    }
}
