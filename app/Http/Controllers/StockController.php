<?php

namespace App\Http\Controllers;

use App\Models\Partner;
use App\Models\Price;
use App\Models\Stock;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StockController extends Controller
{
    /**
     * Per-grade totals plus recent mutation log and 30-day cumulative trend.
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

        return Inertia::render('dashboard', [
            'stock' => $stock,
            'trend' => $this->trend(),
            'recentEntries' => $recentEntries,
            'stats' => [
                'total_stock_kg' => round($totalStock, 2),
                'active_partners' => Partner::query()->count(),
                'estimated_revenue' => round($estimatedRevenue, 2),
            ],
        ]);
    }

    /**
     * @return \Illuminate\Support\Collection<string, float>
     */
    private function totalsPerGrade(): \Illuminate\Support\Collection
    {
        return Stock::query()
            ->select('grade')
            ->selectRaw(Stock::signedTotalSql().' as total_kg')
            ->groupBy('grade')
            ->pluck('total_kg', 'grade');
    }

    /**
     * @return \Illuminate\Support\Collection<int, array{date: string, total_kg: float}>
     */
    private function trend(): \Illuminate\Support\Collection
    {
        $rows = Stock::query()
            ->selectRaw('DATE(created_at) as date')
            ->selectRaw(Stock::signedTotalSql().' as net_kg')
            ->groupBy(DB::raw('DATE(created_at)'))
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
