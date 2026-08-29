<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
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
