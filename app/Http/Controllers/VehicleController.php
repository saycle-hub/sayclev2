<?php

namespace App\Http\Controllers;

use App\Models\PickupTask;
use App\Models\Vehicle;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VehicleController extends Controller
{
    public function index(): Response
    {
        $vehicles = Vehicle::query()->orderBy('name')->get()->map(fn (Vehicle $v) => [
            'id' => $v->id,
            'name' => $v->name,
            'capacity_kg' => (float) $v->capacity_kg,
            'is_active' => $v->is_active,
            'active_tasks' => $v->pickupTasks()->whereIn('status', ['pending', 'assigned', 'in_progress'])->count(),
        ]);

        return Inertia::render('vehicles/index', ['vehicles' => $vehicles]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'capacity_kg' => ['required', 'numeric', 'min:1', 'max:100000'],
        ]);

        Vehicle::create(array_merge($data, ['is_active' => true]));

        return back()->with('success', 'Kendaraan ditambahkan.');
    }

    public function update(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'capacity_kg' => ['required', 'numeric', 'min:1', 'max:100000'],
            'is_active' => ['required', 'boolean'],
        ]);

        $vehicle->update($data);

        return back()->with('success', 'Kendaraan diperbarui.');
    }
}
