<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->string('delivery_frequency')->nullable()->after('status'); // harian | mingguan
            $table->json('delivery_days')->nullable()->after('delivery_frequency'); // e.g. ["Monday", "Thursday"] or [1, 4]
        });

        Schema::table('partners', function (Blueprint $table) {
            $table->string('delivery_frequency')->nullable()->after('max_capacity_kg'); // harian | mingguan
            $table->json('delivery_days')->nullable()->after('delivery_frequency');
        });

        Schema::table('allocations', function (Blueprint $table) {
            $table->date('allocation_date')->nullable()->after('week_start');
            $table->index(['grade', 'allocation_date']);
            $table->index(['partner_id', 'allocation_date']);
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropColumn(['delivery_frequency', 'delivery_days']);
        });

        Schema::table('partners', function (Blueprint $table) {
            $table->dropColumn(['delivery_frequency', 'delivery_days']);
        });

        Schema::table('allocations', function (Blueprint $table) {
            $table->dropIndex(['grade', 'allocation_date']);
            $table->dropIndex(['partner_id', 'allocation_date']);
            $table->dropColumn('allocation_date');
        });
    }
};
