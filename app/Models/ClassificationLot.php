<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassificationLot extends Model
{
    use HasFactory;

    protected $fillable = ['pickup_id', 'lot_code', 'grade', 'intended_use', 'kg', 'classified_at', 'classified_by', 'label', 'photo_path', 'notes'];

    protected function casts(): array
    {
        return ['kg' => 'decimal:2', 'classified_at' => 'datetime'];
    }

    public function pickup(): BelongsTo
    {
        return $this->belongsTo(Pickup::class);
    }

    public function mutations(): HasMany
    {
        return $this->hasMany(WarehouseMutation::class);
    }
}
