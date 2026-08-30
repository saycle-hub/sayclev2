<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Delivery extends Model
{
    use HasFactory;

    public const STATUSES = ['planned', 'assigned', 'in_transit', 'delivered', 'failed', 'cancelled'];

    protected $fillable = ['partner_id', 'contract_id', 'service_date', 'status', 'scheduled_for', 'delivered_at', 'received_by', 'proof_path', 'notes'];

    protected function casts(): array
    {
        return ['service_date' => 'date', 'scheduled_for' => 'datetime', 'delivered_at' => 'datetime'];
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(DeliveryLine::class);
    }

    public function trips(): HasMany { return $this->hasMany(DeliveryTrip::class); }
    public function contracts() { return $this->belongsToMany(Contract::class, 'delivery_contracts'); }
}
