<?php

namespace App\Services;

use App\Domain\Grade;
use App\Models\Allocation;
use App\Models\ClassificationLot;
use App\Models\Contract;
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
    public function run(): array
    {
        $weekStart = Carbon::now()->startOfWeek()->toDateString();

        return DB::transaction(function () use ($weekStart) {
            $results = [];
            foreach (Contract::GRADES as $grade) {
                $results[$grade] = $this->runGrade($grade, $weekStart);
            }

            return ['week_start' => $weekStart, 'grades' => $results];
        });
    }

    /**
     * Total physical stock per grade from the immutable warehouse ledger
     * (receipts − stock-outs + adjustments), regardless of reservations.
     * This is the display/reconciliation number.
     */
    public function totalStock(string $grade): float
    {
        $receipts = (float) WarehouseMutation::query()->where('type', 'receipt')->where('grade', $grade)->sum('kg');
        $stockOuts = (float) WarehouseMutation::query()->where('type', 'stock_out')->where('grade', $grade)->sum('kg');
        $adjustments = (float) WarehouseMutation::query()->where('type', 'adjustment')->where('grade', $grade)->sum('kg');

        return round($receipts - $stockOuts + $adjustments, 2);
    }

    /**
     * Free (unreserved) stock per grade: total physical minus active
     * reservations. Plan Fase 6: "Hitung available stock per grade dari
     * ledger dan reservation aktif." This is the allocation input.
     */
    public function availableStock(string $grade): float
    {
        $adjustments = (float) WarehouseMutation::query()
            ->where('type', 'adjustment')->where('grade', $grade)->sum('kg');
        $lotBacked = (float) ClassificationLot::query()
            ->where('grade', $grade)
            ->get()
            ->sum(fn (ClassificationLot $lot) => $this->lotRemaining($lot));

        return round(max(0.0, $lotBacked) + $adjustments, 2);
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
     * PRD rules: minimum → ideal → overcapacity (ideal→max) → held visibly.
     * Fairness decisions (owner, 31-08-2026):
     * - D1 deficit: proportional to remaining minimum.
     * - D2 overcapacity headroom: proportional to contract ideal capacity.
     * - D3 excess beyond every contract maximum: stays in warehouse, surfaced
     *   as held_kg; never silently dropped, never re-graded.
     */
    private function runGrade(string $grade, string $weekStart): array
    {
        $availableBefore = $this->availableStock($grade);

        // Committed allocations (backed by active reservations) survive reruns.
        $committed = Allocation::query()
            ->whereDate('week_start', $weekStart)
            ->where('grade', $grade)
            ->whereHas('reservations', fn ($q) => $q->whereIn('status', self::ACTIVE_RESERVATION_STATUSES))
            ->with('reservations')
            ->get();
        $committedByPartner = $committed
            ->groupBy('partner_id')
            ->map(fn ($group) => (float) $group->flatMap->reservations
                ->whereIn('status', self::ACTIVE_RESERVATION_STATUSES)
                ->sum('reserved_kg'));
        $committedKg = (float) $committedByPartner->sum();

        // Replaceable rows from earlier reruns this week are removed.
        Allocation::query()
            ->whereDate('week_start', $weekStart)
            ->where('grade', $grade)
            ->whereDoesntHave('reservations', fn ($q) => $q->whereIn('status', self::ACTIVE_RESERVATION_STATUSES))
            ->delete();

        // availableStock() already excludes active reservations, so it is the
        // free unreserved pool. committedKg is used only to shrink per-contract
        // remaining capacity; subtracting it here would double-count.
        $available = $availableBefore;
        $contracts = Contract::query()
            ->where('grade', $grade)
            ->where('status', 'active')
            ->orderBy('id')
            ->get();

        $rows = collect();
        $status = 'Tanpa kontrak';

        if ($contracts->isNotEmpty()) {
            // Remaining per-contract capacity after committed allocations.
            $minRem = $contracts->mapWithKeys(fn (Contract $c) => [$c->id => max(0.0, (float) $c->min_capacity_kg - ($committedByPartner[$c->partner_id] ?? 0))]);
            $idealRem = $contracts->mapWithKeys(fn (Contract $c) => [$c->id => max(0.0, (float) $c->ideal_capacity_kg - ($committedByPartner[$c->partner_id] ?? 0))]);
            $maxRem = $contracts->mapWithKeys(fn (Contract $c) => [$c->id => max(0.0, (float) $c->max_capacity_kg - ($committedByPartner[$c->partner_id] ?? 0))]);

            $totalMinRem = (float) $minRem->sum();
            $totalIdealRem = (float) $idealRem->sum();
            $totalMaxRem = (float) $maxRem->sum();

            if ($available < $totalMinRem) {
                $status = 'Defisit';
                // D1: share the deficit pool proportionally to minimum tier.
                $rows = $this->allocateProportional($contracts, $available, 'minimum', fn (Contract $c) => $minRem[$c->id]);
            } elseif ($available <= $totalIdealRem) {
                $status = 'Normal';
                $rows = $this->allocateNormal($contracts, $available, $minRem, $idealRem);
            } else {
                $status = 'Surplus';
                $rows = $this->allocateNormal($contracts, $totalIdealRem, $minRem, $idealRem);
                $surplus = round($available - $totalIdealRem, 2);

                if ($surplus > 0) {
                    $headroom = $contracts->mapWithKeys(fn (Contract $c) => [$c->id => max(0.0, $maxRem[$c->id] - $idealRem[$c->id])]);
                    $totalHeadroom = (float) $headroom->sum();
                    $overcapacityPool = min($surplus, $totalHeadroom);

                    if ($overcapacityPool > 0) {
                        // D2: headroom distributed proportional to ideal capacity,
                        // capped at each contract's own headroom (a contract can
                        // never receive beyond its maximum).
                        $rows = $rows->merge($this->allocateOvercapacity($contracts, $overcapacityPool, $headroom));
                    }
                    // D3: $surplus - $totalHeadroom stays in the warehouse as
                    // held stock; computed below, never silently dropped.
                }
            }
        }

        $this->persistAndReserve($rows, $grade, $weekStart);

        $allocated = round((float) $rows->sum('allocated_kg'), 2);

        return [
            'status' => $status,
            'stock_kg' => round($this->totalStock($grade), 2),
            'allocated_kg' => round($committedKg + $allocated, 2),
            // Physical total minus everything this week's allocations bind;
            // the visible remainder stays in the warehouse (D3).
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
                $proportional = round($passPool * ($weights[$c->id] / $totalWeight), 2);
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
                break; // proportional distribution consumed the pool
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

        if ($totalWeight <= 0) {
            return collect();
        }

        return $contracts->map(function (Contract $c) use ($pool, $type, $weights, $totalWeight) {
            $share = round($pool * ($weights[$c->id] / $totalWeight), 2);

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
     * Persist allocation rows and atomically reserve warehouse lots (FIFO).
     * Reservation is the binding: delivery candidates are built only from
     * reservations, so the same kg cannot be allocated twice. A remainder
     * without lot backing (admin stock adjustment) reserves as a lot-less
     * reservation so conservation still holds.
     */
    private function persistAndReserve(Collection $rows, string $grade, string $weekStart): void
    {
        if ($rows->isEmpty()) {
            return;
        }

        $periodStart = Carbon::parse($weekStart);
        $periodEnd = $periodStart->copy()->addDays(6);

        foreach ($rows as $row) {
            $allocation = Allocation::create($row + [
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

        $lots = ClassificationLot::query()
            ->where('grade', $allocation->grade)
            ->orderBy('classified_at')
            ->orderBy('id')
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

        if ($remaining > 0.00001) {
            Reservation::create([
                'allocation_id' => $allocation->id,
                'classification_lot_id' => null,
                'grade' => $allocation->grade,
                'intended_use' => $allocation->intended_use,
                'reserved_kg' => $remaining,
                'status' => 'reserved',
                'reserved_at' => now(),
            ]);
        }
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
        $demand = (float) Contract::query()->where('grade', $grade)->where('status', 'active')->sum('min_capacity_kg');
        $activeContractCount = Contract::query()->where('grade', $grade)->where('status', 'active')->count();

        if ($activeContractCount === 0) {
            return 'Tanpa kontrak';
        }

        $ideal = (float) Contract::query()->where('grade', $grade)->where('status', 'active')->sum('ideal_capacity_kg');
        $maxima = (float) Contract::query()->where('grade', $grade)->where('status', 'active')->sum('max_capacity_kg');

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
