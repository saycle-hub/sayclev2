<?php

use App\Domain\Grade;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('warehouse_mutations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('classification_lot_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('delivery_id')->nullable();
            $table->string('grade');
            $table->string('intended_use')->nullable();
            $table->string('type');
            $table->decimal('kg', 10, 2);
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('occurred_at');
            $table->text('description')->nullable();
            $table->timestamps();
            $table->index(['grade', 'occurred_at']);
        });

        DB::table('stocks')->orderBy('id')->each(function ($stock) {
            $intendedUse = Grade::INTENDED_USES[$stock->grade] ?? null;
            $type = match ($stock->type) {
                'in' => 'receipt',
                'out' => 'stock_out',
                default => 'adjustment',
            };

            DB::table('warehouse_mutations')->insert([
                'grade' => $stock->grade,
                'intended_use' => $intendedUse,
                'type' => $type,
                'kg' => abs((float) $stock->kg),
                'reference_type' => 'legacy_stock',
                'reference_id' => $stock->id,
                'occurred_at' => $stock->created_at,
                'description' => $stock->description,
                'created_at' => $stock->created_at,
                'updated_at' => $stock->updated_at,
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_mutations');
    }
};
