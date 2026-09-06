<?php

namespace Database\Seeders;

use App\Domain\Grade;
use App\Models\Price;
use Illuminate\Database\Seeder;

class PriceSeeder extends Seeder
{
    public function run(): void
    {
        $prices = [
            [
                'grade' => Grade::FIT,
                'buy_price' => 1500.00,
                'sell_price' => 2500.00,
            ],
            [
                'grade' => Grade::LESS_FIT,
                'buy_price' => 1000.00,
                'sell_price' => 1800.00,
            ],
            [
                'grade' => Grade::NOT_FIT,
                'buy_price' => 500.00,
                'sell_price' => 1000.00,
            ],
        ];

        foreach ($prices as $priceData) {
            Price::updateOrCreate(
                ['grade' => $priceData['grade']],
                $priceData
            );
        }
    }
}
