<?php

namespace App\Models;

use App\Domain\Grade;
use Illuminate\Database\Eloquent\Model;

class Price extends Model
{
    public const GRADES = Grade::ALL;

    protected $fillable = [
        'grade',
        'buy_price',
        'sell_price',
    ];

    protected function casts(): array
    {
        return [
            'buy_price' => 'decimal:2',
            'sell_price' => 'decimal:2',
        ];
    }
}
