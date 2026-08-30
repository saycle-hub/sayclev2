<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Additive schema gap fix: the Sale model, OfficerController, and Phase 6
 * feature tests already reference partner_id/contact_name/phone/address/
 * estimated_kg on sales, but the original create_sales_table migration
 * (public intake flow) never had them. Public intake columns (`contact`,
 * `estimate_kg`) remain untouched.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('partner_id')->nullable()->after('public_id')->constrained('partners')->nullOnDelete();
            $table->string('contact_name')->nullable()->after('partner_id');
            $table->string('phone', 32)->nullable()->after('contact_name');
            $table->text('address')->nullable()->after('phone');
            $table->decimal('estimated_kg', 10, 2)->nullable()->after('address');
            $table->index('partner_id');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropIndex(['partner_id']);
            $table->dropConstrainedForeignId('partner_id');
            $table->dropColumn(['contact_name', 'phone', 'address', 'estimated_kg']);
        });
    }
};
