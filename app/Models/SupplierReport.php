<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierReport extends Model
{
    use HasFactory;

    public const STATUSES = ['submitted', 'under_review', 'accepted', 'rejected', 'pickup_scheduled', 'picked_up', 'closed'];

    protected $fillable = ['public_id', 'contact_name', 'phone', 'estimated_kg', 'photo_path', 'location_consent', 'latitude', 'longitude', 'manual_address', 'status', 'pin_hash'];

    protected function casts(): array
    {
        return ['estimated_kg' => 'decimal:2', 'location_consent' => 'boolean', 'latitude' => 'decimal:7', 'longitude' => 'decimal:7'];
    }

    public function pickups(): HasMany
    {
        return $this->hasMany(Pickup::class);
    }
}
