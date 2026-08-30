<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('financial_lines', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('direction');
            $table->foreignId('supplier_report_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('pickup_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('delivery_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('contract_id')->nullable()->constrained()->nullOnDelete();
            $table->string('grade')->nullable();
            $table->string('intended_use')->nullable();
            $table->decimal('kg', 10, 2)->nullable();
            $table->decimal('unit_price', 12, 2)->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('IDR');
            $table->string('status')->default('draft')->index();
            $table->dateTime('due_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
            $table->index(['type', 'direction']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_lines');
    }
};
