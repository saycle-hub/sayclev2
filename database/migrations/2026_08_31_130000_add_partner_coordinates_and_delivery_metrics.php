<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void { Schema::table('partners', function(Blueprint $t){$t->decimal('latitude',10,7)->nullable()->index();$t->decimal('longitude',10,7)->nullable()->index();}); Schema::table('delivery_trips', function(Blueprint $t){$t->decimal('distance_m',12,2)->nullable();$t->unsignedInteger('duration_s')->nullable();$t->index(['status','scheduled_for']);}); }
 public function down(): void { Schema::table('delivery_trips',fn(Blueprint $t)=>$t->dropIndex(['status','scheduled_for'])); Schema::table('delivery_trips',fn(Blueprint $t)=>$t->dropColumn(['distance_m','duration_s'])); Schema::table('partners',fn(Blueprint $t)=>$t->dropColumn(['latitude','longitude'])); }
};
