<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Contract extends Model
{
    public const GRADES = ['Layak', 'Kurang Layak', 'Tidak Layak'];

    public const FREQUENCIES = ['harian', 'mingguan', 'bulanan'];

    public const STATUSES = ['active', 'paused', 'cancelled'];

    protected $fillable = [
        'partner_id',
        'name',
        'status',
        'grade',
        'min_capacity_kg',
        'ideal_capacity_kg',
        'max_capacity_kg',
        'frequency',
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
        ];
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }
}
