<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryLine extends Model
{
    use HasFactory;

    protected $fillable = ['delivery_id', 'reservation_id', 'grade', 'intended_use', 'kg', 'unit_price_snapshot', 'total_amount_snapshot'];

    protected function casts(): array
    {
        return ['kg' => 'decimal:2', 'unit_price_snapshot' => 'decimal:2', 'total_amount_snapshot' => 'decimal:2'];
    }

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(Delivery::class);
    }
    public function reservation(): BelongsTo { return $this->belongsTo(Reservation::class); }
}
