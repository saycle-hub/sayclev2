<?php

namespace App\Http\Controllers;

use App\Models\Partner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PartnerController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));

        $partners = Partner::query()
            ->withCount(['contracts', 'contracts as active_contracts_count' => fn ($q) => $q->where('status', 'active')])
            ->when($search !== '', fn ($q) => $q->where(fn ($qq) => $qq->where('name', 'like', "%{$search}%")->orWhere('address', 'like', "%{$search}%")))
            ->latest()
            ->get(['id', 'name', 'address', 'grade_preference', 'min_capacity_kg', 'ideal_capacity_kg', 'max_capacity_kg', 'frequency', 'receiving_days', 'created_at']);

        return Inertia::render('partners/index', [
            'partners' => $partners,
            'filters' => ['q' => $search],
            'stats' => [
                'total' => $partners->count(),
                'active' => $partners->sum('active_contracts_count'),
                'without_contract' => $partners->where('contracts_count', 0)->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('partners/create');
    }

    public function store(Request $request): RedirectResponse
    {
        $partner = Partner::create($this->validated($request));

        return redirect()->route('partners.show', $partner)->with('success', "Mitra {$partner->name} berhasil ditambahkan.");
    }

    public function show(Partner $partner): Response
    {
        $partner->load(['contracts' => fn ($q) => $q->latest()]);
        $systemPrices = \App\Models\Price::all()->keyBy('grade');

        return Inertia::render('partners/show', [
            'partner' => $partner,
            'systemPrices' => $systemPrices,
        ]);
    }

    public function edit(Partner $partner): Response
    {
        return Inertia::render('partners/edit', ['partner' => $partner]);
    }

    public function update(Request $request, Partner $partner): RedirectResponse
    {
        $partner->update($this->validated($request));

        return redirect()->route('partners.index')->with('success', "Data mitra {$partner->name} berhasil diperbarui.");
    }

    public function destroy(Partner $partner): RedirectResponse
    {
        $name = $partner->name;
        $partner->delete();

        return redirect()->route('partners.index')->with('success', "Mitra {$name} berhasil dihapus.");
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:2000'],
            'grade_preference' => ['nullable', 'string', Rule::in(['Layak', 'Kurang Layak', 'Tidak Layak'])],
            'kebutuhan_pokok_kg' => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'ideal_capacity_kg' => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'frequency' => ['required', 'string', Rule::in(['harian', 'mingguan', 'bulanan'])],
            'receiving_days' => ['nullable', 'array'],
            'receiving_days.*' => ['string', Rule::in(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])],
        ], [
            'name.required' => 'Nama mitra wajib diisi.',
            'address.required' => 'Alamat wajib diisi.',
            'grade_preference.in' => 'Grade preferensi tidak valid.',
            'kebutuhan_pokok_kg.numeric' => 'Total kebutuhan pokok harus berupa angka.',
            'frequency.required' => 'Frekuensi wajib dipilih.',
            'frequency.in' => 'Frekuensi tidak valid.',
        ]);

        $kebutuhan = (float) ($request->input('kebutuhan_pokok_kg') ?? $request->input('ideal_capacity_kg') ?? 0);
        $validated['ideal_capacity_kg'] = $kebutuhan;
        $validated['min_capacity_kg'] = $kebutuhan;
        $validated['max_capacity_kg'] = $kebutuhan;

        $freq = $request->input('frequency');
        $validated['delivery_frequency'] = $freq;
        if ($freq === 'mingguan') {
            $rawDays = (array) $request->input('receiving_days', []);
            $firstDay = !empty($rawDays) ? reset($rawDays) : 'monday';
            $validated['receiving_days'] = [$firstDay];
            $validated['delivery_days'] = [$firstDay];
        } else {
            $validated['receiving_days'] = [];
            $validated['delivery_days'] = [];
        }

        return $validated;
    }
}
