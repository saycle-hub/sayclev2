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
        'partner_id',
        'public_id',
        'contact_name',
        'phone',
        'address',
        'estimated_kg',
        'status',
        'latitude',
        'longitude',
        'contact',
        'estimate_kg',
        'location_consent',
        'manual_address',
    ];

    protected $casts = [
        'location_consent' => 'boolean',
        'estimate_kg' => 'decimal:2',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];
}
