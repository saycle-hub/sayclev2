<?php

use App\Domain\Grade;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('allocations', function (Blueprint $table) {
            $table->string('source_grade')->nullable()->after('grade');
            $table->string('intended_use')->nullable()->after('source_grade');
            $table->date('period_start')->nullable()->after('week_start');
            $table->date('period_end')->nullable()->after('period_start');
        });

        DB::table('allocations')->orderBy('id')->each(function ($allocation) {
            $start = $allocation->week_start;
            DB::table('allocations')->where('id', $allocation->id)->update([
                'source_grade' => $allocation->grade,
                'intended_use' => Grade::INTENDED_USES[$allocation->grade] ?? Grade::INTENDED_USES[Grade::NOT_FIT],
                'period_start' => $start,
                'period_end' => $start ? now()->parse($start)->addDays(6)->toDateString() : null,
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('allocations', function (Blueprint $table) {
            $table->dropColumn(['source_grade', 'intended_use', 'period_start', 'period_end']);
        });
    }
};
