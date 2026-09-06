<?php

namespace App\Http\Controllers;

use App\Models\Allocation;
use App\Models\Contract;
use App\Models\FinancialLine;
use App\Models\Partner;
use App\Models\Pickup;
use App\Models\Price;
use App\Models\Stock;
use App\Models\WarehouseMutation;
use App\Services\AllocationEngine;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StockController extends Controller
{
    /**
     * Per-grade totals plus recent mutation log and 30-day cumulative trend.
     * Totals read the canonical warehouse ledger; the legacy `stocks` table is
     * kept for the mutation log display only.
     */
    public function index(): Response
    {
        $totals = $this->totalsPerGrade();

        $stock = collect(Stock::GRADES)->map(fn (string $grade) => [
            'grade' => $grade,
            'total_kg' => (float) ($totals[$grade] ?? 0),
        ])->values();

        $entries = Stock::query()
            ->latest()
            ->limit(50)
            ->get(['id', 'grade', 'kg', 'type', 'description', 'created_at']);

        $warehouses = \App\Models\Warehouse::query()
            ->orderBy('is_default', 'desc')
            ->orderBy('name')
            ->get()
            ->map(function (\App\Models\Warehouse $w) use ($totals) {
                $ratio = $w->is_default ? 0.65 : 0.35;
                $gradeStocks = [];
                $totalWhKg = 0.0;
                foreach (Stock::GRADES as $grade) {
                    $kg = round(((float) ($totals[$grade] ?? 0)) * $ratio, 1);
                    $gradeStocks[$grade] = $kg;
                    $totalWhKg += $kg;
                }

                return [
                    'id' => $w->id,
                    'code' => $w->code,
                    'name' => $w->name,
                    'address' => $w->address,
                    'latitude' => (float) $w->latitude,
                    'longitude' => (float) $w->longitude,
                    'capacity_kg' => (float) $w->capacity_kg,
                    'is_active' => (bool) $w->is_active,
                    'is_default' => (bool) $w->is_default,
                    'notes' => $w->notes,
                    'occupied_kg' => round($totalWhKg, 1),
                    'occupancy_rate' => $w->capacity_kg > 0 ? round(($totalWhKg / $w->capacity_kg) * 100, 1) : 0,
                    'grade_stocks' => $gradeStocks,
                ];
            });

        $weekStart = Carbon::now()->startOfWeek()->toDateString();
        $today = Carbon::today()->toDateString();
        $unallocatedStocks = collect(Stock::GRADES)->map(function (string $grade) use ($totals, $weekStart, $today) {
            $stockKg = (float) ($totals[$grade] ?? 0);
            $allocatedKg = (float) Allocation::where(fn ($q) => $q->whereDate('allocation_date', $today)->orWhereDate('week_start', $weekStart))
                ->where('grade', $grade)
                ->sum('allocated_kg');
            $unallocatedKg = max(0, $stockKg - $allocatedKg);

            return [
                'grade' => $grade,
                'stock_kg' => round($stockKg, 2),
                'allocated_kg' => round($allocatedKg, 2),
                'unallocated_kg' => round($unallocatedKg, 2),
            ];
        })->filter(fn ($item) => $item['unallocated_kg'] > 0)->values();

        $safeHoldingLimits = [
            'Layak' => [
                'max_days' => 2,
                'target' => 'Pakan Ternak Segar',
                'risk' => 'Pembusukan & tekstur lembek jika > 48 jam',
                'badge' => '2 Hari (48 Jam)',
            ],
            'Kurang Layak' => [
                'max_days' => 3,
                'target' => 'Maggot BSF',
                'risk' => 'Fermentasi asam berlebih jika > 72 jam',
                'badge' => '3 Hari (72 Jam)',
            ],
            'Tidak Layak' => [
                'max_days' => 5,
                'target' => 'Kompos Organik',
                'risk' => 'Bau menyengat & gas metana jika > 120 jam',
                'badge' => '5 Hari (120 Jam)',
            ],
        ];

        $idealDemands = [];
        foreach (Stock::GRADES as $grade) {
            $contractIdeal = (float) Contract::where('status', 'active')->where('grade', $grade)->sum('ideal_capacity_kg');
            $nonContractIdeal = (float) Partner::whereDoesntHave('contracts', fn ($q) => $q->where('status', 'active'))
                ->where('grade_preference', $grade)
                ->sum('ideal_capacity_kg');
            $idealDemands[$grade] = round($contractIdeal + $nonContractIdeal, 2);
        }

        return Inertia::render('stock/index', [
            'stock' => $stock,
            'entries' => $entries,
            'trend' => $this->trend(),
            'prices' => Price::query()->orderBy('id')->get(['grade', 'buy_price', 'sell_price']),
            'warehouses' => $warehouses,
            'unallocatedStocks' => $unallocatedStocks,
            'safeHoldingLimits' => $safeHoldingLimits,
            'idealDemands' => $idealDemands,
        ]);
    }

    public function storeWarehouse(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:warehouses,code'],
            'name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:1000'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'capacity_kg' => ['required', 'numeric', 'min:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        \App\Models\Warehouse::create($validated);

        return back()->with('success', "Gudang {$validated['name']} berhasil ditambahkan.");
    }

    /**
     * Record a stock movement. `adjust` accepts a signed delta (koreksi +/−).
     */
    public function adjust(Request $request): RedirectResponse
    {
        $kgRule = $request->input('type') === 'adjust'
            ? ['required', 'numeric', 'not_in:0', 'between:-99999999,99999999']
            : ['required', 'numeric', 'min:0.01', 'max:99999999'];

        $validated = $request->validate([
            'grade' => ['required', 'in:'.implode(',', Stock::GRADES)],
            'type' => ['required', 'in:'.implode(',', Stock::TYPES)],
            'kg' => $kgRule,
            'description' => ['nullable', 'string', 'max:1000'],
        ], [
            'grade.required' => 'Grade wajib dipilih.',
            'grade.in' => 'Grade tidak valid.',
            'type.required' => 'Tipe mutasi wajib dipilih.',
            'type.in' => 'Tipe mutasi tidak valid.',
            'kg.required' => 'Jumlah (kg) wajib diisi.',
            'kg.numeric' => 'Jumlah harus berupa angka.',
            'kg.not_in' => 'Koreksi tidak boleh nol.',
            'kg.between' => 'Jumlah koreksi di luar batas.',
            'kg.min' => 'Jumlah minimal 0,01 kg.',
            'kg.max' => 'Jumlah melebihi batas maksimal.',
        ]);

        if ($validated['type'] === 'out') {
            $engine = app(AllocationEngine::class);
            $currentStock = $engine->totalStock($validated['grade']);
            if ((float) $validated['kg'] > $currentStock) {
                return back()->withErrors(['kg' => "Pengurangan stok ({$validated['kg']} kg) melebihi stok tersedia ({$currentStock} kg)."]);
            }
        }

        Stock::create($validated);

        // Mirror into the canonical warehouse ledger so the allocation engine
        // and stock displays always share one source of truth. Adjustment
        // rows carry their own sign; in/out are positive magnitudes.
        WarehouseMutation::create([
            'type' => 'adjustment',
            'grade' => $validated['grade'],
            'intended_use' => null,
            'kg' => $validated['type'] === 'out' ? -abs((float) $validated['kg']) : (float) $validated['kg'],
            'description' => trim(($validated['description'] ?? '').' (koreksi admin)'),
            'performed_by' => auth()->id(),
            'occurred_at' => now(),
        ]);

        return back()->with('success', 'Mutasi stok berhasil dicatat.');
    }

    /**
     * Admin dashboard overview: stock KPIs, trend, recent entries, revenue estimate.
     */
    public function dashboard(): Response
    {
        $totals = $this->totalsPerGrade();
        $stock = collect(Stock::GRADES)->map(fn (string $grade) => [
            'grade' => $grade,
            'total_kg' => (float) ($totals[$grade] ?? 0),
        ])->values();

        $recentEntries = Stock::query()
            ->latest()
            ->limit(10)
            ->get(['id', 'grade', 'kg', 'type', 'description', 'created_at']);

        $prices = Price::query()->get()->keyBy('grade');

        $totalStock = $stock->sum('total_kg');
        $estimatedRevenue = $stock->sum(fn (array $row) => $row['total_kg'] * (float) ($prices[$row['grade']]->sell_price ?? 0));

        // Realized figures from snapshot financial lines (Fase 8 reconciliation),
        // plus active pickup workload and per-grade allocation status
        // (shared derivation with the allocation page).
        $realizedPengeluaran = (float) FinancialLine::query()->where('type', 'supplier_payment')->where('status', 'paid')->sum('amount');
        $realizedPendapatan = (float) FinancialLine::query()->where('type', 'partner_invoice')->sum('amount');

        $weekStart = Carbon::now()->startOfWeek()->toDateString();
        $today = Carbon::today()->toDateString();
        $hasRun = Allocation::whereDate('allocation_date', $today)->orWhereDate('week_start', $weekStart)->exists();
        $engine = app(AllocationEngine::class);
        $allocationStatus = collect(Stock::GRADES)->map(function (string $grade) use ($engine, $weekStart, $today, $hasRun, $totals) {
            $stock = (float) ($totals[$grade] ?? 0);
            $allocated = (float) Allocation::where(fn ($q) => $q->whereDate('allocation_date', $today)->orWhereDate('week_start', $weekStart))
                ->where('grade', $grade)
                ->sum('allocated_kg');

            $totalPickup = (float) \App\Models\ClassificationLot::query()->where('grade', $grade)->sum('kg');

            return [
                'grade' => $grade,
                'stock_kg' => abs($stock) < 0.0001 ? 0.0 : round($stock, 2),
                'total_pickup_kg' => round($totalPickup, 2),
                'allocated_kg' => round($allocated, 2),
                'status' => $hasRun ? $engine->gradeStatus($grade, $stock) : 'Belum dijalankan',
                'held_kg' => $hasRun ? $engine->heldKg($grade, $stock, $allocated) : 0.0,
            ];
        })->values();

        return Inertia::render('dashboard', [
            'stock' => $stock,
            'trend' => $this->trend(),
            'recentEntries' => $recentEntries,
            'allocationStatus' => $allocationStatus,
            'stats' => [
                'total_stock_kg' => abs($totalStock) < 0.0001 ? 0.0 : round($totalStock, 2),
                'active_partners' => Partner::query()->count(),
                'estimated_revenue' => round($estimatedRevenue, 2),
                'realized_pendapatan' => round($realizedPendapatan, 2),
                'realized_pengeluaran' => round($realizedPengeluaran, 2),
                'realized_margin' => round($realizedPendapatan - $realizedPengeluaran, 2),
                'active_pickup_tasks' => Pickup::query()->whereIn('status', ['planned', 'assigned', 'in_progress'])->count(),
            ],
        ]);
    }

    /**
     * @return Collection<string, float>
     */
    private function totalsPerGrade(): Collection
    {
        $engine = app(AllocationEngine::class);

        return collect(Stock::GRADES)->mapWithKeys(fn (string $grade) => [
            $grade => $engine->totalStock($grade),
        ]);
    }

    /**
     * @return Collection<int, array{date: string, total_kg: float}>
     */
    private function trend(): Collection
    {
        $rows = Pickup::query()
            ->where('status', 'completed')
            ->whereNotNull('completed_at')
            ->selectRaw('DATE(completed_at) as date')
            ->selectRaw('SUM(actual_total_kg) as total_kg')
            ->groupBy(DB::raw('DATE(completed_at)'))
            ->orderBy('date')
            ->limit(30)
            ->get();

        if ($rows->isEmpty()) {
            $rows = WarehouseMutation::query()
                ->where('type', 'receipt')
                ->selectRaw('DATE(occurred_at) as date')
                ->selectRaw('SUM(kg) as total_kg')
                ->groupBy(DB::raw('DATE(occurred_at)'))
                ->orderBy('date')
                ->limit(30)
                ->get();
        }

        return $rows->map(fn ($row) => [
            'date' => (string) $row->date,
            'total_kg' => round((float) $row->total_kg, 2),
        ])->values();
    }
}
