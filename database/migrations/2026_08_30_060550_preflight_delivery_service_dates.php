<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
 public function up(): void { if(DB::table('deliveries')->whereNull('scheduled_for')->exists()) throw new RuntimeException('Delivery migration blocked: every existing delivery needs scheduled_for.'); if(DB::table('deliveries')->select('partner_id',DB::raw('DATE(scheduled_for) as service_date'))->groupBy('partner_id',DB::raw('DATE(scheduled_for)'))->havingRaw('COUNT(*) > 1')->exists()) throw new RuntimeException('Delivery migration blocked: duplicate partner/service dates exist.'); }
 public function down(): void {}
};
