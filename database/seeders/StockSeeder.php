<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class StockSeeder extends Seeder
{
    public function run(): void
    {
        // Warehouse stock now lives strictly in the immutable warehouse ledger (WarehouseMutation)
        // originating only from actual pickup check-ins and classification lots.
    }
}
