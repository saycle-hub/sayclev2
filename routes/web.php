<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\AllocationController;
use App\Http\Controllers\ContractController;
use App\Http\Controllers\PartnerController;
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

        // Partner & contract management (Fase 3).
        Route::get('partners', [PartnerController::class, 'index'])->name('partners.index');
        Route::get('partners/create', [PartnerController::class, 'create'])->name('partners.create');
        Route::post('partners', [PartnerController::class, 'store'])->name('partners.store');
        Route::get('partners/{partner}', [PartnerController::class, 'show'])->name('partners.show');
        Route::get('partners/{partner}/edit', [PartnerController::class, 'edit'])->name('partners.edit');
        Route::put('partners/{partner}', [PartnerController::class, 'update'])->name('partners.update');
        Route::delete('partners/{partner}', [PartnerController::class, 'destroy'])->name('partners.destroy');
        Route::post('partners/{partner}/contracts', [ContractController::class, 'store'])->name('partners.contracts.store');
        Route::get('contracts', [ContractController::class, 'index'])->name('contracts.index');
        Route::put('contracts/{contract}', [ContractController::class, 'update'])->name('contracts.update');
        Route::post('contracts/{contract}/action', [ContractController::class, 'action'])->name('contracts.action');

        // Allocation engine (Fase 4).
        Route::get('allocation', [AllocationController::class, 'index'])->name('allocation.index');
        Route::post('allocation/run', [AllocationController::class, 'run'])->name('allocation.run');
        Route::get('allocation/{grade}', [AllocationController::class, 'show'])->where('grade', 'Layak|Kurang Layak|Tidak Layak')->name('allocation.show');
        Route::post('allocation/{allocation}/approve', [AllocationController::class, 'approve'])->name('allocation.approve');
        Route::post('allocation/{allocation}/reject', [AllocationController::class, 'reject'])->name('allocation.reject');

        // Safe stubs for modules shipped in later phases, so admin nav never 404s.
        $stubs = [
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
