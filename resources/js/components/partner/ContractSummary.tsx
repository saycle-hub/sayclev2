import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GradeBadge } from '@/components/grade-badge';
import { FREQUENCY_LABELS, formatKg } from '@/components/partner-card';
import { cn } from '@/lib/utils';

export type ContractStatus = 'active' | 'paused' | 'cancelled';

export const CONTRACT_STATUS_STYLES: Record<ContractStatus, string> = {
    active: 'border-transparent bg-[#2f6848]/10 text-[#2f6848]',
    paused: 'border-transparent bg-[#e88c12]/15 text-[#18352a]',
    cancelled: 'border-transparent bg-red-100 text-red-800',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
    active: 'Aktif',
    paused: 'Dijeda',
    cancelled: 'Dibatalkan',
};

export interface ContractSummaryProps {
    status: ContractStatus;
    grade: string;
    minCapacityKg: number;
    idealCapacityKg: number;
    maxCapacityKg: number;
    frequency: string;
    buyPrice: number;
    className?: string;
}

export function formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

/**
 * Compact "kontrak aktif" summary card for the partner portal
 * (used on overview + contract pages). Read-only.
 */
export function ContractSummary({ status, grade, minCapacityKg, idealCapacityKg, maxCapacityKg, frequency, buyPrice, className }: ContractSummaryProps) {
    return (
        <Card className={cn('rounded-2xl border-[#2f6848]/15 bg-white shadow-none', className)}>
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-[#18352a]">Kontrak aktif</CardTitle>
                    <div className="flex items-center gap-2">
                        <GradeBadge grade={grade} />
                        <Badge variant="outline" className={cn('font-semibold', CONTRACT_STATUS_STYLES[status])}>
                            {CONTRACT_STATUS_LABELS[status]}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-white px-2 py-3">
                        <p className="text-xs text-[#18352a]/70">Min</p>
                        <p className="mt-0.5 font-semibold text-[#18352a] tabular-nums">{formatKg(minCapacityKg)} kg</p>
                    </div>
                    <div className="rounded-xl bg-[#e88c12]/10 px-2 py-3">
                        <p className="text-xs text-[#18352a]/70">Ideal</p>
                        <p className="mt-0.5 font-semibold text-[#18352a] tabular-nums">{formatKg(idealCapacityKg)} kg</p>
                    </div>
                    <div className="rounded-xl bg-white px-2 py-3">
                        <p className="text-xs text-[#18352a]/70">Maks</p>
                        <p className="mt-0.5 font-semibold text-[#18352a] tabular-nums">{formatKg(maxCapacityKg)} kg</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[#18352a]/70">
                    <span>{FREQUENCY_LABELS[frequency] ?? frequency}</span>
                    <span className="font-semibold text-[#18352a] tabular-nums">
                        Harga beli {formatRupiah(buyPrice)}/kg
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
