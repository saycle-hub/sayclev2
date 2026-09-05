<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void { Schema::create('delivery_contracts',function(Blueprint $t){$t->foreignId('delivery_id')->constrained()->restrictOnDelete();$t->foreignId('contract_id')->constrained()->restrictOnDelete();$t->unique(['delivery_id','contract_id']);}); Schema::create('delivery_trip_lines',function(Blueprint $t){$t->id();$t->foreignId('trip_id')->constrained('delivery_trips')->restrictOnDelete();$t->foreignId('delivery_line_id')->constrained()->restrictOnDelete();$t->decimal('planned_kg',10,2);$t->unique(['trip_id','delivery_line_id']);}); }
 public function down(): void { Schema::dropIfExists('delivery_trip_lines');Schema::dropIfExists('delivery_contracts'); }
};
