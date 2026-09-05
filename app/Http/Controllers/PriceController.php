<?php

namespace App\Http\Controllers;

use App\Models\Price;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PriceController extends Controller
{
    public function index(): Response
    {
        $existing = Price::query()->get()->keyBy('grade');

        $prices = collect(Price::GRADES)->map(fn (string $grade) => [
            'grade' => $grade,
            'buy_price' => (float) ($existing[$grade]->buy_price ?? 0),
            'sell_price' => (float) ($existing[$grade]->sell_price ?? 0),
        ])->values();

        return Inertia::render('prices/index', ['prices' => $prices]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'grade' => ['required', 'in:'.implode(',', Price::GRADES)],
            'buy_price' => ['required', 'numeric', 'min:0', 'max:999999999'],
            'sell_price' => ['required', 'numeric', 'min:0', 'max:999999999'],
        ], [
            'grade.required' => 'Grade wajib dipilih.',
            'grade.in' => 'Grade tidak valid.',
            'buy_price.required' => 'Harga beli wajib diisi.',
            'buy_price.numeric' => 'Harga beli harus berupa angka.',
            'buy_price.min' => 'Harga beli tidak boleh negatif.',
            'sell_price.required' => 'Harga jual wajib diisi.',
            'sell_price.numeric' => 'Harga jual harus berupa angka.',
            'sell_price.min' => 'Harga jual tidak boleh negatif.',
        ]);

        Price::updateOrCreate(
            ['grade' => $validated['grade']],
            ['buy_price' => $validated['buy_price'], 'sell_price' => $validated['sell_price']],
        );

        return back()->with('success', "Harga {$validated['grade']} berhasil diperbarui.");
    }
}
