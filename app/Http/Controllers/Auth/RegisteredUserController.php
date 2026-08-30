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
            'address' => 'nullable|string', 'min_capacity_kg' => 'nullable|numeric|min:0',
            'ideal_capacity_kg' => 'nullable|numeric|gte:min_capacity_kg', 'max_capacity_kg' => 'nullable|numeric|gte:ideal_capacity_kg',
            'frequency' => 'nullable|in:harian,mingguan,bulanan', 'grade_preference' => 'nullable|in:Layak,Kurang Layak,Tidak Layak',
        ]);

        $partner = $request->filled('address');
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $partner ? 'partner' : 'admin',
        ]);
        if ($partner) Partner::create($request->only('name', 'address', 'grade_preference', 'min_capacity_kg', 'ideal_capacity_kg', 'max_capacity_kg', 'frequency') + ['user_id' => $user->id]);

        event(new Registered($user));

        Auth::login($user);

        return to_route($partner ? 'partner.index' : 'dashboard');
    }
}
