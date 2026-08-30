<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contract_id')->nullable()->constrained()->nullOnDelete();
            $table->string('grade');
            $table->decimal('allocated_kg', 10, 2);
            $table->string('allocation_type'); // minimum, ideal, surplus, overcapacity
            $table->string('status')->default('pending'); // pending, approved, rejected
            $table->date('week_start');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['grade', 'week_start']);
            $table->index(['partner_id', 'week_start']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('allocations');
    }
};
