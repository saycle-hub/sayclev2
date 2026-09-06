<?php

namespace App\Services;

use App\Domain\Grade;
use App\Models\Allocation;
use App\Models\ClassificationLot;
use App\Models\Contract;
use App\Models\Partner;
use App\Models\Price;
use App\Models\Reservation;
use App\Models\WarehouseMutation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AllocationEngine
{
    private const ACTIVE_RESERVATION_STATUSES = ['reserved', 'partially_delivered'];

    /**
     * Run weekly allocation for every grade and persist results.
     * Idempotent per week_start: rows without active reservations are rebuilt,
     * committed rows (already backed by reservations) are conserved verbatim.
     *
     * @return array{week_start: string, grades: array<string, array{status: string, stock_kg: float, allocated_kg: float, held_kg: float, rows: Collection}>}
     */
    /**
     * Run daily allocation for every grade and persist results.
     * Idempotent per allocation_date: rows without active reservations are rebuilt,
     * committed rows (already backed by reservations) are conserved verbatim.
     *
     * @return array{allocation_date: string, week_start: string, grades: array<string, array{status: string, stock_kg: float, allocated_kg: float, held_kg: float, rows: Collection}>}
     */
    public function run(?string $date = null): array
    {
        $targetDate = $date ? Carbon::parse($date) : Carbon::today();
        $allocationDate = $targetDate->toDateString();
        $weekStart = $targetDate->copy()->startOfWeek()->toDateString();

        return DB::transaction(function () use ($allocationDate, $weekStart, $targetDate) {
            $results = [];
            foreach (Contract::GRADES as $grade) {
                $results[$grade] = $this->runGrade($grade, $weekStart, $allocationDate, $targetDate);
            }

            return [
                'allocation_date' => $allocationDate,
                'week_start' => $weekStart,
                'grades' => $results,
            ];
        });
    }

    /**
     * Total physical stock per grade from the immutable warehouse ledger
     * (receipts − stock-outs + adjustments), regardless of reservations.
     * This is the display/reconciliation number.
     */
    public function totalStock(string $grade): float
    {
        $sum = (float) WarehouseMutation::where('grade', $grade)->get()->sum(fn (WarehouseMutation $m) => $this->signedKg($m));

        return abs($sum) < 0.0001 ? 0.0 : round($sum, 2);
    }

    /**
     * Free (unreserved) stock per grade: total physical minus active
     * reservations. Plan Fase 6: "Hitung available stock per grade dari
     * ledger dan reservation aktif." This is the allocation input.
     */
    public function availableStock(string $grade): float
    {
        $nonLotStock = (float) WarehouseMutation::whereNull('classification_lot_id')->where('grade', $grade)->get()->sum(fn (WarehouseMutation $m) => $this->signedKg($m));
        $nonLotReserved = (float) Reservation::whereNull('classification_lot_id')->whereIn('status', self::ACTIVE_RESERVATION_STATUSES)
            ->where('grade', $grade)->sum('reserved_kg');
        $lotBacked = (float) ClassificationLot::query()
            ->where('grade', $grade)
            ->get()
            ->sum(fn (ClassificationLot $lot) => $this->lotRemaining($lot));

        return round(max(0.0, $lotBacked) + max(0.0, $nonLotStock - $nonLotReserved), 2);
    }

    /**
     * Physical kg still free on a lot: classified kg minus active
     * reservations and outbound stock moves charged to the lot. Clamped at
     * zero: a lot can never back more than its classified kg.
     */
    public function lotRemaining(ClassificationLot $lot): float
    {
        $reserved = (float) Reservation::query()
            ->where('classification_lot_id', $lot->id)
            ->whereIn('status', self::ACTIVE_RESERVATION_STATUSES)
            ->sum('reserved_kg');
        $stockOut = (float) WarehouseMutation::query()
            ->where('type', 'stock_out')
            ->where('classification_lot_id', $lot->id)
            ->sum('kg');

        return max(0.0, round((float) $lot->kg - $reserved - $stockOut, 2));
    }

    /**
     * Daily Allocation rules: minimum → ideal → overcapacity (ideal→max) → held visibly.
     * Evaluates daily quotas for Harian partners and active delivery day quotas for Mingguan partners.
     */
    private function runGrade(string $grade, string $weekStart, string $allocationDate, Carbon $targetDate): array
    {
        $availableBefore = $this->availableStock($grade);

        // Committed allocations (backed by active reservations) survive reruns.
        $committed = Allocation::query()
            ->where(function ($q) use ($allocationDate, $weekStart) {
                $q->whereDate('allocation_date', $allocationDate)
                  ->orWhere(function ($q2) use ($weekStart) {
                      $q2->whereNull('allocation_date')->whereDate('week_start', $weekStart);
                  });
            })
            ->where('grade', $grade)
            ->whereHas('reservations', fn ($q) => $q->whereIn('status', self::ACTIVE_RESERVATION_STATUSES))
            ->with('reservations')
            ->get();

        $committedByContract = $committed
            ->whereNotNull('contract_id')
            ->groupBy('contract_id')
            ->map(fn ($group) => (float) $group->flatMap->reservations
                ->whereIn('status', self::ACTIVE_RESERVATION_STATUSES)
                ->sum('reserved_kg'));

        $committedByPartner = $committed
            ->groupBy('partner_id')
            ->map(fn ($group) => (float) $group->flatMap->reservations
                ->whereIn('status', self::ACTIVE_RESERVATION_STATUSES)
                ->sum('reserved_kg'));

        $committedKg = (float) $committed->flatMap->reservations
            ->whereIn('status', self::ACTIVE_RESERVATION_STATUSES)
            ->sum('reserved_kg');

        // Replaceable rows from earlier reruns for today are removed.
        Allocation::query()
            ->where(function ($q) use ($allocationDate, $weekStart) {
                $q->whereDate('allocation_date', $allocationDate)
                  ->orWhere(function ($q2) use ($weekStart) {
                      $q2->whereNull('allocation_date')->whereDate('week_start', $weekStart);
                  });
            })
            ->where('grade', $grade)
            ->whereDoesntHave('reservations', fn ($q) => $q->whereIn('status', self::ACTIVE_RESERVATION_STATUSES))
            ->delete();

        $available = $availableBefore;
        $periodStart = Carbon::parse($allocationDate);

        $contracts = Contract::query()
            ->where('grade', $grade)
            ->where('status', 'active')
            ->orderBy('id')
            ->get()
            ->filter(fn (Contract $c) => $c->isScheduledForDate($targetDate))
            ->values();

        $nonContractedPartners = Partner::query()
            ->where('grade_preference', $grade)
            ->whereDoesntHave('contracts', fn ($q) => $q->where('grade', $grade))
            ->orderBy('id')
            ->get()
            ->filter(fn (Partner $p) => $p->isScheduledForDate($targetDate))
            ->values();

        $rows = collect();
        $status = 'Tanpa mitra';

        if ($contracts->isNotEmpty() || $nonContractedPartners->isNotEmpty()) {
            // Contracted daily capacities
            $minRem = $contracts->mapWithKeys(fn (Contract $c) => [$c->id => max(0.0, $c->dailyMinKg($targetDate) - ($committedByContract[$c->id] ?? 0))]);
            $idealRem = $contracts->mapWithKeys(fn (Contract $c) => [$c->id => max(0.0, $c->dailyIdealKg($targetDate) - ($committedByContract[$c->id] ?? 0))]);
            $maxRem = $contracts->mapWithKeys(fn (Contract $c) => [$c->id => max(0.0, $c->dailyMaxKg($targetDate) - ($committedByContract[$c->id] ?? 0))]);

            // Non-contracted daily capacities
            $partnerIdealRem = $nonContractedPartners->mapWithKeys(fn (Partner $p) => [$p->id => max(0.0, $p->dailyIdealKg($targetDate) - ($committedByPartner[$p->id] ?? 0))]);

            $totalMinContract = (float) $minRem->sum();
            $totalIdealContract = (float) $idealRem->sum();
            $totalIdealNonContract = (float) $partnerIdealRem->sum();
            $totalIdealAll = $totalIdealContract + $totalIdealNonContract;

            if ($available < $totalMinContract) {
                $status = 'Defisit';
                // Stage 1: Deficit (stock < total minimum contracted demand).
                // Proportional minimum allocation to contracted partners only; non-contracted get 0.
                $rows = $this->allocateProportional($contracts, $available, 'minimum', fn (Contract $c) => $minRem[$c->id]);
            } elseif ($available < $totalIdealAll) {
                // Stage 2: Stock covers contracted minimums, but is less than total ideal for all partners.
                // Step A: Fill contracted minimums
                $minRows = $this->allocateProportional($contracts, $totalMinContract, 'minimum', fn (Contract $c) => $minRem[$c->id]);
                $rows = $rows->merge($minRows);

                $remStock = round($available - $totalMinContract, 2);

                // Step B: Fill gap from contracted minimum to contracted ideal
                $contractIdealGap = $contracts->mapWithKeys(fn (Contract $c) => [$c->id => max(0.0, $idealRem[$c->id] - $minRem[$c->id])]);
                $totalContractIdealGap = (float) $contractIdealGap->sum();

                if ($totalContractIdealGap > 0 && $remStock > 0) {
                    $cIdealPool = min($remStock, $totalContractIdealGap);
                    $cIdealRows = $this->allocateProportional($contracts, $cIdealPool, 'ideal', fn (Contract $c) => $contractIdealGap[$c->id]);
                    $rows = $rows->merge($cIdealRows);
                    $remStock = round($remStock - $cIdealPool, 2);
                }

                // Step C: If contracted partners reached ideal and stock remains, fill non-contracted partners up to their ideal capacity
                if ($remStock > 0 && $totalIdealNonContract > 0) {
                    $nonContractPool = min($remStock, $totalIdealNonContract);
                    $nRows = $this->allocateProportionalPartners($nonContractedPartners, $nonContractPool, 'ideal', $partnerIdealRem);
                    $rows = $rows->merge($nRows);
                }

                $status = ($available < $totalIdealContract) ? 'Defisit' : 'Normal';
            } else {
                // Stage 3: Surplus stock >= total ideal for ALL partners (contracted + non-contracted).
                $status = 'Surplus';

                // Step A: Full ideal allocation to all contracted partners
                if ($totalIdealContract > 0) {
                    $rows = $rows->merge($this->allocateNormal($contracts, $totalIdealContract, $minRem, $idealRem));
                }

                // Step B: Full ideal allocation to all non-contracted partners
                if ($totalIdealNonContract > 0) {
                    $rows = $rows->merge($this->allocateProportionalPartners($nonContractedPartners, $totalIdealNonContract, 'ideal', $partnerIdealRem));
                }

                // Step C: Distribute surplus beyond ideal among contracted partners proportionally to headroom (ideal -> max)
                $surplus = round($available - $totalIdealAll, 2);
                if ($surplus > 0) {
                    $headroom = $contracts->mapWithKeys(fn (Contract $c) => [$c->id => max(0.0, $maxRem[$c->id] - $idealRem[$c->id])]);
                    $totalHeadroom = (float) $headroom->sum();
                    $overcapacityPool = min($surplus, $totalHeadroom);

                    if ($overcapacityPool > 0) {
                        $rows = $rows->merge($this->allocateOvercapacity($contracts, $overcapacityPool, $headroom));
                    }
                }
            }
        }

        $this->persistAndReserve($rows, $grade, $weekStart, $allocationDate);

        $allocated = round((float) $rows->sum('allocated_kg'), 2);

        return [
            'status' => $status,
            'stock_kg' => round($this->totalStock($grade), 2),
            'allocated_kg' => round($committedKg + $allocated, 2),
            'held_kg' => max(0.0, round($this->totalStock($grade) - $committedKg - $allocated, 2)),
            'rows' => $rows,
        ];
    }

    /**
     * Fill each remaining minimum, then distribute the remainder toward ideal.
     */
    private function allocateNormal(Collection $contracts, float $stock, Collection $minRem, Collection $idealRem): Collection
    {
        $rows = $this->allocateProportional($contracts, min($stock, (float) $minRem->sum()), 'minimum', fn (Contract $c) => $minRem[$c->id]);

        $filled = (float) $rows->sum('allocated_kg');
        $remainder = round($stock - $filled, 2);
        if ($remainder <= 0) {
            return $rows;
        }

        return $rows->merge($this->allocateProportional(
            $contracts,
            $remainder,
            'ideal',
            fn (Contract $c) => max(0.0, $idealRem[$c->id] - $minRem[$c->id])
        ));
    }

    /**
     * Overcapacity pool across headrooms (ideal→max remainder), weighted by
     * ideal capacity (D2) but capped at each contract's own headroom so no
     * contract ever exceeds its maximum. Capped shares spill to uncapped
     * contracts by the same weighting.
     */
    private function allocateOvercapacity(Collection $contracts, float $pool, Collection $headroom): Collection
    {
        $rows = collect();
        $remaining = round($pool, 2);

        // Iterate: assign proportional-to-ideal shares, cap at headroom, spill
        // the excess to the still-uncapped contracts. Bounded loop: at least
        // one contract becomes capped or the pool is exhausted each pass.
        $open = $contracts->keyBy('id');

        while ($remaining > 0.00001 && $open->isNotEmpty()) {
            $weights = $open->mapWithKeys(fn (Contract $c) => [$c->id => max(0.0, (float) $c->ideal_capacity_kg)]);
            $totalWeight = (float) $weights->sum();
            if ($totalWeight <= 0) {
                // No ideal weighting left; share the rest evenly over headroom.
                $weights = $open->mapWithKeys(fn (Contract $c) => [$c->id => $headroom[$c->id]]);
                $totalWeight = (float) $weights->sum();
                if ($totalWeight <= 0) {
                    break;
                }
            }

            // Proportions for this pass come from the pool at pass start, not
            // from the shrinking remainder (which would under-allocate later
            // contracts in the same pass).
            $passPool = $remaining;
            $passAllocated = 0.0;
            $capped = false;
            foreach ($open as $c) {
                $proportional = floor($passPool * 100 * ($weights[$c->id] / $totalWeight)) / 100;
                $share = min($proportional, $headroom[$c->id]);
                if ($share <= 0) {
                    continue;
                }
                if ($proportional > $headroom[$c->id] + 0.00001) {
                    $capped = true;
                }
                $rows->push([
                    'partner_id' => $c->partner_id,
                    'contract_id' => $c->id,
                    'grade' => $c->grade,
                    'source_grade' => $c->grade,
                    'intended_use' => $c->intended_use ?? (Grade::INTENDED_USES[$c->grade] ?? Grade::INTENDED_USES[Grade::NOT_FIT]),
                    'allocated_kg' => $share,
                    'allocation_type' => 'overcapacity',
                    'status' => 'approved',
                ]);
                $passAllocated = round($passAllocated + $share, 2);
            }

            $remaining = round($remaining - $passAllocated, 2);
            if (! $capped) {
                foreach ($open as $c) {
                    if ($remaining <= 0.00001) {
                        break;
                    }
                    $used = (float) $rows->where('contract_id', $c->id)->sum('allocated_kg');
                    $extra = min(0.01, $remaining, max(0.0, $headroom[$c->id] - $used));
                    if ($extra > 0) {
                        $rows->push([
                            'partner_id' => $c->partner_id,
                            'contract_id' => $c->id,
                            'grade' => $c->grade,
                            'source_grade' => $c->grade,
                            'intended_use' => $c->intended_use ?? (Grade::INTENDED_USES[$c->grade] ?? Grade::INTENDED_USES[Grade::NOT_FIT]),
                            'allocated_kg' => $extra,
                            'allocation_type' => 'overcapacity',
                            'status' => 'approved',
                        ]);
                        $remaining = round($remaining - $extra, 2);
                    }
                }
                break;
            }

            // Remove capped contracts (and any with no headroom left) and
            // spill the remainder over the still-open contracts.
            $cappedIds = $open
                ->filter(fn (Contract $c) => round($passPool * ($weights[$c->id] / max(0.00001, $totalWeight)), 2) > $headroom[$c->id] + 0.00001)
                ->pluck('id');
            $open = $open->reject(fn (Contract $c) => $cappedIds->contains($c->id));
        }

        return $rows->filter(fn ($row) => $row['allocated_kg'] > 0)->values();
    }

    /**
     * Share pool proportionally across partners weighted by $weight.
     * Callers guarantee the pool never exceeds the weighted capacity.
     * Overcapacity rows land 'approved' directly: overcapacity terms are
     * accepted at partner onboarding (Fase 1), no per-delivery approval.
     */
    private function allocateProportional(Collection $contracts, float $pool, string $type, \Closure $weight): Collection
    {
        $weights = $contracts->mapWithKeys(fn (Contract $c) => [$c->id => max(0.0, (float) $weight($c))]);
        $totalWeight = (float) $weights->sum();

        if ($pool <= 0.01 || $totalWeight <= 0) {
            return collect();
        }

        $shares = [];
        $remainingCents = (int) round($pool * 100);
        foreach ($contracts as $c) {
            $exact = $pool * 100 * ($weights[$c->id] / $totalWeight);
            $shares[$c->id] = (int) floor($exact);
            $remainingCents -= $shares[$c->id];
        }
        foreach ($contracts as $c) {
            if ($remainingCents <= 0) {
                break;
            }
            if ($shares[$c->id] < (int) round((float) $weight($c) * 100)) {
                $shares[$c->id]++;
                $remainingCents--;
            }
        }

        return $contracts->map(function (Contract $c) use ($type, $shares) {
            $share = $shares[$c->id] / 100;

            if ($share <= 0) {
                return null;
            }

            return [
                'partner_id' => $c->partner_id,
                'contract_id' => $c->id,
                'grade' => $c->grade,
                'source_grade' => $c->grade,
                'intended_use' => $c->intended_use ?? (Grade::INTENDED_USES[$c->grade] ?? Grade::INTENDED_USES[Grade::NOT_FIT]),
                'allocated_kg' => $share,
                'allocation_type' => $type,
                'status' => 'approved',
            ];
        })->filter()->values();
    }

    /**
     * Share pool proportionally across non-contracted partners weighted by $weights (ideal capacity).
     */
    private function allocateProportionalPartners(Collection $partners, float $pool, string $type, Collection $weights): Collection
    {
        $totalWeight = (float) $weights->sum();
        if ($totalWeight <= 0 || $pool <= 0.01) {
            return collect();
        }

        $shares = [];
        $remainingCents = (int) round($pool * 100);
        foreach ($partners as $p) {
            $w = max(0.0, (float) ($weights[$p->id] ?? 0));
            $exact = $pool * 100 * ($w / $totalWeight);
            $shares[$p->id] = (int) floor($exact);
            $remainingCents -= $shares[$p->id];
        }
        foreach ($partners as $p) {
            if ($remainingCents <= 0) {
                break;
            }
            $w = max(0.0, (float) ($weights[$p->id] ?? 0));
            if ($shares[$p->id] < (int) round($w * 100)) {
                $shares[$p->id]++;
                $remainingCents--;
            }
        }

        return $partners->map(function (Partner $p) use ($type, $shares) {
            $share = ($shares[$p->id] ?? 0) / 100;
            if ($share <= 0) {
                return null;
            }

            return [
                'partner_id' => $p->id,
                'contract_id' => null,
                'grade' => $p->grade_preference,
                'source_grade' => $p->grade_preference,
                'intended_use' => Grade::INTENDED_USES[$p->grade_preference] ?? Grade::INTENDED_USES[Grade::NOT_FIT],
                'allocated_kg' => $share,
                'allocation_type' => $type,
                'status' => 'approved',
            ];
        })->filter()->values();
    }

    /**
     * Persist allocation rows and atomically reserve warehouse lots (FIFO).
     * Reservation is the binding: delivery candidates are built only from
     * reservations, so the same kg cannot be allocated twice. A remainder
     * without lot backing (admin stock adjustment) reserves as a lot-less
     * reservation so conservation still holds.
     */
    private function persistAndReserve(Collection $rows, string $grade, string $weekStart, string $allocationDate): void
    {
        if ($rows->isEmpty()) {
            return;
        }

        $periodStart = Carbon::parse($allocationDate);
        $periodEnd = $periodStart->copy();

        foreach ($rows as $row) {
            $allocation = Allocation::create($row + [
                'allocation_date' => $allocationDate,
                'week_start' => $weekStart,
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodEnd->toDateString(),
            ]);
            $this->reserveKg($allocation, (float) $row['allocated_kg']);
        }
    }

    /**
     * Reserve kg for an allocation: lot-backed first (FIFO by classification),
     * remainder as a lot-less reservation backed by adjusted stock.
     */
    private function reserveKg(Allocation $allocation, float $needed): void
    {
        $remaining = $needed;

        // Lock the lot rows for the rest of the run transaction: two
        // concurrent runs serialize here instead of both reading the same
        // lotRemaining() and double-reserving the same kg.
        $lots = ClassificationLot::query()
            ->where('grade', $allocation->grade)
            ->orderBy('classified_at')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        foreach ($lots as $lot) {
            if ($remaining <= 0.00001) {
                break;
            }

            $free = $this->lotRemaining($lot);
            if ($free <= 0) {
                continue;
            }

            $take = min($free, $remaining);
            Reservation::create([
                'allocation_id' => $allocation->id,
                'classification_lot_id' => $lot->id,
                'grade' => $lot->grade,
                'intended_use' => $lot->intended_use,
                'reserved_kg' => round($take, 2),
                'status' => 'reserved',
                'reserved_at' => now(),
            ]);
            $remaining = round($remaining - $take, 2);
        }

        $nonLotAvailable = (float) WarehouseMutation::whereNull('classification_lot_id')->where('grade', $allocation->grade)
            ->get()->sum(fn (WarehouseMutation $m) => $this->signedKg($m));
        $nonLotReserved = (float) Reservation::whereNull('classification_lot_id')
            ->where('grade', $allocation->grade)->whereIn('status', self::ACTIVE_RESERVATION_STATUSES)->sum('reserved_kg');
        $remaining = min($remaining, max(0.0, $nonLotAvailable - $nonLotReserved));
        if ($remaining > 0.00001) {
            Reservation::create([
                'allocation_id' => $allocation->id,
                'classification_lot_id' => null,
                'grade' => $allocation->grade,
                'intended_use' => $allocation->intended_use,
                'reserved_kg' => min($remaining, $nonLotAvailable),
                'status' => 'reserved',
                'reserved_at' => now(),
            ]);
        }
    }

    private function signedKg(WarehouseMutation $mutation): float
    {
        return match ($mutation->type) {
            'receipt' => abs((float) $mutation->kg),
            'stock_out' => -abs((float) $mutation->kg),
            default => (float) $mutation->kg,
        };
    }

    /**
     * Pasokan surplus di atas kapasitas mitra dibeli dengan harga modal
     * (PRD overcapacity). Phase 7 billing consumes this.
     */
    public function surplusPrice(string $grade): float
    {
        return (float) (Price::query()->where('grade', $grade)->value('buy_price') ?? 0);
    }

    /**
     * Honest display status for a grade (same states the engine returns on
     * run): no active contracts → 'Tanpa kontrak'; stock below minimum
     * demand → 'Defisit'; up to ideal → 'Normal'; up to maxima → 'Surplus';
     * beyond every contract maximum → 'Surplus ditahan' (held, D3).
     */
    public function gradeStatus(string $grade, float $stock): string
    {
        $weekStart = Carbon::now()->startOfWeek();
        $eligible = Contract::query()->where('grade', $grade)->get()
            ->filter(fn (Contract $c) => $c->eligibleWithin($weekStart, $weekStart->copy()->addDays(6)));
        $demand = (float) $eligible->sum('min_capacity_kg');
        $activeContractCount = $eligible->count();

        if ($activeContractCount === 0) {
            return 'Tanpa kontrak';
        }

        $ideal = (float) $eligible->sum('ideal_capacity_kg');
        $maxima = (float) $eligible->sum('max_capacity_kg');

        return match (true) {
            $stock < $demand => 'Defisit',
            $stock <= $ideal => 'Normal',
            $stock <= $maxima => 'Surplus',
            default => 'Surplus ditahan',
        };
    }

    /**
     * Held kg for display: physical stock not covered by an allocation row
     * this week (excess beyond maxima, or allocation not yet run).
     */
    public function heldKg(string $grade, float $stock, float $allocated): float
    {
        return max(0.0, round($stock - $allocated, 2));
    }
}
