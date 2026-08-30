import { AllocationBar } from '@/components/allocation-bar';
import { GradeBadge } from '@/components/grade-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs = (grade: string): BreadcrumbItem[] => [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Alokasi', href: '/allocation' },
    { title: grade, href: `/allocation/${encodeURIComponent(grade)}` },
];

interface AllocationRow {
    id: number;
    partner: string;
    allocated_kg: number;
    allocation_type: string;
    status: string;
    minimum: number;
    ideal: number;
    maximum: number;
}

const typeLabels: Record<string, string> = {
    minimum: 'Minimum',
    ideal: 'Ideal',
    surplus: 'Surplus',
    overcapacity: 'Overcapacity',
};

const typeStyles: Record<string, string> = {
    minimum: 'border-transparent bg-[#2f6848]/10 text-[#2f6848]',
    ideal: 'border-transparent bg-[#d7e6c9] text-[#18352a]',
    surplus: 'border-transparent bg-[#e88c12]/15 text-[#18352a]',
    overcapacity: 'border-transparent bg-[#e88c12]/25 text-[#18352a]',
};

const statusStyles: Record<string, string> = {
    pending: 'border-transparent bg-[#e88c12]/15 text-[#18352a]',
    approved: 'border-transparent bg-[#2f6848]/10 text-[#2f6848]',
    rejected: 'border-transparent bg-[#6b4f2e]/10 text-[#6b4f2e]',
};

function formatKg(value: number): string {
    return `${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg`;
}

export default function AllocationShow({ grade, weekStart, rows }: { grade: string; weekStart: string; rows: AllocationRow[] }) {
    const [dialog, setDialog] = useState<{ row: AllocationRow; action: 'approve' | 'reject' } | null>(null);
    const actionForm = useForm({});

    const confirmAction = () => {
        if (!dialog) return;
        actionForm.post(route(dialog.action === 'approve' ? 'allocation.approve' : 'allocation.reject', dialog.row.id), {
            preserveScroll: true,
            onSuccess: () => setDialog(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs(grade)}>
            <Head title={`Alokasi ${grade}`} />
            <div className="flex h-full flex-1 flex-col gap-6 bg-[#f4f3ed] p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <GradeBadge grade={grade} />
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Detail alokasi</h1>
                            <p className="text-sm text-[#18352a]/70">Minggu mulai {weekStart}</p>
                        </div>
                    </div>
                    <Link href="/allocation" className="min-h-11 text-sm font-medium text-[#2f6848] underline-offset-4 hover:underline md:min-h-9">
                        Kembali
                    </Link>
                </div>

                {rows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#2f6848]/25 bg-white py-14 text-center text-sm text-[#18352a]/70">
                        Belum ada alokasi untuk grade ini minggu ini.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rows.map((row) => (
                            <div key={row.id} className="rounded-2xl border border-[#2f6848]/15 bg-white p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <p className="font-semibold text-[#18352a]">{row.partner}</p>
                                        <Badge variant="outline" className={`font-semibold ${typeStyles[row.allocation_type] ?? ''}`}>
                                            {typeLabels[row.allocation_type] ?? row.allocation_type}
                                        </Badge>
                                        {/* Approval badge only where a human decision occurred: overcapacity rows. */}
                                        {row.allocation_type === 'overcapacity' && (
                                            <Badge variant="outline" className={`font-semibold ${statusStyles[row.status] ?? ''}`}>
                                                {row.status === 'approved' ? 'Disetujui' : row.status === 'pending' ? 'Menunggu' : 'Ditolak'}
                                            </Badge>
                                        )}
                                    </div>
                                    {row.allocation_type === 'overcapacity' && row.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <Button size="sm" className="min-h-11 bg-[#2f6848] text-[#f4f3ed] hover:bg-[#18352a] focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none md:min-h-9" onClick={() => setDialog({ row, action: 'approve' })}>
                                                Setujui
                                            </Button>
                                            <Button size="sm" variant="outline" className="min-h-11 border-[#6b4f2e]/30 text-[#6b4f2e] hover:bg-[#6b4f2e]/5 focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none md:min-h-9" onClick={() => setDialog({ row, action: 'reject' })}>
                                                Tolak
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4">
                                    <AllocationBar allocated={row.allocated_kg} minimum={row.minimum} ideal={row.ideal} maximum={row.maximum} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{dialog?.action === 'approve' ? 'Setujui overcapacity?' : 'Tolak alokasi overcapacity?'}</DialogTitle>
                            <DialogDescription>
                                {dialog?.action === 'approve'
                                    ? `Alokasi ${formatKg(dialog.row.allocated_kg)} ke ${dialog.row.partner} akan disetujui.`
                                    : `Alokasi ${formatKg(dialog?.row.allocated_kg ?? 0)} ke ${dialog?.row.partner ?? ''} akan ditolak.`}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2">
                            <Button variant="ghost" onClick={() => setDialog(null)} disabled={actionForm.processing}>
                                Batal
                            </Button>
                            <Button
                                onClick={confirmAction}
                                disabled={actionForm.processing}
                                className={dialog?.action === 'approve'
                                    ? 'bg-[#2f6848] text-[#f4f3ed] hover:bg-[#18352a] focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none'
                                    : 'bg-[#6b4f2e] text-white hover:bg-[#18352a] focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none'}
                            >
                                {dialog?.action === 'approve' ? 'Setujui' : 'Tolak'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
