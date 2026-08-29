<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\SaleController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::get('/lapor', [SaleController::class, 'create'])->name('report.create');
Route::post('/lapor', [SaleController::class, 'store'])->middleware('throttle:10,1')->name('report.store');
Route::get('/tracking', [SaleController::class, 'tracking'])->name('tracking.create');
Route::post('/tracking/show', [SaleController::class, 'show'])->middleware('throttle:5,1')->name('tracking.show');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->middleware('role:admin')->name('dashboard');
    Route::get('officer', fn () => Inertia::render('officer/index'))->middleware('role:officer')->name('officer');
    Route::get('partner', fn () => Inertia::render('partner/index'))->middleware('role:partner')->name('partner');
    Route::middleware('role:officer')->prefix('officer')->group(function () { foreach (['tasks', 'routes', 'weighing'] as $page) Route::get($page, fn () => Inertia::render('officer/index')); });
    Route::middleware('role:partner')->prefix('partner')->group(function () { foreach (['deliveries', 'contract', 'billing'] as $page) Route::get($page, fn () => Inertia::render('partner/index')); });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
