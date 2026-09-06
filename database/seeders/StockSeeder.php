<?php

namespace Database\Seeders;

use App\Domain\Grade;
use App\Models\Stock;
use Illuminate\Database\Seeder;

class StockSeeder extends Seeder
{
    public function run(): void
    {
        $stocks = [
            [
                'grade' => Grade::FIT,
                'kg' => 1500.00,
                'type' => 'in',
                'description' => 'Penerimaan Stok Awal Sayur Layak (Pakan Ternak)',
            ],
            [
                'grade' => Grade::LESS_FIT,
                'kg' => 2200.00,
                'type' => 'in',
                'description' => 'Penerimaan Stok Awal Sayur Kurang Layak (Maggot BSF)',
            ],
            [
                'grade' => Grade::NOT_FIT,
                'kg' => 3500.00,
                'type' => 'in',
                'description' => 'Penerimaan Stok Awal Limbah Organik Tidak Layak (Kompos)',
            ],
            [
                'grade' => Grade::FIT,
                'kg' => 300.00,
                'type' => 'out',
                'description' => 'Pengeluaran Stok untuk Delivery Peternakan Sumber Makmur',
            ],
            [
                'grade' => Grade::NOT_FIT,
                'kg' => 500.00,
                'type' => 'out',
                'description' => 'Pengeluaran Stok untuk Delivery PT Composter Nusantara',
            ],
        ];

        foreach ($stocks as $stockData) {
            Stock::create($stockData);
        }
    }
}
