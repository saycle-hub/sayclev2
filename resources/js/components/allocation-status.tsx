import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type AllocationStatusKind = 'active' | 'inactive' | 'none';

const statusStyles: Record<AllocationStatusKind, string> = {
    active: 'border-transparent bg-[#2f6848]/10 text-[#2f6848]',
    inactive: 'border-transparent bg-[#e88c12]/15 text-[#18352a]',
    none: 'border-transparent bg-[#18352a]/10 text-[#18352a]/70',
};

const statusLabels: Record<AllocationStatusKind, string> = {
    active: 'Berkontrak aktif',
    inactive: 'Kontrak nonaktif',
    none: 'Tanpa kontrak',
};

const statusDescriptions: Record<AllocationStatusKind, string> = {
    active: 'Memiliki kontrak aktif',
    inactive: 'Kontrak ada tetapi tidak aktif',
    none: 'Belum memiliki kontrak',
};

/**
 * Contract-based status badge derived from real contract counts.
 * Live stock-allocation calculation arrives in phase 4.
 */
export function AllocationStatus({ status, className }: { status: AllocationStatusKind; className?: string }) {
    return (
        <Badge variant="outline" className={cn('font-semibold', statusStyles[status], className)} title={statusDescriptions[status]}>
            {statusLabels[status]}
        </Badge>
    );
}
