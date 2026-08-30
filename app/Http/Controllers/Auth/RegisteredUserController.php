<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Partner;
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
            'address' => 'required|string|max:1000', 'min_capacity_kg' => 'required|numeric|min:0',
            'ideal_capacity_kg' => 'required|numeric|gte:min_capacity_kg', 'max_capacity_kg' => 'required|numeric|gte:ideal_capacity_kg',
            'frequency' => 'required|in:harian,mingguan,bulanan', 'receiving_days' => 'required|array|min:1', 'receiving_days.*' => 'in:monday,tuesday,wednesday,thursday,friday,saturday,sunday', 'overcapacity_terms_accepted' => 'accepted',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'partner',
        ]);
        Partner::create($request->only('name', 'address', 'grade_preference', 'min_capacity_kg', 'ideal_capacity_kg', 'max_capacity_kg', 'frequency', 'receiving_days') + ['user_id' => $user->id, 'overcapacity_terms_version' => Partner::OVERCAPACITY_TERMS_VERSION, 'overcapacity_terms_accepted_at' => now()]);

        event(new Registered($user));

        Auth::login($user);

        return to_route('partner.index');
    }
}
