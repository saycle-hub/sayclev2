<?php

namespace Tests\Feature;

use App\Domain\Grade;
use App\Models\Allocation;
use App\Models\ClassificationLot;
use App\Models\Contract;
use App\Models\Delivery;
use App\Models\FinancialLine;
use App\Models\Partner;
use App\Models\Pickup;
use App\Models\Reservation;
use App\Models\SupplierReport;
use App\Models\User;
use App\Models\WarehouseMutation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PhaseZeroSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_domain_tables_and_columns_exist(): void
    {
        foreach (['supplier_reports', 'pickups', 'classification_lots', 'warehouse_mutations', 'reservations', 'deliveries', 'delivery_lines', 'financial_lines'] as $table) {
            $this->assertTrue(Schema::hasTable($table), $table);
        }

        $this->assertTrue(Schema::hasColumns('supplier_reports', ['contact_name', 'estimated_kg', 'manual_address']));
        $this->assertTrue(Schema::hasColumns('classification_lots', ['grade', 'intended_use']));
        $this->assertTrue(Schema::hasColumns('contracts', ['frequency', 'receiving_days', 'intended_use']));
        $this->assertTrue(Schema::hasColumns('allocations', ['source_grade', 'grade', 'intended_use', 'period_start', 'period_end']));
        $this->assertTrue(Schema::hasColumns('reservations', ['allocation_id', 'grade', 'intended_use']));
    }

    public function test_domain_records_keep_pickup_delivery_and_finance_separate(): void
    {
        $user = User::factory()->create(['role' => 'partner']);
        $partner = Partner::create([
            'user_id' => $user->id,
            'name' => 'Mitra Kompos',
            'address' => 'Gudang',
            'grade_preference' => Grade::NOT_FIT,
            'min_capacity_kg' => 1,
            'ideal_capacity_kg' => 2,
            'max_capacity_kg' => 3,
            'frequency' => 'mingguan',
        ]);
        $contract = Contract::create([
            'partner_id' => $partner->id,
            'status' => 'active',
            'grade' => Grade::NOT_FIT,
            'intended_use' => Grade::INTENDED_USES[Grade::NOT_FIT],
            'min_capacity_kg' => 1,
            'ideal_capacity_kg' => 2,
            'max_capacity_kg' => 3,
            'frequency' => 'mingguan',
            'receiving_days' => ['monday'],
            'buy_price' => 1000,
            'sell_price' => 1500,
        ]);
        $report = SupplierReport::create([
            'public_id' => str_repeat('r', 32),
            'contact_name' => 'Supplier',
            'estimated_kg' => 3,
            'photo_path' => 'proof.jpg',
            'location_consent' => false,
            'manual_address' => 'Pasar',
            'status' => 'submitted',
            'pin_hash' => 'hash',
        ]);
        $pickup = Pickup::create(['supplier_report_id' => $report->id, 'status' => 'completed', 'estimated_kg' => 3, 'actual_total_kg' => 3]);
        $lot = ClassificationLot::create(['pickup_id' => $pickup->id, 'grade' => Grade::FIT, 'intended_use' => Grade::INTENDED_USES[Grade::FIT], 'kg' => 3]);
        $mutation = WarehouseMutation::create(['classification_lot_id' => $lot->id, 'grade' => Grade::FIT, 'intended_use' => Grade::INTENDED_USES[Grade::FIT], 'type' => 'receipt', 'kg' => 3, 'occurred_at' => now()]);
        $allocation = Allocation::create(['partner_id' => $partner->id, 'contract_id' => $contract->id, 'source_grade' => Grade::FIT, 'grade' => Grade::NOT_FIT, 'intended_use' => Grade::INTENDED_USES[Grade::NOT_FIT], 'allocated_kg' => 3, 'allocation_type' => 'overcapacity', 'status' => 'approved', 'week_start' => now()->startOfWeek(), 'period_start' => now()->startOfWeek(), 'period_end' => now()->startOfWeek()->addDays(6)]);
        $reservation = Reservation::create(['allocation_id' => $allocation->id, 'classification_lot_id' => $lot->id, 'grade' => Grade::FIT, 'intended_use' => Grade::INTENDED_USES[Grade::FIT], 'reserved_kg' => 3, 'status' => 'reserved', 'reserved_at' => now()]);
        $delivery = Delivery::create(['partner_id' => $partner->id, 'contract_id' => $contract->id, 'service_date' => '2026-09-01', 'status' => 'planned']);
        $finance = FinancialLine::create(['type' => 'partner_invoice', 'direction' => 'receivable', 'delivery_id' => $delivery->id, 'contract_id' => $contract->id, 'grade' => Grade::NOT_FIT, 'intended_use' => Grade::INTENDED_USES[Grade::NOT_FIT], 'kg' => 3, 'unit_price' => 1500, 'amount' => 4500, 'status' => 'draft']);

        $this->assertSame(Grade::FIT, $lot->grade);
        $this->assertSame(Grade::INTENDED_USES[Grade::FIT], $mutation->intended_use);
        $this->assertSame(Grade::FIT, $allocation->source_grade);
        $this->assertSame(Grade::NOT_FIT, $allocation->grade);
        $this->assertTrue($reservation->allocation->is($allocation));
        $this->assertNotSame($pickup->getTable(), $delivery->getTable());
        $this->assertSame('financial_lines', $finance->getTable());
    }
}
