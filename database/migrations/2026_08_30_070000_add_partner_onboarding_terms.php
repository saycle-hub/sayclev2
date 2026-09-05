<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void { Schema::table('partners', function (Blueprint $table) { $table->json('receiving_days')->nullable(); $table->string('overcapacity_terms_version')->nullable(); $table->timestamp('overcapacity_terms_accepted_at')->nullable(); }); }
 public function down(): void { Schema::table('partners', fn (Blueprint $table) => $table->dropColumn(['receiving_days', 'overcapacity_terms_version', 'overcapacity_terms_accepted_at'])); }
};
