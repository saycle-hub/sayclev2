<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('partners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('address');
            $table->string('grade_preference')->nullable();
            $table->decimal('min_capacity_kg', 10, 2);
            $table->decimal('ideal_capacity_kg', 10, 2);
            $table->decimal('max_capacity_kg', 10, 2);
            $table->enum('frequency', ['harian', 'mingguan', 'bulanan']);
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('partners'); }
};
