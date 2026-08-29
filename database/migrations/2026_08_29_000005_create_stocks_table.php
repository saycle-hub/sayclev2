<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stocks', function (Blueprint $table) {
            $table->id();
            $table->enum('grade', ['Layak', 'Kurang Layak', 'Tidak Layak']);
            $table->decimal('kg', 10, 2);
            $table->enum('type', ['in', 'out', 'adjust']);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['grade', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stocks');
    }
};
