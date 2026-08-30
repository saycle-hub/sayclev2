<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('allocation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('classification_lot_id')->nullable()->constrained()->nullOnDelete();
            $table->string('grade');
            $table->string('intended_use');
            $table->decimal('reserved_kg', 10, 2);
            $table->string('status')->default('reserved')->index();
            $table->dateTime('reserved_at');
            $table->dateTime('released_at')->nullable();
            $table->timestamps();
            $table->unique(['allocation_id', 'classification_lot_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
