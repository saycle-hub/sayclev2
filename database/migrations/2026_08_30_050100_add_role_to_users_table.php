<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Schema gap fix: the create_users_table migration was amended (in
 * c2f00ad) to include the role enum after this database had already
 * run it, so existing installs never received the column. The auth
 * flow (login redirect, role middleware) depends on it.
 */
return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasColumn('users', 'role')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'officer', 'partner'])->default('admin')->after('password');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('role');
            });
        }
    }
};
