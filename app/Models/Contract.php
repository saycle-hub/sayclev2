<?php

namespace App\Models;

use App\Domain\Grade;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Contract extends Model
{
    public const GRADES = Grade::ALL;

    public const FREQUENCIES = ['harian', 'mingguan', 'bulanan'];

    public const STATUSES = ['active', 'paused', 'cancelled'];

    protected $fillable = [
        'partner_id',
        'name',
        'status',
        'grade',
        'intended_use',
        'min_capacity_kg',
        'ideal_capacity_kg',
        'max_capacity_kg',
        'frequency',
        'monthly_day',
        'receiving_days',
        'buy_price',
        'sell_price',
        'start_date',
        'end_date',
    ];

    protected function casts(): array
    {
        return [
            'min_capacity_kg' => 'decimal:2',
            'ideal_capacity_kg' => 'decimal:2',
            'max_capacity_kg' => 'decimal:2',
            'buy_price' => 'decimal:2',
            'sell_price' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
            'receiving_days' => 'array',
            'monthly_day' => 'integer',
        ];
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function eligibleOn(CarbonInterface $date): bool
    {
        if ($this->status !== 'active' || ($this->start_date && $date->isBefore($this->start_date)) || ($this->end_date && $date->isAfter($this->end_date))) {
            return false;
        }

        return match ($this->frequency) {
            'harian' => true,
            'mingguan' => in_array(strtolower($date->englishDayOfWeek), array_map('strtolower', is_array($this->receiving_days) ? $this->receiving_days : []), true),
            'bulanan' => $date->day === (int) $this->monthly_day && $this->monthly_day >= 1 && $this->monthly_day <= 28,
            default => false,
        };
    }

    public function eligibleWithin(CarbonInterface $start, CarbonInterface $end): bool
    {
        if ($this->frequency === 'mingguan' && empty($this->receiving_days)) {
            return $this->status === 'active'
                && (! $this->start_date || ! $end->isBefore($this->start_date))
                && (! $this->end_date || ! $start->isAfter($this->end_date));
        }

        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if ($this->eligibleOn($date)) {
                return true;
            }
        }

        return false;
    }
}
