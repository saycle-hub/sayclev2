<?php

use App\Domain\Grade;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->json('receiving_days')->nullable()->after('frequency');
            $table->string('intended_use')->nullable()->after('grade');
        });

        DB::table('contracts')->orderBy('id')->each(function ($contract) {
            DB::table('contracts')->where('id', $contract->id)->update([
                'intended_use' => Grade::INTENDED_USES[$contract->grade] ?? Grade::INTENDED_USES[Grade::NOT_FIT],
                'receiving_days' => json_encode(['monday']),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropColumn(['receiving_days', 'intended_use']);
        });
    }
};
