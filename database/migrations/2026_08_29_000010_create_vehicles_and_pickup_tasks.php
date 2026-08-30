<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('capacity_kg', 10, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('pickup_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('officer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('stop_order')->default(0);
            $table->string('status')->default('pending'); // pending, assigned, in_progress, done
            $table->decimal('estimated_kg', 10, 2)->nullable();
            // Per-leg approach estimates: from previous point (depot or stop) into this stop.
            $table->decimal('distance_m', 12, 2)->nullable();
            $table->unsignedInteger('duration_s')->nullable();
            $table->timestamps();

            $table->index(['vehicle_id', 'stop_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pickup_tasks');
        Schema::dropIfExists('vehicles');
    }
};
