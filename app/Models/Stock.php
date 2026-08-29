<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Stock extends Model
{
    public const GRADES = ['Layak', 'Kurang Layak', 'Tidak Layak'];

    public const TYPES = ['in', 'out', 'adjust'];

    protected $fillable = [
        'grade',
        'kg',
        'type',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'kg' => 'decimal:2',
        ];
    }

    /**
     * Signed contribution of this entry to the running stock total.
     * `in` adds, `out` subtracts, `adjust` stores an explicit signed delta.
     */
    public function signedKg(): float
    {
        return match ($this->type) {
            'in' => (float) $this->kg,
            'out' => -(float) $this->kg,
            default => (float) $this->kg, // adjust rows carry their own sign
        };
    }

    public static function signedTotalSql(): string
    {
        return "SUM(CASE WHEN type = 'out' THEN -kg ELSE kg END)";
    }
}
