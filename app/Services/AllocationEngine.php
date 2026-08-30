<?php

namespace App\Services;

use App\Models\Allocation;
use App\Models\Contract;
use App\Models\Price;
use App\Models\Stock;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AllocationEngine
{
    /**
     * Run weekly allocation for every grade and persist results.
     * Idempotent per week_start: previous run for the same week is replaced.
     *
     * @return array{week_start: string, grades: array<string, array{status: string, stock_kg: float, allocated_kg: float, rows: Collection}>}
     */
    public function run(): array
    {
        $weekStart = Carbon::now()->startOfWeek()->toDateString();

        return DB::transaction(function () use ($weekStart) {
            Allocation::whereDate('week_start', $weekStart)->delete();

            $results = [];
            foreach (Stock::GRADES as $grade) {
                $results[$grade] = $this->runGrade($grade, $weekStart);
            }

            return ['week_start' => $weekStart, 'grades' => $results];
        });
    }

    /**
     * PRD rules: minimum → ideal → surplus/overcapacity → compost fallback.
     */
    private function runGrade(string $grade, string $weekStart): array
    {
        $stock = (float) Stock::query()
            ->where('grade', $grade)
            ->selectRaw(Stock::signedTotalSql().' as total')
            ->value('total') ?? 0.0;

        $contracts = Contract::query()
            ->where('grade', $grade)
            ->where('status', 'active')
            ->orderBy('id')
            ->get();

        $totalMinimum = (float) $contracts->sum('min_capacity_kg');
        $totalIdeal = (float) $contracts->sum('ideal_capacity_kg');

        $rows = collect();

        if ($contracts->isEmpty()) {
            return ['status' => 'Tanpa kontrak', 'stock_kg' => $stock, 'allocated_kg' => 0.0, 'rows' => $rows];
        }

        if ($stock < $totalMinimum) {
            $status = 'Defisit';
            $rows = $this->allocateProportional($contracts, $stock, 'minimum', fn (Contract $c) => (float) $c->min_capacity_kg);
        } elseif ($stock <= $totalIdeal) {
            $status = 'Normal';
            $rows = $this->allocateNormal($contracts, $stock);
        } else {
            $status = 'Surplus';
            $rows = $this->allocateNormal($contracts, $totalIdeal);
            $surplus = round($stock - $totalIdeal, 2);

            if ($surplus > 0) {
                // Distribute surplus across max headroom (max − ideal), capping each
                // partner at its own headroom; anything beyond TOTAL capacity is
                // redirected to the compost fallback grade (PRD kompos cadangan).
                $headrooms = $contracts->mapWithKeys(fn (Contract $c) => [$c->id => max(0.0, (float) $c->max_capacity_kg - (float) $c->ideal_capacity_kg)]);
                $totalHeadroom = (float) $headrooms->sum();

                $overcapacityRows = $this->allocateProportional(
                    $contracts,
                    min($surplus, $totalHeadroom),
                    'overcapacity',
                    fn (Contract $c) => $headrooms[$c->id],
                    'overcapacity'
                );
                $rows = $rows->merge($overcapacityRows);

                $unhandled = round($surplus - $totalHeadroom, 2);
                if ($unhandled > 0.001) {
                    $this->redirectToFallback($grade, $unhandled, $weekStart);
                }
            }
        }

        $this->persist($rows, $grade, $weekStart);

        return [
            'status' => $status,
            'stock_kg' => $stock,
            'allocated_kg' => round((float) $rows->sum('allocated_kg'), 2),
            'rows' => $rows,
        ];
    }

    /**
     * Fill each minimum, then distribute the remainder proportionally toward ideal.
     */
    private function allocateNormal(Collection $contracts, float $stock): Collection
    {
        $rows = $this->allocateProportional($contracts, min($stock, (float) $contracts->sum('min_capacity_kg')), 'minimum', fn (Contract $c) => (float) $c->min_capacity_kg);

        $filled = (float) $rows->sum('allocated_kg');
        $remainder = round($stock - $filled, 2);
        if ($remainder <= 0) {
            return $rows;
        }

        return $rows->merge($this->allocateProportional(
            $contracts,
            $remainder,
            'ideal',
            fn (Contract $c) => max(0.0, (float) $c->ideal_capacity_kg - (float) $c->min_capacity_kg)
        ));
    }

    /**
     * Share pool proportionally across partners weighted by $weight.
     * Callers guarantee the pool never exceeds the weighted capacity
     * (minimum ≤ Σmin, surplus pool ≤ Σheadroom), so shares never need flagging.
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
                'allocated_kg' => $share,
                'allocation_type' => $type,
                'status' => $type === 'overcapacity' ? 'pending' : 'approved',
            ];
        })->filter()->values();
    }

    private function persist(Collection $rows, string $grade, string $weekStart): void
    {
        foreach ($rows as $row) {
            Allocation::create($row + ['week_start' => $weekStart]);
        }
    }

    /**
     * PRD kompos cadangan: excess beyond all partner capacity of this grade is
     * redirected to active Tidak Layak (compost) contracts as approved overcapacity.
     */
    private function redirectToFallback(string $grade, float $amount, string $weekStart): void
    {
        if ($amount <= 0.001) {
            return;
        }

        $fallbackContracts = Contract::query()
            ->where('grade', 'Tidak Layak')
            ->where('status', 'active')
            ->get();

        if ($fallbackContracts->isEmpty()) {
            return;
        }

        $rows = $this->allocateProportional(
            $fallbackContracts,
            $amount,
            'overcapacity',
            fn (Contract $c) => (float) $c->max_capacity_kg
        );

        foreach ($rows as $row) {
            // Fallback is the terminal handler (PRD kompos cadangan): no approval
            // queue — rows land approved directly. array_merge so the explicit
            // status overrides allocateProportional's default 'pending'.
            Allocation::create(array_merge($row, [
                'week_start' => $weekStart,
                'status' => 'approved',
                'notes' => "Alihan surplus {$grade} (kompos cadangan).",
            ]));
        }
    }

    /**
     * Pasokan surplus di atas kapasitas mitra dibeli dengan harga modal
     * (PRD overcapacity). Phase 8 pricing will consume this.
     */
    public function surplusPrice(string $grade): float
    {
        return (float) (Price::query()->where('grade', $grade)->value('buy_price') ?? 0);
    }
}
