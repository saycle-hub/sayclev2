import { cn } from '@/lib/utils';

function formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

/**
 * Compact read-only price info chip (beli/jual per kg).
 */
export function PriceBadge({ label, value, className }: { label: string; value: number; className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-[#2f6848]/10 px-2.5 py-0.5 text-xs text-[#18352a]', className)}>
            <span className="text-[#18352a]/70">{label}</span>
            <span className="font-semibold tabular-nums">{formatRupiah(value)}</span>
            <span className="text-[#18352a]/70">/kg</span>
        </span>
    );
}
