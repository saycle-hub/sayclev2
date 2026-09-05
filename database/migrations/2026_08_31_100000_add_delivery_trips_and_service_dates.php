<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
    public function up(): void {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->date('service_date')->nullable()->after('partner_id');
        });
        DB::statement('UPDATE deliveries SET service_date = DATE(scheduled_for)');
        Schema::table('deliveries', fn (Blueprint $table) => $table->date('service_date')->nullable(false)->change());
        Schema::create('delivery_trips', function (Blueprint $table) {
            $table->id(); $table->foreignId('delivery_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('officer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('scheduled_for')->nullable(); $table->unsignedInteger('stop_order')->default(1);
            $table->decimal('planned_kg', 10, 2)->default(0); $table->string('status')->default('planned')->index();
            $table->string('estimation_source')->nullable(); $table->timestamps();
            $table->index(['delivery_id', 'stop_order']);
        });
    }
    public function down(): void { Schema::dropIfExists('delivery_trips'); Schema::table('deliveries', fn (Blueprint $table) => $table->dropColumn('service_date')); }
};
