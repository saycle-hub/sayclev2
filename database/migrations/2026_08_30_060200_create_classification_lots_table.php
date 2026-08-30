<?php

use App\Domain\Grade;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('classification_lots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pickup_id')->constrained()->cascadeOnDelete();
            $table->string('lot_code')->nullable()->unique();
            $table->string('grade');
            $table->string('intended_use');
            $table->decimal('kg', 10, 2);
            $table->dateTime('classified_at')->nullable();
            $table->foreignId('classified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('label')->nullable();
            $table->string('photo_path')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['grade', 'intended_use']);
        });

        DB::table('pickup_tasks')->whereNotNull('actual_kg')->whereNotNull('grade')->orderBy('id')->each(function ($task) {
            $grade = match ($task->grade) {
                'layak' => Grade::FIT,
                'kurang_layak' => Grade::LESS_FIT,
                'tidak_layak' => Grade::NOT_FIT,
                default => $task->grade,
            };

            DB::table('classification_lots')->insert([
                'pickup_id' => $task->id,
                'lot_code' => 'LOT-'.$task->id,
                'grade' => $grade,
                'intended_use' => Grade::INTENDED_USES[$grade] ?? Grade::INTENDED_USES[Grade::NOT_FIT],
                'kg' => $task->actual_kg,
                'classified_at' => $task->checked_in_at,
                'classified_by' => $task->officer_id,
                'photo_path' => $task->photo_path,
                'created_at' => $task->created_at,
                'updated_at' => $task->updated_at,
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('classification_lots');
    }
};
