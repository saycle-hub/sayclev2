import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface MarginCardProps {
    pendapatan: number;
    pengeluaran: number;
    className?: string;
}

function formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

/**
 * Pendapatan vs pengeluaran vs margin card. Margin row highlights
 * positive in green; negative margin shown in red without sugarcoating.
 */
export function MarginCard({ pendapatan, pengeluaran, className }: MarginCardProps) {
    const margin = pendapatan - pengeluaran;
    const positive = margin >= 0;

    return (
        <Card className={cn('rounded-2xl border-[#2f6848]/15 bg-white shadow-none', className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-[#18352a]">Margin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-[#18352a]/70">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#2f6848]" aria-hidden="true" />
                        Pendapatan
                    </span>
                    <span className="font-semibold text-[#18352a] tabular-nums">{formatRupiah(pendapatan)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-[#18352a]/70">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#6b4f2e]" aria-hidden="true" />
                        Pengeluaran
                    </span>
                    <span className="font-semibold text-[#18352a] tabular-nums">{formatRupiah(pengeluaran)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#2f6848]/15 pt-3">
                    <span className="text-sm font-medium text-[#18352a]">Margin</span>
                    <span
                        className={cn(
                            'text-xl font-semibold tracking-tight tabular-nums',
                            positive ? 'text-[#2f6848]' : 'text-red-700',
                        )}
                    >
                        {formatRupiah(margin)}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
