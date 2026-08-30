<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinancialLine extends Model
{
    use HasFactory;

    public const TYPES = ['supplier_payment', 'partner_invoice', 'adjustment'];
    public const DIRECTIONS = ['payable', 'receivable'];
    public const STATUSES = ['draft', 'issued', 'due', 'paid', 'void'];

    protected $fillable = ['type', 'direction', 'supplier_report_id', 'pickup_id', 'delivery_id', 'contract_id', 'grade', 'intended_use', 'kg', 'unit_price', 'amount', 'currency', 'status', 'due_at', 'paid_at', 'description'];

    protected function casts(): array
    {
        return ['kg' => 'decimal:2', 'unit_price' => 'decimal:2', 'amount' => 'decimal:2', 'due_at' => 'datetime', 'paid_at' => 'datetime'];
    }
}
