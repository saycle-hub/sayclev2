<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class DeliveryTrip extends Model {
    protected $fillable = ['delivery_id','vehicle_id','officer_id','scheduled_for','stop_order','planned_kg','status','estimation_source'];
    protected function casts(): array { return ['scheduled_for'=>'datetime','planned_kg'=>'decimal:2']; }
    public function delivery(): BelongsTo { return $this->belongsTo(Delivery::class); }
    public function vehicle(): BelongsTo { return $this->belongsTo(Vehicle::class); }
    public function officer(): BelongsTo { return $this->belongsTo(User::class, 'officer_id'); }
    public function lines() { return $this->hasMany(DeliveryTripLine::class, 'trip_id'); }
}
