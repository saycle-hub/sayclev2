<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Price extends Model
{
    public const GRADES = ['Layak', 'Kurang Layak', 'Tidak Layak'];

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
