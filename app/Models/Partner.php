<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Partner extends Model
{
    public const OVERCAPACITY_TERMS_VERSION = '2026-08-30';
    protected $fillable = ['user_id', 'name', 'address', 'latitude', 'longitude', 'grade_preference', 'min_capacity_kg', 'ideal_capacity_kg', 'max_capacity_kg', 'frequency', 'delivery_frequency', 'receiving_days', 'delivery_days', 'monthly_receiving_day', 'overcapacity_terms_version', 'overcapacity_terms_accepted_at'];

    protected function casts(): array
    {
        return [
            'min_capacity_kg' => 'decimal:2',
            'latitude' => 'decimal:7', 'longitude' => 'decimal:7',
            'ideal_capacity_kg' => 'decimal:2',
            'max_capacity_kg' => 'decimal:2',
            'receiving_days' => 'array',
            'delivery_days' => 'array',
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

    public function isScheduledForDate(\Carbon\CarbonInterface $date): bool
    {
        if ($this->delivery_frequency === null) {
            return true;
        }

        if ($this->delivery_frequency === 'harian') {
            return true;
        }

        $days = $this->delivery_days ?? ['Monday', 'Thursday'];
        if (empty($days)) {
            return true;
        }

        return in_array(strtolower($date->englishDayOfWeek), array_map('strtolower', (array) $days), true);
    }

    public function dailyIdealKg(?\Carbon\CarbonInterface $date = null): float
    {
        if ($this->delivery_frequency === 'harian') {
            return round((float) $this->ideal_capacity_kg / 7.0, 2);
        }

        return ($date && ! $this->isScheduledForDate($date)) ? 0.0 : (float) $this->ideal_capacity_kg;
    }
}
