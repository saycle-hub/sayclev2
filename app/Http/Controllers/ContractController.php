<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\Partner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
            'contracts' => $contracts,
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
        $contract->update(['status' => $status]);

        return back()->with('success', $message);
    }

    private function delete(Contract $contract): RedirectResponse
    {
        $contract->delete();

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
        ]);
    }
}
