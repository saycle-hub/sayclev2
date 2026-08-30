<?php

use App\Domain\Grade;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::table('partners')->orderBy('id')->each(function ($partner) {
            $exists = DB::table('contracts')->where('partner_id', $partner->id)->exists();

            if (! $exists) {
                $grade = $partner->grade_preference ?: Grade::NOT_FIT;
                DB::table('contracts')->insert([
                    'partner_id' => $partner->id,
                    'name' => $partner->name.' contract',
                    'status' => 'active',
                    'grade' => $grade,
                    'intended_use' => Grade::INTENDED_USES[$grade] ?? Grade::INTENDED_USES[Grade::NOT_FIT],
                    'min_capacity_kg' => $partner->min_capacity_kg,
                    'ideal_capacity_kg' => $partner->ideal_capacity_kg,
                    'max_capacity_kg' => $partner->max_capacity_kg,
                    'frequency' => $partner->frequency,
                    'receiving_days' => json_encode(['monday']),
                    'buy_price' => 0,
                    'sell_price' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });
    }

    public function down(): void
    {
    }
};
