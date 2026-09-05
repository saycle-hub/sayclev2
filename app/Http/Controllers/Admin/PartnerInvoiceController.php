<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FinancialLine;
use App\Services\DeliveryCompletionService;
use Illuminate\Http\RedirectResponse;

class PartnerInvoiceController extends Controller
{
    public function __construct(private DeliveryCompletionService $completions)
    {
    }

    public function pay(FinancialLine $invoice): RedirectResponse
    {
        $this->completions->markPaid($invoice);

        return back()->with('success', 'Pembayaran tagihan dicatat.');
    }
}
