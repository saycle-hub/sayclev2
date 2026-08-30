<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    protected $fillable = ['name', 'capacity_kg', 'is_active'];

    protected function casts(): array
    {
        return [
            'capacity_kg' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function pickupTasks(): HasMany
    {
        return $this->hasMany(PickupTask::class);
    }

    public function deliveryTrips(): HasMany { return $this->hasMany(DeliveryTrip::class); }
}
