<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\PriceController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\StockController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::get('/lapor', [SaleController::class, 'create'])->name('report.create');
Route::post('/lapor', [SaleController::class, 'store'])->middleware('throttle:10,1')->name('report.store');
Route::get('/tracking', [SaleController::class, 'tracking'])->name('tracking.create');
Route::post('/tracking/show', [SaleController::class, 'show'])->middleware('throttle:5,1')->name('tracking.show');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [StockController::class, 'dashboard'])->middleware('role:admin')->name('dashboard');

    Route::middleware('role:admin')->group(function () {
        Route::get('stock', [StockController::class, 'index'])->name('stock.index');
        Route::get('stock/adjust', fn () => Inertia::render('stock/adjust'))->name('stock.adjust.create');
        Route::post('stock/adjust', [StockController::class, 'adjust'])->name('stock.adjust');
        Route::get('prices', [PriceController::class, 'index'])->name('prices.index');
        Route::post('prices', [PriceController::class, 'update'])->name('prices.update');

        // Safe stubs for modules shipped in later phases, so admin nav never 404s.
        $stubs = [
            'partners' => 'Mitra',
            'contracts' => 'Kontrak',
            'routes' => 'Rute',
            'tasks' => 'Tugas',
            'stats' => 'Statistik',
        ];
        foreach ($stubs as $path => $module) {
            Route::get($path, fn () => Inertia::render('coming-soon', ['module' => $module]))->name("admin.{$path}");
        }
    });
    Route::get('officer', fn () => Inertia::render('officer/index'))->middleware('role:officer')->name('officer');
    Route::get('partner', fn () => Inertia::render('partner/index'))->middleware('role:partner')->name('partner');
    Route::middleware('role:officer')->prefix('officer')->group(function () { foreach (['tasks', 'routes', 'weighing'] as $page) Route::get($page, fn () => Inertia::render('officer/index')); });
    Route::middleware('role:partner')->prefix('partner')->group(function () { foreach (['deliveries', 'contract', 'billing'] as $page) Route::get($page, fn () => Inertia::render('partner/index')); });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
