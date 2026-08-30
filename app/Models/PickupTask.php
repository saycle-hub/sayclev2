<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PickupTask extends Model
{
    public const STATUSES = ['pending', 'assigned', 'in_progress', 'done'];

    protected $fillable = [
        'sale_id',
        'vehicle_id',
        'officer_id',
        'stop_order',
        'status',
        'estimated_kg',
        'distance_m',
        'duration_s',
        'actual_kg',
        'grade',
        'photo_path',
        'checkin_lat',
        'checkin_lng',
        'checked_in_at',
    ];

    protected function casts(): array
    {
        return [
            'estimated_kg' => 'decimal:2',
            'distance_m' => 'decimal:2',
            'duration_s' => 'integer',
            'actual_kg' => 'decimal:2',
            'checkin_lat' => 'decimal:7',
            'checkin_lng' => 'decimal:7',
            'checked_in_at' => 'datetime',
        ];
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function officer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'officer_id');
    }
}
