<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void { Schema::table('deliveries',fn(Blueprint $t)=>$t->unique(['partner_id','service_date'])); }
 public function down(): void { Schema::table('deliveries',fn(Blueprint $t)=>$t->dropUnique(['partner_id','service_date'])); }
};
