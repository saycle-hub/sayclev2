<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pickup_tasks', function (Blueprint $table) {
            $table->decimal('actual_kg', 10, 2)->nullable()->after('estimated_kg');
            $table->string('grade')->nullable()->after('actual_kg'); // layak, kurang_layak, tidak_layak
            $table->string('photo_path')->nullable()->after('grade');
            $table->decimal('checkin_lat', 10, 7)->nullable()->after('photo_path');
            $table->decimal('checkin_lng', 10, 7)->nullable()->after('checkin_lat');
            $table->timestamp('checked_in_at')->nullable()->after('checkin_lng');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pickup_tasks', function (Blueprint $table) {
            $table->dropColumn(['actual_kg', 'grade', 'photo_path', 'checkin_lat', 'checkin_lng', 'checked_in_at']);
        });
    }
};
