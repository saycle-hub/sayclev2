<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pickups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('officer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('scheduled_for')->nullable();
            $table->unsignedInteger('stop_order')->default(1);
            $table->string('status')->default('planned')->index();
            $table->decimal('estimated_kg', 10, 2)->nullable();
            $table->decimal('actual_total_kg', 10, 2)->nullable();
            $table->decimal('distance_m', 10, 2)->nullable();
            $table->unsignedInteger('duration_s')->nullable();
            $table->string('photo_path')->nullable();
            $table->decimal('checkin_lat', 10, 7)->nullable();
            $table->decimal('checkin_lng', 10, 7)->nullable();
            $table->dateTime('checked_in_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->timestamps();
        });

        DB::table('pickup_tasks')->orderBy('id')->each(function ($task) {
            DB::table('pickups')->insert([
                'id' => $task->id,
                'supplier_report_id' => $task->sale_id,
                'vehicle_id' => $task->vehicle_id,
                'officer_id' => $task->officer_id,
                'stop_order' => $task->stop_order ?? 1,
                'status' => match ($task->status) {
                    'assigned' => 'assigned',
                    'in_progress' => 'in_progress',
                    'done' => 'completed',
                    default => 'planned',
                },
                'estimated_kg' => $task->estimated_kg,
                'actual_total_kg' => $task->actual_kg,
                'distance_m' => $task->distance_m,
                'duration_s' => $task->duration_s,
                'photo_path' => $task->photo_path,
                'checkin_lat' => $task->checkin_lat,
                'checkin_lng' => $task->checkin_lng,
                'checked_in_at' => $task->checked_in_at,
                'completed_at' => $task->checked_in_at,
                'created_at' => $task->created_at,
                'updated_at' => $task->updated_at,
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pickups');
    }
};
