<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Partner;
use App\Domain\Grade;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(): Response
    {
        return Inertia::render('auth/register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'address' => 'required|string|max:1000',
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'grade_preference' => ['required', 'string', 'in:'.implode(',', Grade::ALL)],
            'kebutuhan_pokok_kg' => 'nullable|numeric|min:0',
            'ideal_capacity_kg' => 'nullable|numeric|min:0',
            'min_capacity_kg' => 'nullable|numeric|min:0',
            'max_capacity_kg' => 'nullable|numeric|min:0',
            'frequency' => 'required|in:harian,mingguan,bulanan',
            'receiving_days' => 'nullable|array',
            'receiving_days.*' => 'in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            'monthly_receiving_day' => 'nullable|integer|between:1,28|required_if:frequency,bulanan',
            'overcapacity_terms_accepted' => 'accepted',
        ]);

        $kebutuhan = (float) ($request->input('kebutuhan_pokok_kg') ?? $request->input('ideal_capacity_kg') ?? $request->input('min_capacity_kg') ?? 0);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'partner',
        ]);

        $freq = $request->input('frequency');
        $rawDays = (array) $request->input('receiving_days', []);
        $firstDay = !empty($rawDays) ? reset($rawDays) : 'monday';
        $receivingDays = $freq === 'mingguan' ? [$firstDay] : [];

        Partner::create([
            'user_id' => $user->id,
            'name' => $request->name,
            'address' => $request->address,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'grade_preference' => $request->grade_preference,
            'min_capacity_kg' => $kebutuhan,
            'ideal_capacity_kg' => $kebutuhan,
            'max_capacity_kg' => $kebutuhan,
            'frequency' => $freq,
            'receiving_days' => $receivingDays,
            'monthly_receiving_day' => $freq === 'bulanan' ? $request->monthly_receiving_day : null,
            'overcapacity_terms_version' => Partner::OVERCAPACITY_TERMS_VERSION,
            'overcapacity_terms_accepted_at' => now(),
        ]);

        event(new Registered($user));

        Auth::login($user);

        return to_route('partner.index');
    }
}
