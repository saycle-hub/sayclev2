<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WarehouseMutation extends Model
{
    use HasFactory;

    public const TYPES = ['receipt', 'stock_out', 'adjustment'];

    protected $fillable = ['classification_lot_id', 'delivery_id', 'grade', 'intended_use', 'type', 'kg', 'reference_type', 'reference_id', 'performed_by', 'occurred_at', 'description'];

    protected function casts(): array
    {
        return ['kg' => 'decimal:2', 'occurred_at' => 'datetime'];
    }
}
