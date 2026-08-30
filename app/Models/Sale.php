<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    public function pickupTasks(): HasMany
    {
        return $this->hasMany(PickupTask::class);
    }

    protected $fillable = [
        'contact', 'estimate_kg', 'location_consent', 'manual_address', 'latitude', 'longitude',
    ];

    protected $casts = [
        'location_consent' => 'boolean',
        'estimate_kg' => 'decimal:2',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];
}
