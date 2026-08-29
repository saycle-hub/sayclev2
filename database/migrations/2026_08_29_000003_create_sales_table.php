<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id(); $table->string('public_id', 32)->unique(); $table->string('contact');
            $table->decimal('estimate_kg', 10, 2); $table->boolean('location_consent');
            $table->text('manual_address')->nullable(); $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable(); $table->string('photo_path');
            $table->string('pin_hash'); $table->string('status')->default('Pending review'); $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('sales'); }
};
