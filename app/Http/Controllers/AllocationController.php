<?php

namespace App\Http\Controllers;

use App\Models\Allocation;
use App\Models\Contract;
use App\Models\Stock;
use App\Services\AllocationEngine;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class AllocationController extends Controller
{
    public function __construct(private AllocationEngine $engine) {}

    public function index(): Response
    {
        $weekStart = Carbon::now()->startOfWeek()->toDateString();
        $hasRun = Allocation::whereDate('week_start', $weekStart)->exists();

        $overview = collect(Stock::GRADES)->map(function (string $grade) use ($weekStart, $hasRun) {
            // Display stock is the physical ledger total (reservations included);
            // the engine's free pool is an allocation-input concept, not a KPI.
            $stock = (float) $this->engine->totalStock($grade);

            $demand = (float) Contract::query()
                ->where('grade', $grade)->where('status', 'active')
                ->sum('min_capacity_kg');

            $allocated = (float) Allocation::whereDate('week_start', $weekStart)->where('grade', $grade)->sum('allocated_kg');

            // Status is re-derived honestly for display via the engine's shared
            // helper: no active contracts → 'Tanpa kontrak'; the engine itself
            // returns the same states on run.
            $status = 'Belum dijalankan';
            $held = 0.0;
            if ($hasRun) {
                $status = $this->engine->gradeStatus($grade, $stock);
                $held = $this->engine->heldKg($grade, $stock, $allocated);
            }

            return [
                'grade' => $grade,
                'stock_kg' => round($stock, 2),
                'demand_kg' => round($demand, 2),
                'ideal_kg' => round((float) Contract::query()->where('grade', $grade)->where('status', 'active')->sum('ideal_capacity_kg'), 2),
                'maximum_kg' => round((float) Contract::query()->where('grade', $grade)->where('status', 'active')->sum('max_capacity_kg'), 2),
                'allocated_kg' => round($allocated, 2),
                'held_kg' => round($held, 2),
                'status' => $status,
            ];
        })->values();

        return Inertia::render('allocation/index', [
            'weekStart' => $weekStart,
            'hasRun' => $hasRun,
            'overview' => $overview,
            'heldGrades' => $overview->filter(fn (array $row) => $row['held_kg'] > 0)->count(),
        ]);
    }

    public function run(): RedirectResponse
    {
        $result = $this->engine->run();

        return back()->with('success', "Alokasi minggu {$result['week_start']} berhasil dijalankan.");
    }

    public function show(string $grade): Response
    {
        abort_unless(in_array($grade, Stock::GRADES, true), 404);

        $weekStart = Carbon::now()->startOfWeek()->toDateString();

        $rows = Allocation::query()
            ->whereDate('week_start', $weekStart)->where('grade', $grade)
            ->with(['partner:id,name', 'contract:id,grade,min_capacity_kg,ideal_capacity_kg,max_capacity_kg'])
            ->get();

        return Inertia::render('allocation/show', [
            'grade' => $grade,
            'weekStart' => $weekStart,
            'rows' => $rows->map(fn (Allocation $a) => [
                'id' => $a->id,
                'partner' => $a->partner?->name ?? '—',
                'allocated_kg' => (float) $a->allocated_kg,
                'allocation_type' => $a->allocation_type,
                'status' => $a->status,
                'minimum' => (float) ($a->contract->min_capacity_kg ?? 0),
                'ideal' => (float) ($a->contract->ideal_capacity_kg ?? 0),
                'maximum' => (float) ($a->contract->max_capacity_kg ?? 0),
            ]),
        ]);
    }
}
