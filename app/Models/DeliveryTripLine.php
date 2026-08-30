<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class DeliveryTripLine extends Model { public $timestamps=false; protected $fillable=['trip_id','delivery_line_id','planned_kg']; protected function casts():array{return ['planned_kg'=>'decimal:2'];} public function trip(){return $this->belongsTo(DeliveryTrip::class,'trip_id');} public function deliveryLine(){return $this->belongsTo(DeliveryLine::class,'delivery_line_id');} }
