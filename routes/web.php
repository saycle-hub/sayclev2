<?php

use App\Http\Controllers\Admin\PartnerInvoiceController;
use App\Http\Controllers\Admin\SupplierProvenanceController;
use App\Http\Controllers\AllocationController;
use App\Http\Controllers\ContractController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\DeliveryRouteController;
use App\Http\Controllers\OfficerController;
use App\Http\Controllers\PartnerController;
use App\Http\Controllers\PartnerPortalController;
use App\Http\Controllers\PriceController;
use App\Http\Controllers\RouteController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\SupplierReportController;
use App\Http\Controllers\VehicleController;
use App\Models\Partner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::get('/lapor', [SaleController::class, 'create'])->name('report.create');
Route::post('/lapor', [SaleController::class, 'store'])->middleware('throttle:10,1')->name('report.store');
Route::get('/tracking', [SaleController::class, 'tracking'])->name('tracking.create');
Route::match(['get', 'post'], '/tracking/show', [SaleController::class, 'show'])->middleware('throttle:10,1')->name('tracking.show');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [StockController::class, 'dashboard'])->middleware('role:admin')->name('dashboard');

    Route::middleware('role:admin')->group(function () {
        Route::get('supplier-reports', [SupplierReportController::class, 'index'])->name('supplier-reports.index');
        Route::get('supplier-reports/{supplierReport}', [SupplierReportController::class, 'show'])->name('supplier-reports.show');
        Route::get('supplier-reports/{supplierReport}/photo', [SupplierReportController::class, 'photo'])->name('supplier-reports.photo');
        Route::post('supplier-reports/{supplierReport}/accept', [SupplierReportController::class, 'accept'])->name('supplier-reports.accept');
        Route::post('supplier-reports/{supplierReport}/reject', [SupplierReportController::class, 'reject'])->name('supplier-reports.reject');
        Route::get('stock', [StockController::class, 'index'])->name('stock.index');
        Route::get('stock/adjust', fn () => Inertia::render('stock/adjust'))->name('stock.adjust.create');
        Route::post('stock/adjust', [StockController::class, 'adjust'])->name('stock.adjust');
        Route::post('stock/warehouses', [StockController::class, 'storeWarehouse'])->name('stock.warehouses.store');
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
        Route::get('partners/{partner}/contracts/create', [ContractController::class, 'create'])->name('partners.contracts.create');
        Route::post('partners/{partner}/contracts', [ContractController::class, 'store'])->name('partners.contracts.store');
        Route::get('contracts', [ContractController::class, 'index'])->name('contracts.index');
        Route::get('contracts/{contract}/edit', [ContractController::class, 'edit'])->name('contracts.edit');
        Route::put('contracts/{contract}', [ContractController::class, 'update'])->name('contracts.update');
        Route::post('contracts/{contract}/action', [ContractController::class, 'action'])->name('contracts.action');

        // Allocation engine (Fase 4).
        Route::get('allocation', [AllocationController::class, 'index'])->name('allocation.index');
        Route::post('allocation/run', [AllocationController::class, 'run'])->name('allocation.run');
        Route::post('deliveries/schedule', [DeliveryController::class, 'schedule'])->name('deliveries.schedule');
        Route::post('deliveries/optimize', [DeliveryController::class, 'optimize'])->name('deliveries.optimize');
        Route::post('deliveries/{delivery}/assign', [DeliveryController::class, 'assign'])->name('deliveries.assign');
        Route::get('delivery-routes', [DeliveryRouteController::class, 'index'])->name('delivery-routes.index');
        Route::post('delivery-routes/optimize', [DeliveryRouteController::class, 'optimize'])->name('delivery-routes.optimize');
        Route::get('delivery-routes/{vehicle}', [DeliveryRouteController::class, 'show'])->name('delivery-routes.show');
        Route::post('delivery-routes/{vehicle}/assign', [DeliveryRouteController::class, 'assign'])->name('delivery-routes.assign');
        Route::get('allocation/{grade}', [AllocationController::class, 'show'])->where('grade', 'Layak|Kurang Layak|Tidak Layak')->name('allocation.show');

        // Route optimization (Fase 5).
        Route::get('routes', [RouteController::class, 'index'])->name('routes.index');
        Route::get('provenance', [SupplierProvenanceController::class, 'index'])->name('provenance.index');
        Route::get('pickups/{pickup}/photo', [SupplierProvenanceController::class, 'photo'])->name('pickups.photo');
        Route::post('routes/optimize', [RouteController::class, 'optimize'])->name('routes.optimize');
        Route::get('routes/{vehicle}', [RouteController::class, 'show'])->name('routes.show');
        Route::post('routes/{vehicle}/assign', [RouteController::class, 'assign'])->name('routes.assign');

        Route::get('vehicles', [VehicleController::class, 'index'])->name('vehicles.index');
        Route::post('vehicles', [VehicleController::class, 'store'])->name('vehicles.store');
        Route::put('vehicles/{vehicle}', [VehicleController::class, 'update'])->name('vehicles.update');

        // User & Officer management.
        Route::get('users', [\App\Http\Controllers\Admin\UserController::class, 'index'])->name('users.index');
        Route::post('users', [\App\Http\Controllers\Admin\UserController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [\App\Http\Controllers\Admin\UserController::class, 'update'])->name('users.update');
        Route::delete('users/{user}', [\App\Http\Controllers\Admin\UserController::class, 'destroy'])->name('users.destroy');

        // Partner invoice payment recording (Fase 7, D7: manual recording).
        Route::post('partner-invoices/{invoice}/pay', [PartnerInvoiceController::class, 'pay'])->name('partner-invoices.pay');

        // Statistics & impact dashboard (Fase 8).
        Route::get('stats', [StatsController::class, 'index'])->name('stats.index');
        Route::get('stats/revenue', [StatsController::class, 'revenue'])->name('stats.revenue');
        Route::get('stats/impact', [StatsController::class, 'impact'])->name('stats.impact');
        Route::get('stats/partners', [StatsController::class, 'partners'])->name('stats.partners');
    });
    Route::middleware('role:officer')->prefix('officer')->name('officer.')->group(function () {
        Route::get('dashboard', [OfficerController::class, 'dashboard'])->name('dashboard');
        Route::get('stop/{type}/{id}', [OfficerController::class, 'showStop'])->name('stop.show');
        Route::get('workload', [OfficerController::class, 'dashboard'])->name('workload');
        // Workload aliases for sidebar links (PLAN Fase 3: 'Ganti route tasks
        // coming-soon dengan workload nyata'). Same canonical dashboard.
        Route::get('tasks', [OfficerController::class, 'dashboard'])->name('tasks');
        Route::get('routes', [OfficerController::class, 'dashboard'])->name('routes');
        Route::get('weighing', [OfficerController::class, 'dashboard'])->name('weighing');
        Route::post('pickups/{pickup}/checkin', [OfficerController::class, 'checkinPickup'])->name('pickups.checkin');
        Route::post('deliveries/{trip}/complete', [OfficerController::class, 'completeDelivery'])->name('deliveries.complete');
    });

    // Partner self-service portal (Fase 7).
    Route::middleware(['role:partner', 'partner.terms'])->prefix('partner')->name('partner.')->group(function () {
        Route::get('/', [PartnerPortalController::class, 'index'])->name('index');
        Route::get('deliveries', [PartnerPortalController::class, 'deliveries'])->name('deliveries');
        Route::get('contract', [PartnerPortalController::class, 'contract'])->name('contract');
        Route::get('billing', [PartnerPortalController::class, 'billing'])->name('billing');
    });
    Route::middleware('role:partner')->prefix('partner')->name('partner.')->group(function () {
        Route::get('terms', fn () => Inertia::render('partner/accept-terms'))->name('terms');
        Route::post('terms', function (Request $request) {
            $request->validate(['overcapacity_terms_accepted' => 'accepted']);
            $partner = Partner::where('user_id', $request->user()->id)->firstOrFail();
            $partner->update(['overcapacity_terms_version' => Partner::OVERCAPACITY_TERMS_VERSION, 'overcapacity_terms_accepted_at' => now()]);

            return to_route('partner.index');
        })->name('terms.accept');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
