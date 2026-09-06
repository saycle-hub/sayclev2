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
            'min_capacity_kg' => 'required|numeric|min:0',
            'ideal_capacity_kg' => 'required|numeric|gte:min_capacity_kg',
            'max_capacity_kg' => 'required|numeric|gte:ideal_capacity_kg',
            'frequency' => 'required|in:harian,mingguan,bulanan',
            'receiving_days' => 'nullable|array|required_if:frequency,mingguan',
            'receiving_days.*' => 'in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            'monthly_receiving_day' => 'nullable|integer|between:1,28|required_if:frequency,bulanan',
            'overcapacity_terms_accepted' => 'accepted',
        ]);

        if ($request->frequency === 'mingguan' && empty($request->receiving_days)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'receiving_days' => 'Pilih minimal 1 hari penerimaan.',
            ]);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'partner',
        ]);
        $data = $request->only('name', 'address', 'latitude', 'longitude', 'grade_preference', 'min_capacity_kg', 'ideal_capacity_kg', 'max_capacity_kg', 'frequency', 'receiving_days', 'monthly_receiving_day');
        if ($data['frequency'] !== 'mingguan') {
            $data['receiving_days'] = null;
        }
        if ($data['frequency'] !== 'bulanan') {
            $data['monthly_receiving_day'] = null;
        }

        Partner::create($data + ['user_id' => $user->id, 'overcapacity_terms_version' => Partner::OVERCAPACITY_TERMS_VERSION, 'overcapacity_terms_accepted_at' => now()]);

        event(new Registered($user));

        Auth::login($user);

        return to_route('partner.index');
    }
}
