<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('contracts', fn (Blueprint $table) => $table->unsignedTinyInteger('monthly_day')->nullable()->after('frequency'));
        Schema::table('partners', fn (Blueprint $table) => $table->unsignedTinyInteger('monthly_receiving_day')->nullable()->after('frequency'));
    }

    public function down(): void
    {
        Schema::table('contracts', fn (Blueprint $table) => $table->dropColumn('monthly_day'));
        Schema::table('partners', fn (Blueprint $table) => $table->dropColumn('monthly_receiving_day'));
    }
};
