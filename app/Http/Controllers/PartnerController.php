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
            ->get(['id', 'name', 'address', 'grade_preference', 'min_capacity_kg', 'ideal_capacity_kg', 'max_capacity_kg', 'frequency', 'created_at']);

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

        return Inertia::render('partners/show', ['partner' => $partner]);
    }

    public function edit(Partner $partner): Response
    {
        return Inertia::render('partners/edit', ['partner' => $partner]);
    }

    public function update(Request $request, Partner $partner): RedirectResponse
    {
        $partner->update($this->validated($request));

        return redirect()->route('partners.show', $partner)->with('success', "Data mitra {$partner->name} berhasil diperbarui.");
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
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:2000'],
            'grade_preference' => ['nullable', 'string', Rule::in(['Layak', 'Kurang Layak', 'Tidak Layak'])],
            'min_capacity_kg' => ['required', 'numeric', 'min:0', 'max:99999999'],
            'ideal_capacity_kg' => ['required', 'numeric', 'min:0', 'max:99999999', 'gte:min_capacity_kg'],
            'max_capacity_kg' => ['required', 'numeric', 'min:0', 'max:99999999', 'gte:ideal_capacity_kg'],
            'frequency' => ['required', 'string', Rule::in(['harian', 'mingguan', 'bulanan'])],
        ], [
            'name.required' => 'Nama mitra wajib diisi.',
            'address.required' => 'Alamat wajib diisi.',
            'grade_preference.in' => 'Grade preferensi tidak valid.',
            'min_capacity_kg.required' => 'Kapasitas minimum wajib diisi.',
            'min_capacity_kg.numeric' => 'Kapasitas minimum harus berupa angka.',
            'ideal_capacity_kg.required' => 'Kapasitas ideal wajib diisi.',
            'ideal_capacity_kg.gte' => 'Kapasitas ideal tidak boleh lebih kecil dari minimum.',
            'max_capacity_kg.required' => 'Kapasitas maksimum wajib diisi.',
            'max_capacity_kg.gte' => 'Kapasitas maksimum tidak boleh lebih kecil dari ideal.',
            'frequency.required' => 'Frekuensi wajib dipilih.',
            'frequency.in' => 'Frekuensi tidak valid.',
        ]);
    }
}
