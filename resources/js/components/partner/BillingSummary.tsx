import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/components/partner/ContractSummary';

export interface BillingRow {
    grade: string;
    kg: number;
    buy_price: number;
    total: number;
    pickups: number;
}

export interface BillingSummaryProps {
    grandTotal: number;
    totalKg: number;
    className?: string;
}

/**
 * "Tagihan total" card for the partner portal: outstanding amount derived
 * from completed pickups × buy price per grade. Read-only.
 */
export function BillingSummary({ grandTotal, totalKg, className }: BillingSummaryProps) {
    return (
        <Card className={cn('overflow-hidden rounded-2xl border-[#2f6848]/15 bg-white shadow-none', className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-[#18352a]">Tagihan total</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-semibold tracking-tight text-[#18352a] tabular-nums">
                    {formatRupiah(grandTotal)}
                </p>
                <p className="mt-1 text-sm text-[#18352a]/70">
                    Dari{' '}
                    <span className="font-semibold text-[#18352a] tabular-nums">
                        {totalKg.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                    </span>{' '}
                    kg setoran yang sudah ditimbang
                </p>
            </CardContent>
        </Card>
    );
}
