<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pickups', function (Blueprint $table) {
            $table->text('refusal_reason')->nullable()->after('completed_at');
            $table->dateTime('rejected_at')->nullable()->after('refusal_reason');
            $table->string('rejection_photo_path')->nullable()->after('rejected_at');
            $table->string('completion_payload_hash', 64)->nullable()->after('rejection_photo_path');
        });
        Schema::table('classification_lots', fn (Blueprint $table) => $table->unique(['pickup_id', 'grade']));
        Schema::table('warehouse_mutations', function (Blueprint $table) {
            $table->unique(['classification_lot_id', 'type', 'reference_type', 'reference_id'], 'warehouse_receipt_operation_unique');
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_mutations', fn (Blueprint $table) => $table->dropUnique('warehouse_receipt_operation_unique'));
        Schema::table('classification_lots', fn (Blueprint $table) => $table->dropUnique(['pickup_id', 'grade']));
        Schema::table('pickups', function (Blueprint $table) {
            $table->dropColumn(['refusal_reason', 'rejected_at', 'rejection_photo_path', 'completion_payload_hash']);
        });
    }
};
