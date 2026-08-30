<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contract_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('planned')->index();
            $table->dateTime('scheduled_for')->nullable();
            $table->dateTime('delivered_at')->nullable();
            $table->string('received_by')->nullable();
            $table->string('proof_path')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('delivery_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reservation_id')->nullable()->constrained()->nullOnDelete();
            $table->string('grade');
            $table->string('intended_use');
            $table->decimal('kg', 10, 2);
            $table->decimal('unit_price_snapshot', 12, 2)->nullable();
            $table->decimal('total_amount_snapshot', 12, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_lines');
        Schema::dropIfExists('deliveries');
    }
};
