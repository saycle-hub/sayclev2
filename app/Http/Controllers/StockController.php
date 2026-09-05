<?php

namespace App\Http\Controllers;

use App\Models\Allocation;
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

        return Inertia::render('stock/index', [
            'stock' => $stock,
            'entries' => $entries,
            'trend' => $this->trend(),
            'prices' => Price::query()->orderBy('id')->get(['grade', 'buy_price', 'sell_price']),
        ]);
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
        $hasRun = Allocation::whereDate('week_start', $weekStart)->exists();
        $engine = app(AllocationEngine::class);
        $allocationStatus = collect(Stock::GRADES)->map(function (string $grade) use ($engine, $weekStart, $hasRun) {
            $stock = (float) ($totals[$grade] ?? 0);
            $allocated = (float) Allocation::whereDate('week_start', $weekStart)->where('grade', $grade)->sum('allocated_kg');

            return [
                'grade' => $grade,
                'stock_kg' => round($stock, 2),
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
                'total_stock_kg' => round($totalStock, 2),
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
        return WarehouseMutation::query()
            ->select('grade')
            ->selectRaw("SUM(CASE
                WHEN type = 'receipt' THEN ABS(kg)
                WHEN type = 'stock_out' THEN -ABS(kg)
                ELSE kg
            END) as total_kg")
            ->groupBy('grade')
            ->pluck('total_kg', 'grade');
    }

    /**
     * @return Collection<int, array{date: string, total_kg: float}>
     */
    private function trend(): Collection
    {
        $rows = WarehouseMutation::query()
            ->selectRaw('DATE(occurred_at) as date')
            ->selectRaw("SUM(CASE
                WHEN type = 'receipt' THEN ABS(kg)
                WHEN type = 'stock_out' THEN -ABS(kg)
                ELSE kg
            END) as net_kg")
            ->groupBy(DB::raw('DATE(occurred_at)'))
            ->orderBy('date')
            ->limit(30)
            ->get();

        $cumulative = 0.0;

        return $rows->map(function ($row) use (&$cumulative) {
            $cumulative += (float) $row->net_kg;

            return ['date' => $row->date, 'total_kg' => round($cumulative, 2)];
        })->values();
    }
}
