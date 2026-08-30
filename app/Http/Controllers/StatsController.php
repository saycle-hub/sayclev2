<?php

namespace App\Http\Controllers;

use App\Models\Partner;
use App\Models\PickupTask;
use App\Models\Price;
use App\Models\Sale;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin statistics dashboard (Fase 8). All figures derive from
 * completed pickup tasks (status done, weighed with actual_kg +
 * grade) valued at the current Price table per grade.
 *
 * Revenue convention:
 *   pengeluaran = Σ actual_kg × Price.buy_price   (paid to suppliers)
 *   pendapatan  = Σ actual_kg × Price.sell_price  (charged to partners)
 *   margin      = pendapatan − pengeluaran
 *
 * Pickup tasks store grades lowercase (layak, kurang_layak, ...);
 * canonical Price rows and badges use title-case labels.
 */
class StatsController extends Controller
{
    public const PURPOSE_BY_GRADE = [
        'Layak' => 'Pakan ternak',
        'Kurang Layak' => 'Pakan maggot',
        'Tidak Layak' => 'Kompos',
    ];

    public function index(): Response
    {
        $rows = $this->doneRows();
        [$pengeluaran, $pendapatan] = $this->revenueSums($rows);

        return Inertia::render('stats/index', [
            'kpi' => [
                'pendapatan' => $pendapatan,
                'pengeluaran' => $pengeluaran,
                'margin' => round($pendapatan - $pengeluaran, 2),
                'kg_terolah' => round($rows->sum('kg'), 2),
                'total_mitra' => Partner::count(),
                'total_pemasok' => Sale::query()->distinct('contact')->count('contact'),
            ],
            'trend' => $this->weeklyTrend($rows),
        ]);
    }

    public function revenue(): Response
    {
        $prices = Price::query()->get()->keyBy('grade');

        $transactions = PickupTask::query()
            ->where('status', 'done')
            ->whereNotNull('actual_kg')
            ->whereNotNull('grade')
            ->with('sale:id,contact')
            ->orderByDesc('checked_in_at')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(function (PickupTask $t) use ($prices) {
                $grade = $this->gradeLabel($t->grade);
                $kg = (float) $t->actual_kg;
                $buy = (float) ($prices[$grade]->buy_price ?? 0);
                $sell = (float) ($prices[$grade]->sell_price ?? 0);

                return [
                    'id' => $t->id,
                    'tanggal' => ($t->checked_in_at ?? $t->created_at)?->toISOString(),
                    'supplier' => $t->sale?->contact ?? '-',
                    'grade' => $grade,
                    'kg' => $kg,
                    'pengeluaran' => round($kg * $buy, 2),
                    'pendapatan' => round($kg * $sell, 2),
                    'margin' => round($kg * ($sell - $buy), 2),
                ];
            });

        return Inertia::render('stats/revenue', [
            'transactions' => $transactions,
            'totals' => [
                'pendapatan' => round($transactions->sum('pendapatan'), 2),
                'pengeluaran' => round($transactions->sum('pengeluaran'), 2),
                'margin' => round($transactions->sum('margin'), 2),
            ],
        ]);
    }

    public function impact(): Response
    {
        $rows = $this->doneRows();

        $byGrade = collect(Price::GRADES)->map(fn (string $grade) => [
            'grade' => $grade,
            'tujuan' => self::PURPOSE_BY_GRADE[$grade] ?? '-',
            'kg' => round((float) $rows->where('grade', $grade)->sum('kg'), 2),
        ])->values();

        return Inertia::render('stats/impact', [
            'impact' => $byGrade,
            'totalKg' => round($byGrade->sum('kg'), 2),
        ]);
    }

    public function partners(): Response
    {
        $byGrade = Partner::query()
            ->selectRaw("COALESCE(grade_preference, 'Tanpa preferensi') as label, COUNT(*) as total")
            ->groupBy('label')
            ->orderByDesc('total')
            ->get();

        $byFrequency = Partner::query()
            ->selectRaw('frequency as label, COUNT(*) as total')
            ->groupBy('label')
            ->orderByDesc('total')
            ->get();

        return Inertia::render('stats/partners', [
            'totals' => [
                'mitra' => Partner::count(),
                'pemasok' => Sale::query()->distinct('contact')->count('contact'),
            ],
            'byGrade' => $byGrade,
            'byFrequency' => $byFrequency,
        ]);
    }

    /**
     * All completed, weighed pickup tasks as flat rows:
     * ['grade' => title-case label, 'kg' => float, 'created_at' => Carbon].
     */
    private function doneRows()
    {
        return PickupTask::query()
            ->where('status', 'done')
            ->whereNotNull('actual_kg')
            ->whereNotNull('grade')
            ->get(['grade', 'actual_kg', 'created_at'])
            ->map(fn (PickupTask $t) => [
                'grade' => $this->gradeLabel($t->grade),
                'kg' => (float) $t->actual_kg,
                'created_at' => $t->created_at,
            ]);
    }

    /**
     * @param  iterable<int, array{grade: string, kg: float}>  $rows
     * @return array{0: float, 1: float} [pengeluaran, pendapatan]
     */
    private function revenueSums(iterable $rows): array
    {
        $prices = Price::query()->get()->keyBy('grade');

        $pengeluaran = 0.0;
        $pendapatan = 0.0;
        foreach ($rows as $row) {
            $buy = (float) ($prices[$row['grade']]->buy_price ?? 0);
            $sell = (float) ($prices[$row['grade']]->sell_price ?? 0);
            $pengeluaran += $row['kg'] * $buy;
            $pendapatan += $row['kg'] * $sell;
        }

        return [round($pengeluaran, 2), round($pendapatan, 2)];
    }

    /**
     * Weekly kg + pendapatan trend over the last 12 weeks (ISO week
     * starts, zero-filled). Pendapatan uses current sell prices.
     *
     * @return array<int, array{week_start: string, kg: float, pendapatan: float}>
     */
    private function weeklyTrend(iterable $rows): array
    {
        $prices = Price::query()->get()->keyBy('grade');
        $start = Carbon::now()->startOfWeek()->subWeeks(11);

        $weeks = [];
        foreach (range(0, 11) as $i) {
            $weeks[$start->copy()->addWeeks($i)->toDateString()] = ['kg' => 0.0, 'pendapatan' => 0.0];
        }

        foreach ($rows as $row) {
            $key = $row['created_at']->copy()->startOfWeek()->toDateString();
            if (! isset($weeks[$key])) {
                continue;
            }
            $sell = (float) ($prices[$row['grade']]->sell_price ?? 0);
            $weeks[$key]['kg'] += $row['kg'];
            $weeks[$key]['pendapatan'] += $row['kg'] * $sell;
        }

        return collect($weeks)
            ->map(fn (array $w, string $weekStart) => [
                'week_start' => $weekStart,
                'kg' => round($w['kg'], 2),
                'pendapatan' => round($w['pendapatan'], 2),
            ])
            ->sortKeys()
            ->values()
            ->all();
    }

    private function gradeLabel(?string $grade): string
    {
        return match ($grade) {
            'layak' => 'Layak',
            'kurang_layak' => 'Kurang Layak',
            'tidak_layak' => 'Tidak Layak',
            default => $grade ?? '',
        };
    }
}
