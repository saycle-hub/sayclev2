<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pickup extends Model
{
    use HasFactory;

    public const STATUSES = ['planned', 'assigned', 'in_progress', 'completed', 'cancelled'];

    protected $fillable = ['supplier_report_id', 'vehicle_id', 'officer_id', 'scheduled_for', 'stop_order', 'status', 'estimated_kg', 'actual_total_kg', 'distance_m', 'duration_s', 'photo_path', 'checkin_lat', 'checkin_lng', 'checked_in_at', 'completed_at'];

    protected function casts(): array
    {
        return ['scheduled_for' => 'datetime', 'estimated_kg' => 'decimal:2', 'actual_total_kg' => 'decimal:2', 'distance_m' => 'decimal:2', 'duration_s' => 'integer', 'checkin_lat' => 'decimal:7', 'checkin_lng' => 'decimal:7', 'checked_in_at' => 'datetime', 'completed_at' => 'datetime'];
    }

    public function supplierReport(): BelongsTo
    {
        return $this->belongsTo(SupplierReport::class);
    }

    public function vehicle(): BelongsTo { return $this->belongsTo(Vehicle::class); }
    public function officer(): BelongsTo { return $this->belongsTo(User::class, 'officer_id'); }

    public function lots(): HasMany
    {
        return $this->hasMany(ClassificationLot::class);
    }
}
