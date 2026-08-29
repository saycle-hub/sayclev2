<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Partner extends Model
{
    protected $fillable = ['user_id', 'name', 'address', 'grade_preference', 'min_capacity_kg', 'ideal_capacity_kg', 'max_capacity_kg', 'frequency'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
