import { ContractForm, type ContractFormData } from '@/components/contract-form';
import { GradeBadge } from '@/components/grade-badge';
import { FREQUENCY_LABELS, formatKg } from '@/components/partner-card';
import { PriceBadge } from '@/components/reusable/price-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { Pause, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

export interface ContractRow {
    id: number;
    partner_id: number;
    name: string | null;
    status: 'active' | 'paused' | 'cancelled';
    grade: string;
    min_capacity_kg: string | number;
    ideal_capacity_kg: string | number;
    max_capacity_kg: string | number;
    frequency: string;
    buy_price: string | number;
    sell_price: string | number;
    start_date: string | null;
    end_date: string | null;
}

export const contractStatusStyles: Record<ContractRow['status'], string> = {
    active: 'border-transparent bg-[#2f6848]/10 text-[#2f6848]',
    paused: 'border-transparent bg-[#e88c12]/15 text-[#18352a]',
    cancelled: 'border-transparent bg-red-100 text-red-800',
};

export const contractStatusLabels: Record<ContractRow['status'], string> = {
    active: 'Aktif',
    paused: 'Dijeda',
    cancelled: 'Dibatalkan',
};

function toFormData(contract: ContractRow): ContractFormData {
    return {
        name: contract.name ?? '',
        status: contract.status,
        grade: contract.grade,
        min_capacity_kg: String(contract.min_capacity_kg),
        ideal_capacity_kg: String(contract.ideal_capacity_kg),
        max_capacity_kg: String(contract.max_capacity_kg),
        frequency: contract.frequency,
        buy_price: String(contract.buy_price),
        sell_price: String(contract.sell_price),
        start_date: contract.start_date ? contract.start_date.slice(0, 10) : '',
        end_date: contract.end_date ? contract.end_date.slice(0, 10) : '',
    };
}

export function gradeLabel(contract: ContractRow, partnerName?: string): string {
    return contract.name?.trim() ? `${contract.name}` : `${partnerName ? `${partnerName} — ` : ''}Grade ${contract.grade}`;
}

function ContractRowActions({ contract }: { contract: ContractRow }) {
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const form = useForm<ContractFormData>(toFormData(contract));
    const actionForm = useForm<{ action: string }>({ action: '' });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(`/contracts/${contract.id}`, {
            preserveScroll: true,
            onSuccess: () => setEditOpen(false),
        });
    };

    const transition = (action: 'pause' | 'delete') => {
        actionForm.setData('action', action);
        actionForm.post(`/contracts/${contract.id}/action`, {
            preserveScroll: true,
            onSuccess: () => setDeleteOpen(false),
        });
    };

    return (
        <div className="flex items-center gap-1">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 text-[#2f6848] hover:bg-[#2f6848]/5 md:min-h-9"
                        aria-label="Ubah kontrak"
                    >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only sm:not-sr-only">Ubah</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-[#18352a]">Ubah kontrak</DialogTitle>
                        <DialogDescription>Perbarui kapasitas, harga, atau status kontrak.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        {Object.keys(form.errors).length > 0 && (
                            <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                                Periksa kembali isian formulir.
                            </div>
                        )}
                        <ContractForm form={form} idPrefix={`edit-contract-${contract.id}`} showStatus />
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setEditOpen(false)}
                                disabled={form.processing}
                                className="min-h-11 focus-visible:ring-[#e88c12] md:min-h-9"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={form.processing}
                                className="min-h-11 bg-[#2f6848] text-[#f4f3ed] hover:bg-[#18352a] focus-visible:ring-[#e88c12] md:min-h-9"
                            >
                                Simpan
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {contract.status === 'active' && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => transition('pause')}
                    disabled={actionForm.processing}
                    className="min-h-11 text-[#6b4f2e] hover:bg-[#6b4f2e]/5 md:min-h-9"
                    aria-label="Jeda kontrak"
                >
                    <Pause className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only sm:not-sr-only">Jeda</span>
                </Button>
            )}

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={actionForm.processing}
                        className="min-h-11 text-red-700 hover:bg-red-50 md:min-h-9"
                        aria-label="Hapus kontrak"
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only sm:not-sr-only">Hapus</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-[#18352a]">Hapus kontrak ini?</DialogTitle>
                        <DialogDescription>
                            Kontrak {gradeLabel(contract)} akan dihapus secara permanen dan tidak dapat dikembalikan.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setDeleteOpen(false)}
                            disabled={actionForm.processing}
                            className="min-h-11 focus-visible:ring-[#e88c12] md:min-h-9"
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={() => transition('delete')}
                            disabled={actionForm.processing}
                            className="min-h-11 bg-red-700 text-white hover:bg-red-800 focus-visible:ring-[#e88c12] md:min-h-9"
                        >
                            Hapus permanen
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/**
 * Compact contract rows with status, price info, and actions.
 */
export function ContractList({ contracts, partnerName, className }: { contracts: ContractRow[]; partnerName?: string; className?: string }) {
    if (contracts.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-[#2f6848]/30 bg-[#f4f3ed] px-4 py-8 text-center text-sm text-[#18352a]/70">
                Belum ada kontrak. Tambahkan kontrak pertama untuk mengaktifkan mitra ini.
            </div>
        );
    }

    return (
        <ul className={cn('space-y-3', className)}>
            {contracts.map((c) => (
                <li key={c.id} className="rounded-xl border border-[#2f6848]/15 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <GradeBadge grade={c.grade} />
                            <Badge variant="outline" className={cn('font-semibold', contractStatusStyles[c.status])}>
                                {contractStatusLabels[c.status]}
                            </Badge>
                            <span className="text-sm font-medium text-[#18352a]">{gradeLabel(c, partnerName)}</span>
                        </div>
                        <ContractRowActions contract={c} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#18352a]/70">
                        <p>
                            Kapasitas{' '}
                            <span className="font-semibold text-[#18352a] tabular-nums">
                                {formatKg(c.min_capacity_kg)}–{formatKg(c.max_capacity_kg)}
                            </span>{' '}
                            kg/minggu (ideal {formatKg(c.ideal_capacity_kg)})
                        </p>
                        <p>{FREQUENCY_LABELS[c.frequency] ?? c.frequency}</p>
                        <div className="flex gap-2">
                            <PriceBadge label="Beli" value={Number(c.buy_price)} />
                            <PriceBadge label="Jual" value={Number(c.sell_price)} />
                        </div>
                        {(c.start_date || c.end_date) && (
                            <p className="text-xs text-[#18352a]/70">
                                {c.start_date ? new Date(c.start_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '…'} —{' '}
                                {c.end_date ? new Date(c.end_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : 'berjalan'}
                            </p>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}
