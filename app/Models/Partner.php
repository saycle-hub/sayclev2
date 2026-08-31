<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Partner extends Model
{
    public const OVERCAPACITY_TERMS_VERSION = '2026-08-30';
    protected $fillable = ['user_id', 'name', 'address', 'latitude', 'longitude', 'grade_preference', 'min_capacity_kg', 'ideal_capacity_kg', 'max_capacity_kg', 'frequency', 'receiving_days', 'monthly_receiving_day', 'overcapacity_terms_version', 'overcapacity_terms_accepted_at'];

    protected function casts(): array
    {
        return [
            'min_capacity_kg' => 'decimal:2',
            'latitude' => 'decimal:7', 'longitude' => 'decimal:7',
            'ideal_capacity_kg' => 'decimal:2',
            'max_capacity_kg' => 'decimal:2',
            'receiving_days' => 'array',
            'monthly_receiving_day' => 'integer',
            'overcapacity_terms_accepted_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class);
    }
}
