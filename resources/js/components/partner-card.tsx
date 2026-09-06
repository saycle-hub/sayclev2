import { GradeBadge } from '@/components/grade-badge';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { MapPin } from 'lucide-react';

export interface PartnerSummary {
    id: number;
    name: string;
    address: string;
    grade_preference: string | null;
    min_capacity_kg: string | number;
    ideal_capacity_kg: string | number;
    max_capacity_kg: string | number;
    frequency: string;
    contracts_count?: number;
    active_contracts_count?: number;
}

export const FREQUENCY_LABELS: Record<string, string> = {
    harian: 'Harian',
    mingguan: 'Mingguan',
    bulanan: 'Bulanan',
};

export function formatKg(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    const cleanNum = Math.abs(num) < 0.0001 ? 0 : num;
    return cleanNum.toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

/**
 * Compact partner info card, reused on list and detail pages.
 */
export function PartnerCard({ partner, className }: { partner: PartnerSummary; className?: string }) {
    const activeContracts = partner.active_contracts_count ?? 0;

    return (
        <Link
            href={`/partners/${partner.id}`}
            className={cn(
                'block rounded-2xl border border-[#2f6848]/15 bg-white p-5 transition-colors hover:border-[#2f6848]/40 focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-[#18352a]">{partner.name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-[#18352a]/70">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{partner.address}</span>
                    </p>
                </div>
                {partner.grade_preference && <GradeBadge grade={partner.grade_preference} />}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-[#18352a]/70">
                    <span className="font-semibold text-[#18352a] tabular-nums">{formatKg(partner.ideal_capacity_kg)}</span> kg/minggu ideal ·{' '}
                    {FREQUENCY_LABELS[partner.frequency] ?? partner.frequency}
                </p>
                <p className="text-xs text-[#18352a]/70">
                    {activeContracts > 0
                        ? `${activeContracts} kontrak aktif`
                        : (partner.contracts_count ?? 0) > 0
                          ? 'Kontrak nonaktif'
                          : 'Belum ada kontrak'}
                </p>
            </div>
        </Link>
    );
}
