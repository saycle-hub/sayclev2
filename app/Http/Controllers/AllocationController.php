<?php

namespace App\Http\Controllers;

use App\Models\Allocation;
use App\Models\Contract;
use App\Models\Delivery;
use App\Models\Partner;
use App\Models\Stock;
use App\Models\Warehouse;
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
        $allocationDate = request('date', Carbon::today()->toDateString());
        $targetDate = Carbon::parse($allocationDate);
        $weekStart = $targetDate->copy()->startOfWeek()->toDateString();
        $hasRun = Allocation::whereDate('allocation_date', $allocationDate)->orWhereDate('week_start', $weekStart)->exists();

        $overview = collect(Stock::GRADES)->map(function (string $grade) use ($allocationDate, $weekStart, $hasRun, $targetDate) {
            $stock = (float) $this->engine->totalStock($grade);

            $contracts = Contract::query()->where('grade', $grade)->where('status', 'active')->get();
            $contractMin = (float) $contracts->sum(fn ($c) => $c->dailyMinKg($targetDate));
            $contractIdeal = (float) $contracts->sum(fn ($c) => $c->dailyIdealKg($targetDate));
            $contractMax = (float) $contracts->sum(fn ($c) => $c->dailyMaxKg($targetDate));

            $nonContractPartners = Partner::query()
                ->where('grade_preference', $grade)
                ->whereDoesntHave('contracts', fn ($q) => $q->where('grade', $grade))
                ->get();
            $nonContractIdeal = (float) $nonContractPartners->sum(fn ($p) => $p->dailyIdealKg($targetDate));

            $demand = $contractMin;
            $ideal = $contractIdeal + $nonContractIdeal;
            $maximum = $contractMax + $nonContractIdeal;

            $allocated = (float) Allocation::where(fn ($q) => $q->whereDate('allocation_date', $allocationDate)->orWhereDate('week_start', $weekStart))
                ->where('grade', $grade)
                ->sum('allocated_kg');

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
                'ideal_kg' => round($ideal, 2),
                'maximum_kg' => round($maximum, 2),
                'allocated_kg' => round($allocated, 2),
                'held_kg' => round($held, 2),
                'status' => $status,
            ];
        })->values();

        $wSleman = Warehouse::where('code', 'GDG-SLM-01')->first();
        $wSewon = Warehouse::where('code', 'GDG-SWN-02')->first();

        // 5 Partners Detailed Multi-Warehouse Breakdown
        $partners = Partner::with(['contracts' => fn ($q) => $q->where('status', 'active')])
            ->orderBy('id')
            ->get()
            ->map(function (Partner $p) use ($allocationDate, $weekStart, $wSleman, $wSewon) {
                $activeContracts = $p->contracts;
                $hasContract = $activeContracts->isNotEmpty();
                $allocations = Allocation::where(fn ($q) => $q->whereDate('allocation_date', $allocationDate)->orWhereDate('week_start', $weekStart))
                    ->where('partner_id', $p->id)
                    ->get();
                $allocatedKgSum = (float) $allocations->sum('allocated_kg');
                $contract = $activeContracts->first();
                $targetWeeklyKg = $allocatedKgSum > 0
                    ? $allocatedKgSum
                    : (float) ($contract?->ideal_capacity_kg ?? $p->ideal_capacity_kg ?? 0);

                // Proximity to warehouses
                $distSleman = $p->latitude && $p->longitude && $wSleman
                    ? $this->haversineKm((float) $wSleman->latitude, (float) $wSleman->longitude, (float) $p->latitude, (float) $p->longitude)
                    : 10.0;
                $distSewon = $p->latitude && $p->longitude && $wSewon
                    ? $this->haversineKm((float) $wSewon->latitude, (float) $wSewon->longitude, (float) $p->latitude, (float) $p->longitude)
                    : 10.0;

                $primaryWh = $distSleman <= $distSewon ? $wSleman : $wSewon;
                $secondaryWh = $distSleman <= $distSewon ? $wSewon : $wSleman;

                $startDate = Carbon::parse($weekStart);
                $todayStr = Carbon::today()->toDateString();

                $dailySchedule = collect(range(0, 6))->map(function ($offset) use ($startDate, $todayStr, $p, $activeContracts, $primaryWh, $secondaryWh, $allocatedKgSum, $targetWeeklyKg) {
                    $d = $startDate->copy()->addDays($offset);
                    $dStr = $d->toDateString();
                    $isPast = $dStr < $todayStr;
                    $isToday = $dStr === $todayStr;

                    $contract = $activeContracts->first();
                    $isScheduled = $contract ? $contract->isScheduledForDate($d) : $p->isScheduledForDate($d);
                    $freq = $contract?->delivery_frequency ?? $p->delivery_frequency ?? 'harian';

                    $delivery = Delivery::where('partner_id', $p->id)->whereDate('service_date', $dStr)->with('lines')->first();

                    if ($delivery) {
                        $kg = (float) $delivery->lines->sum('kg');
                        $status = $delivery->status === 'delivered' ? 'completed' : $delivery->status;
                    } elseif ($isPast) {
                        $kg = 0.0;
                        $status = 'completed';
                    } elseif (! $isScheduled) {
                        $kg = 0.0;
                        $status = 'off';
                    } else {
                        if ($allocatedKgSum > 0) {
                            if ($freq === 'mingguan') {
                                $kg = round((float) ($contract?->ideal_capacity_kg ?? $p->ideal_capacity_kg ?? $targetWeeklyKg), 1);
                            } else {
                                $kg = round($allocatedKgSum / 7, 1);
                            }
                            $status = 'planned';
                        } else {
                            $kg = 0.0;
                            $status = 'planned';
                        }
                    }

                    // Multi-warehouse split case for large shipments or alternating days
                    $isSplit = $kg > 200 && ($offset === 2 || $offset === 4 || $p->id % 2 === 0);
                    $whOrigins = [];
                    if ($kg > 0) {
                        if ($isSplit && $secondaryWh && $primaryWh && $secondaryWh->id !== $primaryWh->id) {
                            $primaryKg = round($kg * 0.65, 1);
                            $secondaryKg = round($kg - $primaryKg, 1);
                            $whOrigins = [
                                ['name' => $primaryWh->name, 'code' => $primaryWh->code, 'kg' => $primaryKg],
                                ['name' => $secondaryWh->name, 'code' => $secondaryWh->code, 'kg' => $secondaryKg],
                            ];
                        } else {
                            $whOrigins = [
                                ['name' => $primaryWh?->name ?? 'Gudang Utama Saycle Sleman', 'code' => $primaryWh?->code ?? 'GDG-SLM-01', 'kg' => $kg],
                            ];
                        }
                    }

                    return [
                        'date' => $dStr,
                        'day_name' => $d->locale('id')->isoFormat('dddd'),
                        'day_short' => $d->locale('id')->isoFormat('D MMM'),
                        'kg' => $kg,
                        'status' => $status,
                        'is_past' => $isPast,
                        'is_today' => $isToday,
                        'is_scheduled' => $isScheduled,
                        'warehouses' => $whOrigins,
                        'is_multi_warehouse' => count($whOrigins) > 1,
                    ];
                })->values();

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'address' => $p->address,
                    'grade_preference' => $p->grade_preference,
                    'delivery_frequency' => $activeContracts->first()?->delivery_frequency ?? $p->delivery_frequency ?? 'harian',
                    'has_contract' => $hasContract,
                    'contract_name' => $activeContracts->first()?->name ?? 'Kemitraan Reguler (Non-Kontrak)',
                    'weekly_allocated_kg' => round($targetWeeklyKg, 2),
                    'primary_warehouse' => $primaryWh?->name ?? 'Gudang Utama Saycle Sleman',
                    'daily_schedule' => $dailySchedule,
                ];
            });

        $currentWeekStart = Carbon::today()->startOfWeek();
        $targetWeekStart = Carbon::parse($weekStart);
        $weekEnd = $targetDate->copy()->endOfWeek()->toDateString();

        $weekOffsets = [-1, 0, 1];
        $availableWeeks = collect($weekOffsets)->map(function (int $weekOffset) use ($currentWeekStart, $weekStart) {
            $wStart = $currentWeekStart->copy()->addWeeks($weekOffset);
            $wEnd = $wStart->copy()->endOfWeek();
            $wStartStr = $wStart->toDateString();

            $label = $wStart->locale('id')->isoFormat('D MMM') . ' – ' . $wEnd->locale('id')->isoFormat('D MMM YYYY');
            if ($wStartStr === $currentWeekStart->toDateString()) {
                $label .= ' (Minggu Ini)';
            } elseif ($weekOffset === -1) {
                $label .= ' (Minggu Lalu)';
            }

            return [
                'date' => $wStartStr,
                'week_start' => $wStartStr,
                'week_end' => $wEnd->toDateString(),
                'label' => $label,
                'is_selected' => $wStartStr === $weekStart,
                'is_current' => $wStartStr === $currentWeekStart->toDateString(),
            ];
        });

        if (! $availableWeeks->contains('week_start', $weekStart)) {
            $customEnd = $targetWeekStart->copy()->endOfWeek();
            $availableWeeks->prepend([
                'date' => $weekStart,
                'week_start' => $weekStart,
                'week_end' => $customEnd->toDateString(),
                'label' => $targetWeekStart->locale('id')->isoFormat('D MMM') . ' – ' . $customEnd->locale('id')->isoFormat('D MMM YYYY'),
                'is_selected' => true,
                'is_current' => $weekStart === $currentWeekStart->toDateString(),
            ]);
        }

        return Inertia::render('allocation/index', [
            'allocationDate' => $allocationDate,
            'weekStart' => $weekStart,
            'weekEnd' => $weekEnd,
            'availableWeeks' => $availableWeeks->values(),
            'hasRun' => $hasRun,
            'overview' => $overview,
            'partners' => $partners,
            'heldGrades' => $overview->filter(fn (array $row) => $row['held_kg'] > 0)->count(),
        ]);
    }

    public function run(): RedirectResponse
    {
        $date = request('date');
        $result = $this->engine->run($date);

        return back()->with('success', "Alokasi tanggal {$result['allocation_date']} berhasil dijalankan.");
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
                'minimum' => (float) ($a->contract?->min_capacity_kg ?? 0),
                'ideal' => (float) ($a->contract?->ideal_capacity_kg ?? 0),
                'maximum' => (float) ($a->contract?->max_capacity_kg ?? 0),
                'is_contract' => $a->contract_id !== null,
            ]),
        ]);
    }

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 2 * $earthRadius * asin(min(1.0, sqrt($a)));
    }
}
