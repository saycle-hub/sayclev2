<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\DeliveryLine;
use App\Models\DeliveryTripLine;
use App\Models\FinancialLine;
use App\Models\Partner;
use App\Models\Reservation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ContractController extends Controller
{
    /**
     * Cross-partner contract list (/contracts).
     */
    public function index(): Response
    {
        $contracts = Contract::query()
            ->with(['partner:id,name,grade_preference'])
            ->latest()
            ->get();

        return Inertia::render('contracts/index', [
            'contracts' => $contracts->map(fn (Contract $contract) => [
                ...$contract->toArray(),
                'receiving_days' => $contract->frequency === 'harian' || $contract->frequency === 'bulanan' ? [] : ($contract->receiving_days ?? []),
                'schedule_summary' => $this->scheduleSummary($contract->frequency, $contract->receiving_days, $contract->monthly_day),
            ]),
            'stats' => [
                'total' => $contracts->count(),
                'active' => $contracts->where('status', 'active')->count(),
            ],
        ]);
    }

    public function store(Request $request, Partner $partner): RedirectResponse
    {
        $partner->contracts()->create([
            ...$this->validated($request),
            'status' => 'active',
        ]);

        return back()->with('success', 'Kontrak berhasil ditambahkan.');
    }

    public function update(Request $request, Contract $contract): RedirectResponse
    {
        $contract->update($this->validated($request, $contract));

        return back()->with('success', 'Kontrak berhasil diperbarui.');
    }

    /**
     * Semantic state transitions via POST /contracts/{id}/action:
     * pause|cancel soft-transition the contract; delete hard-deletes it.
     */
    public function action(Request $request, Contract $contract): RedirectResponse
    {
        ['action' => $action] = $request->validate([
            'action' => ['required', 'string', Rule::in(['pause', 'cancel', 'delete'])],
        ], [
            'action.required' => 'Aksi wajib diisi.',
            'action.in' => 'Aksi tidak valid.',
        ]);

        return match ($action) {
            'cancel' => $this->transition($contract, 'cancelled', 'Kontrak berhasil dibatalkan.'),
            'delete' => $this->delete($contract),
            default => $this->transition($contract, 'paused', 'Kontrak berhasil dijeda.'),
        };
    }

    private function transition(Contract $contract, string $status, string $message): RedirectResponse
    {
        DB::transaction(function () use ($contract, $status): void {
            $contract = Contract::whereKey($contract->id)->lockForUpdate()->firstOrFail();
            $reservationIds = Reservation::query()
                ->whereHas('allocation', fn ($q) => $q->where('contract_id', $contract->id))
                ->pluck('id');

            $protectedLineIds = DeliveryTripLine::query()
                ->whereHas('trip', fn ($q) => $q->whereNotIn('status', ['cancelled']))
                ->whereHas('deliveryLine', fn ($q) => $q->whereIn('reservation_id', $reservationIds))
                ->pluck('delivery_line_id');
            $protectedReservations = DeliveryLine::whereIn('id', $protectedLineIds)->pluck('reservation_id');

            Reservation::whereIn('id', $reservationIds)
                ->whereIn('status', ['reserved', 'partially_delivered'])
                ->whereNotIn('id', $protectedReservations)
                ->update(['status' => 'released', 'released_at' => now()]);

            DeliveryLine::query()
                ->whereIn('reservation_id', $reservationIds)
                ->whereNotIn('id', DeliveryTripLine::query()->pluck('delivery_line_id'))
                ->delete();

            $contract->update(['status' => $status]);
        });

        return back()->with('success', $message);
    }

    private function delete(Contract $contract): RedirectResponse
    {
        DB::transaction(function () use ($contract): void {
            $contract = Contract::whereKey($contract->id)->lockForUpdate()->firstOrFail();
            $used = DB::table('allocations')->where('contract_id', $contract->id)->exists()
                || DB::table('delivery_contracts')->where('contract_id', $contract->id)->exists()
                || FinancialLine::where('contract_id', $contract->id)->exists();
            abort_if($used, 409, 'Contract has allocation, delivery lineage, or financial records and cannot be deleted.');
            $contract->delete();
        });

        return back()->with('success', 'Kontrak berhasil dihapus.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Contract $contract = null): array
    {
        return $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'string', Rule::in(Contract::STATUSES)],
            'grade' => ['required', 'string', Rule::in(Contract::GRADES)],
            'min_capacity_kg' => ['required', 'numeric', 'min:0', 'max:99999999'],
            'ideal_capacity_kg' => ['required', 'numeric', 'min:0', 'max:99999999', 'gte:min_capacity_kg'],
            'max_capacity_kg' => ['required', 'numeric', 'min:0', 'max:99999999', 'gte:ideal_capacity_kg'],
            'frequency' => ['required', 'string', Rule::in(Contract::FREQUENCIES)],
            'receiving_days' => ['nullable', 'array', 'required_if:frequency,mingguan', 'min:1'],
            'receiving_days.*' => ['string', Rule::in(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])],
            'monthly_day' => ['nullable', 'integer', 'between:1,28', 'required_if:frequency,bulanan'],
            'buy_price' => ['required', 'numeric', 'min:0', 'max:999999999'],
            'sell_price' => ['required', 'numeric', 'min:0', 'max:999999999'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ], [
            'grade.required' => 'Grade wajib dipilih.',
            'grade.in' => 'Grade tidak valid.',
            'status.in' => 'Status kontrak tidak valid.',
            'min_capacity_kg.required' => 'Kapasitas minimum wajib diisi.',
            'min_capacity_kg.numeric' => 'Kapasitas minimum harus berupa angka.',
            'ideal_capacity_kg.required' => 'Kapasitas ideal wajib diisi.',
            'ideal_capacity_kg.gte' => 'Kapasitas ideal tidak boleh lebih kecil dari minimum.',
            'max_capacity_kg.required' => 'Kapasitas maksimum wajib diisi.',
            'max_capacity_kg.gte' => 'Kapasitas maksimum tidak boleh lebih kecil dari ideal.',
            'frequency.required' => 'Frekuensi wajib dipilih.',
            'frequency.in' => 'Frekuensi tidak valid.',
            'buy_price.required' => 'Harga beli wajib diisi.',
            'buy_price.min' => 'Harga beli tidak boleh negatif.',
            'sell_price.required' => 'Harga jual wajib diisi.',
            'sell_price.min' => 'Harga jual tidak boleh negatif.',
            'end_date.after_or_equal' => 'Tanggal berakhir tidak boleh sebelum tanggal mulai.',
        ]) + ['receiving_days' => in_array($request->input('frequency'), ['harian', 'bulanan'], true) ? [] : array_values(array_unique($request->input('receiving_days', []))), 'monthly_day' => $request->input('frequency') === 'bulanan' ? $request->input('monthly_day') : null];
    }

    private function scheduleSummary(string $frequency, ?array $days, ?int $monthlyDay = null): string
    {
        if ($frequency === 'harian') {
            return 'Setiap hari';
        }
        if ($frequency === 'bulanan') {
            return 'Tanggal '.$monthlyDay.' setiap bulan';
        }

        $labels = ['monday' => 'Senin', 'tuesday' => 'Selasa', 'wednesday' => 'Rabu', 'thursday' => 'Kamis', 'friday' => 'Jumat', 'saturday' => 'Sabtu', 'sunday' => 'Minggu'];

        return 'Setiap '.implode(', ', array_map(fn (string $day) => $labels[$day] ?? $day, $days ?? []));
    }
}
