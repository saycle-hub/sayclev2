<?php

namespace App\Http\Controllers;

use App\Models\FinancialLine;
use App\Models\Partner;
use App\Models\Price;
use App\Models\SupplierReport;
use App\Models\WarehouseMutation;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin statistics dashboard (Fase 8). Every figure reconciles to the
 * canonical ledgers instead of legacy tables and current prices:
 *
 *   - kg terolah  = warehouse_mutations receipts (immutable ledger);
 *   - pengeluaran = financial_lines supplier_payment snapshot amounts
 *     (paid supplier_payment snapshots — cash on pickup, recorded and
 *     settled at check-in with the buy price at that moment);
 *   - pendapatan  = financial_lines partner_invoice snapshot amounts
 *     (recorded at delivery with contract / modal price at that moment).
 *
 * Current Price rows are never used for realized figures, so historical
 * stats cannot drift when prices change (reconciles blocker C6).
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
        return Inertia::render('stats/index', [
            'kpi' => $this->kpi(),
            'trend' => $this->dailyTrend(),
        ]);
    }

    /**
     * Daily kg (receipts) + pendapatan (partner invoice snapshots) starting
     * dynamically from the earliest recorded data date to today.
     *
     * @return array<int, array{week_start: string, date: string, kg: float, pendapatan: float}>
     */
    private function dailyTrend(): array
    {
        $earliestReceipt = WarehouseMutation::query()->where('type', 'receipt')->min('occurred_at');
        $earliestInvoice = FinancialLine::query()->where('type', 'partner_invoice')->min('created_at');

        $dates = array_filter([$earliestReceipt, $earliestInvoice]);

        if (empty($dates)) {
            $start = Carbon::today();
        } else {
            $minDate = min(array_map(fn ($d) => Carbon::parse($d), $dates));
            $start = $minDate->copy()->startOfDay();
        }

        $end = Carbon::today();
        if ($start->greaterThan($end)) {
            $start = $end->copy();
        }

        $days = [];
        $current = $start->copy();
        while ($current->lessThanOrEqualTo($end)) {
            $days[$current->toDateString()] = ['kg' => 0.0, 'pendapatan' => 0.0];
            $current->addDay();
        }

        if (empty($days)) {
            $days[$end->toDateString()] = ['kg' => 0.0, 'pendapatan' => 0.0];
        }

        $receipts = WarehouseMutation::query()
            ->where('type', 'receipt')
            ->where('occurred_at', '>=', $start)
            ->get(['kg', 'occurred_at']);
        foreach ($receipts as $receipt) {
            $key = $receipt->occurred_at?->toDateString();
            if ($key !== null && isset($days[$key])) {
                $days[$key]['kg'] += (float) $receipt->kg;
            }
        }

        $invoices = FinancialLine::query()
            ->where('type', 'partner_invoice')
            ->where('created_at', '>=', $start)
            ->get(['amount', 'created_at']);
        foreach ($invoices as $invoice) {
            $key = $invoice->created_at?->toDateString();
            if ($key !== null && isset($days[$key])) {
                $days[$key]['pendapatan'] += (float) $invoice->amount;
            }
        }

        return collect($days)
            ->map(fn (array $d, string $dateStr) => [
                'week_start' => $dateStr,
                'date' => $dateStr,
                'kg' => round($d['kg'], 2),
                'pendapatan' => round($d['pendapatan'], 2),
            ])
            ->sortKeys()
            ->values()
            ->all();
    }

    public function revenue(): Response
    {
        $transactions = FinancialLine::query()
            ->whereIn('type', ['supplier_payment', 'partner_invoice'])
            ->with(['supplierReport:id,contact_name', 'delivery:id,partner_id', 'delivery.partner:id,name'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(fn (FinancialLine $line) => $this->transactionRow($line));

        return Inertia::render('stats/revenue', [
            'transactions' => $transactions,
            'totals' => [
                'pendapatan' => round((float) $transactions->sum('pendapatan'), 2),
                'pengeluaran' => round((float) $transactions->sum('pengeluaran'), 2),
                'terbayar' => round((float) $transactions->sum('paid'), 2),
                'margin' => round((float) $transactions->sum('margin'), 2),
            ],
        ]);
    }

    public function impact(): Response
    {
        $receipts = WarehouseMutation::query()
            ->where('type', 'receipt')
            ->selectRaw('grade, SUM(kg) as total_kg')
            ->groupBy('grade')
            ->pluck('total_kg', 'grade');

        $byGrade = collect(Price::GRADES)->map(fn (string $grade) => [
            'grade' => $grade,
            'tujuan' => self::PURPOSE_BY_GRADE[$grade] ?? '-',
            'kg' => round((float) ($receipts[$grade] ?? 0), 2),
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
                'pemasok' => SupplierReport::count(),
            ],
            'byGrade' => $byGrade,
            'byFrequency' => $byFrequency,
        ]);
    }

    /**
     * KPI block for the stats index. Money comes from snapshot amounts,
     * kg from the receipt ledger.
     *
     * @return array<string, float|int>
     */
    private function kpi(): array
    {
        $pengeluaran = (float) FinancialLine::query()->where('type', 'supplier_payment')->where('status', 'paid')->sum('amount');
        $pendapatan = (float) FinancialLine::query()->where('type', 'partner_invoice')->sum('amount');

        return [
            'pendapatan' => round($pendapatan, 2),
            'pengeluaran' => round($pengeluaran, 2),
            'margin' => round($pendapatan - $pengeluaran, 2),
            'kg_terolah' => round((float) WarehouseMutation::query()->where('type', 'receipt')->sum('kg'), 2),
            'total_mitra' => Partner::count(),
            'total_pemasok' => SupplierReport::count(),
        ];
    }

    /**
     * One canonical transaction = one financial line. Payable lines are
     * purchases from suppliers, receivable lines are partner invoices;
     * both carry snapshot amounts already stored on the line.
     */
    private function transactionRow(FinancialLine $line): array
    {
        $isPayable = $line->type === 'supplier_payment';
        $amount = (float) $line->amount;

        $party = $isPayable
            ? ($line->supplierReport?->contact_name ?? 'Pemasok')
            : ($line->delivery?->partner?->name ?? 'Mitra');

        return [
            'id' => $line->id,
            'tanggal' => $line->created_at?->toISOString(),
            'jenis' => $isPayable ? 'Beli pemasok' : 'Tagihan mitra',
            'pihak' => $party,
            'grade' => $line->grade ?? '-',
            'kg' => (float) ($line->kg ?? 0),
            'status' => $line->status,
            'pengeluaran' => $isPayable ? $amount : 0.0,
            'pendapatan' => $isPayable ? 0.0 : $amount,
            'paid' => $isPayable ? ($line->status === 'paid' ? $amount : 0.0) : 0.0,
            'margin' => $isPayable ? -$amount : $amount,
        ];
    }


}
