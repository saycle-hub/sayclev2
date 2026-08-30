<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $duplicates = DB::table('pickups')->select('supplier_report_id')->whereNotNull('supplier_report_id')->groupBy('supplier_report_id')->havingRaw('COUNT(*) > 1')->pluck('supplier_report_id');
        if ($duplicates->isNotEmpty()) {
            throw new RuntimeException('Cannot add unique supplier_report_id constraint: duplicate pickup records exist for IDs '.$duplicates->implode(', ').'. Resolve duplicates before migrating.');
        }
        Schema::table('pickups', fn (Blueprint $table) => $table->unique('supplier_report_id'));
    }
    public function down(): void { Schema::table('pickups', fn (Blueprint $table) => $table->dropUnique(['supplier_report_id'])); }
};
