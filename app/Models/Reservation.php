<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reservation extends Model
{
    use HasFactory;

    public const STATUSES = ['reserved', 'partially_delivered', 'fulfilled', 'released', 'cancelled'];

    protected $fillable = ['allocation_id', 'classification_lot_id', 'grade', 'intended_use', 'reserved_kg', 'status', 'reserved_at', 'released_at'];

    protected function casts(): array
    {
        return ['reserved_kg' => 'decimal:2', 'reserved_at' => 'datetime', 'released_at' => 'datetime'];
    }

    public function allocation(): BelongsTo
    {
        return $this->belongsTo(Allocation::class);
    }

    public function classificationLot(): BelongsTo { return $this->belongsTo(ClassificationLot::class); }
}
