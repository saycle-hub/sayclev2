<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('supplier_reports', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 32)->unique();
            $table->string('contact_name');
            $table->string('phone', 32)->nullable();
            $table->decimal('estimated_kg', 10, 2);
            $table->string('photo_path');
            $table->boolean('location_consent');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->text('manual_address')->nullable();
            $table->string('status')->default('submitted')->index();
            $table->string('pin_hash');
            $table->timestamps();
            $table->index(['latitude', 'longitude']);
        });

        DB::table('sales')->orderBy('id')->each(function ($sale) {
            DB::table('supplier_reports')->insert([
                'id' => $sale->id,
                'public_id' => $sale->public_id,
                'contact_name' => $sale->contact,
                'phone' => $sale->phone,
                'estimated_kg' => $sale->estimate_kg,
                'photo_path' => $sale->photo_path,
                'location_consent' => $sale->location_consent,
                'latitude' => $sale->latitude,
                'longitude' => $sale->longitude,
                'manual_address' => $sale->manual_address,
                'status' => match ($sale->status) {
                    'accepted' => 'accepted',
                    'scheduled' => 'pickup_scheduled',
                    'weighed', 'paid' => 'picked_up',
                    default => 'submitted',
                },
                'pin_hash' => $sale->pin_hash,
                'created_at' => $sale->created_at,
                'updated_at' => $sale->updated_at,
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_reports');
    }
};
