<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Allocation extends Model
{
    public const TYPES = ['minimum', 'ideal', 'surplus', 'overcapacity'];

    public const STATUSES = ['pending', 'approved', 'rejected'];

    protected $fillable = [
        'partner_id',
        'contract_id',
        'grade',
        'allocated_kg',
        'allocation_type',
        'status',
        'week_start',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'allocated_kg' => 'decimal:2',
            'week_start' => 'date',
        ];
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }
}
