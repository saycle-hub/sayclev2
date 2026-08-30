<?php

namespace App\Http\Controllers;

use App\Models\Allocation;
use App\Models\Contract;
use App\Models\Partner;
use App\Models\PickupTask;
use App\Models\Price;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Partner self-service portal (Fase 7). Separate from PartnerController,
 * which is the admin CRUD. All pages scope data to the authenticated
 * user's partner record via partner() or firstOrFail().
 */
class PartnerPortalController extends Controller
{
    public function index(Request $request): Response
    {
        $partner = $this->partner($request);

        $stats = $partner ? $this->stats($partner) : null;
        $activeContract = $partner
            ? Contract::query()
                ->where('partner_id', $partner->id)
                ->where('status', 'active')
                ->orderByDesc('start_date')
                ->orderByDesc('created_at')
                ->first()
            : null;

        return Inertia::render('partner/index', [
            'partner' => $partner ? $this->partnerSummary($partner) : null,
            'stats' => $stats,
            'contract' => $activeContract ? $this->contractRow($activeContract) : null,
        ]);
    }

    public function deliveries(Request $request): Response
    {
        $partner = $this->partner($request);

        $deliveries = collect();
        if ($partner) {
            $deliveries = PickupTask::query()
                ->whereHas('sale', fn ($q) => $q->where('partner_id', $partner->id))
                ->with(['sale:id,partner_id,contact_name,address', 'vehicle:id,name'])
                ->orderByDesc('created_at')
                ->limit(100)
                ->get()
                ->map(fn (PickupTask $t) => $this->deliveryRow($t));
        }

        return Inertia::render('partner/deliveries', ['deliveries' => $deliveries]);
    }

    public function contract(Request $request): Response
    {
        $partner = $this->partner($request);

        $contracts = collect();
        if ($partner) {
            $contracts = Contract::query()
                ->where('partner_id', $partner->id)
                ->orderByDesc('start_date')
                ->orderByDesc('created_at')
                ->get()
                ->map(fn (Contract $c) => $this->contractRow($c));
        }

        return Inertia::render('partner/contract', ['contracts' => $contracts]);
    }

    public function billing(Request $request): Response
    {
        $partner = $this->partner($request);

        $breakdown = collect(Price::GRADES)->map(fn (string $grade) => [
            'grade' => $grade,
            'kg' => 0.0,
            'buy_price' => 0.0,
            'total' => 0.0,
            'pickups' => 0,
        ])->values();

        if ($partner) {
            $rows = PickupTask::query()
                ->whereHas('sale', fn ($q) => $q->where('partner_id', $partner->id))
                ->where('status', 'done')
                ->whereNotNull('actual_kg')
                ->whereNotNull('grade')
                ->get(['grade', 'actual_kg']);

            $prices = Price::query()->get()->keyBy('grade');

            $byGrade = $rows->groupBy(fn ($t) => $this->gradeLabel($t->grade))
                ->map(fn ($group, string $grade) => [
                    'grade' => $grade,
                    'kg' => round((float) $group->sum('actual_kg'), 2),
                    'buy_price' => (float) ($prices[$grade]->buy_price ?? 0),
                    'pickups' => $group->count(),
                ]);

            // Keep the canonical grade order, overlay computed sums.
            $breakdown = $breakdown->map(function (array $row) use ($byGrade) {
                $found = $byGrade->get($row['grade']);

                return $found
                    ? [...$row, ...$found, 'total' => round($found['kg'] * $found['buy_price'], 2)]
                    : $row;
            })->values();
        }

        return Inertia::render('partner/billing', [
            'breakdown' => $breakdown,
            'grandTotal' => round($breakdown->sum('total'), 2),
            'totalKg' => round($breakdown->sum('kg'), 2),
        ]);
    }

    private function partner(Request $request): ?Partner
    {
        return Partner::query()->where('user_id', $request->user()->id)->first();
    }

    private function partnerSummary(Partner $partner): array
    {
        return [
            'id' => $partner->id,
            'name' => $partner->name,
            'grade_preference' => $partner->grade_preference,
            'frequency' => $partner->frequency,
        ];
    }

    /**
     * Overview counters: delivery status counts, this week's allocation,
     * and total unpaid billing derived from completed pickups.
     *
     * @return array<string, float|int>
     */
    private function stats(Partner $partner): array
    {
        $taskQuery = PickupTask::query()
            ->whereHas('sale', fn ($q) => $q->where('partner_id', $partner->id));

        $done = (clone $taskQuery)->where('status', 'done')->count();
        $pending = (clone $taskQuery)->whereIn('status', ['pending', 'assigned', 'in_progress'])->count();

        $weekStart = Carbon::now()->startOfWeek()->toDateString();
        $allocatedKg = (float) Allocation::query()
            ->where('partner_id', $partner->id)
            ->whereDate('week_start', $weekStart)
            ->where('status', 'approved')
            ->sum('allocated_kg');

        $billable = (clone $taskQuery)
            ->where('status', 'done')
            ->whereNotNull('actual_kg')
            ->whereNotNull('grade')
            ->get(['grade', 'actual_kg']);

        $prices = Price::query()->get()->keyBy('grade');
        $billing = $billable->sum(fn (PickupTask $t) => (float) $t->actual_kg
            * (float) ($prices[$this->gradeLabel($t->grade)]->buy_price ?? 0));

        return [
            'pending' => $pending,
            'done' => $done,
            'allocated_kg' => round($allocatedKg, 2),
            'billing' => round($billing, 2),
        ];
    }

    private function deliveryRow(PickupTask $t): array
    {
        return [
            'id' => $t->id,
            'status' => $t->status,
            'status_label' => $this->statusLabel($t->status),
            'estimated_kg' => $t->estimated_kg !== null ? (float) $t->estimated_kg : null,
            'actual_kg' => $t->actual_kg !== null ? (float) $t->actual_kg : null,
            'grade' => $t->grade !== null ? $this->gradeLabel($t->grade) : null,
            'vehicle_name' => $t->vehicle?->name,
            'checked_in_at' => $t->checked_in_at?->toISOString(),
            'created_at' => $t->created_at->toISOString(),
            'address' => $t->sale?->address,
        ];
    }

    private function contractRow(Contract $c): array
    {
        return [
            'id' => $c->id,
            'name' => $c->name,
            'status' => $c->status,
            'grade' => $c->grade,
            'min_capacity_kg' => (float) $c->min_capacity_kg,
            'ideal_capacity_kg' => (float) $c->ideal_capacity_kg,
            'max_capacity_kg' => (float) $c->max_capacity_kg,
            'frequency' => $c->frequency,
            'buy_price' => (float) $c->buy_price,
            'sell_price' => (float) $c->sell_price,
            'start_date' => $c->start_date?->toDateString(),
            'end_date' => $c->end_date?->toDateString(),
        ];
    }

    /**
     * Pickup tasks store grades in lowercase enum form (layak,
     * kurang_layak, ...); prices and badges use the title-case
     * canonical labels. Map on read.
     */
    private function gradeLabel(?string $grade): string
    {
        return match ($grade) {
            'layak' => 'Layak',
            'kurang_layak' => 'Kurang Layak',
            'tidak_layak' => 'Tidak Layak',
            default => $grade ?? '',
        };
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'pending' => 'Menunggu',
            'assigned' => 'Dijadwalkan',
            'in_progress' => 'Berjalan',
            'done' => 'Selesai',
            default => $status,
        };
    }
}
