import { ContractList, type ContractRow } from '@/components/contract-list';
import { GradeBadge } from '@/components/grade-badge';
import { FREQUENCY_LABELS, formatKg } from '@/components/partner-card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface SystemPrice {
    grade: string;
    buy_price: string | number;
    sell_price: string | number;
}

const DAY_LABELS: Record<string, string> = {
    monday: 'Senin',
    tuesday: 'Selasa',
    wednesday: 'Rabu',
    thursday: 'Kamis',
    friday: 'Jumat',
    saturday: 'Sabtu',
    sunday: 'Minggu',
};

function getPrimaryDay(days: any): string {
    if (!days) return 'Senin';
    let arr: string[] = [];
    if (Array.isArray(days)) {
        arr = days;
    } else if (typeof days === 'string') {
        try {
            const parsed = JSON.parse(days);
            if (Array.isArray(parsed)) arr = parsed;
            else arr = [days];
        } catch {
            arr = [days];
        }
    }
    const day = arr[0] || 'monday';
    return DAY_LABELS[day] ?? day;
}

interface PartnerDetail {
    id: number;
    name: string;
    address: string;
    grade_preference: string | null;
    min_capacity_kg: string | number;
    ideal_capacity_kg: string | number;
    max_capacity_kg: string | number;
    frequency: string;
    receiving_days?: string[];
    contracts: ContractRow[];
}

export default function PartnerShow({ partner, systemPrices }: { partner: PartnerDetail; systemPrices?: Record<string, SystemPrice> }) {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const deleteForm = useForm({});

    const contracts = partner?.contracts || [];
    const activeContract = contracts.find((c) => c.status === 'active');
    const minCap = activeContract ? activeContract.min_capacity_kg : partner?.min_capacity_kg;
    const idealCap = activeContract ? activeContract.ideal_capacity_kg : partner?.ideal_capacity_kg;
    const maxCap = activeContract ? activeContract.max_capacity_kg : partner?.max_capacity_kg;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dasbor', href: '/dashboard' },
        { title: 'Mitra', href: '/partners' },
        { title: partner?.name || 'Detail Mitra', href: `/partners/${partner?.id}` },
    ];

    const removePartner = () => {
        if (!partner?.id) return;
        deleteForm.delete(`/partners/${partner.id}`, {
            onFinish: () => setDeleteOpen(false),
        });
    };

    if (!partner) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <div className="p-8 text-center text-[#18352a]/70">Data mitra tidak ditemukan.</div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={partner.name} />
            <div className="flex h-full flex-1 flex-col gap-6 bg-white p-4 md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <Link
                            href="/partners"
                            className="inline-flex items-center gap-1 text-sm font-medium text-[#2f6848] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Kembali ke daftar mitra
                        </Link>
                        <div className="mt-2 flex items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">{partner.name}</h1>
                            {partner.grade_preference && <GradeBadge grade={partner.grade_preference} />}
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-sm text-[#18352a]/70">
                            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                            {partner.address}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            asChild
                            variant="outline"
                            className="min-h-11 border-[#2f6848]/30 text-[#2f6848] hover:bg-[#2f6848]/5 hover:text-[#2f6848] md:min-h-9"
                        >
                            <Link href={`/partners/${partner.id}/edit`}>
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                Ubah profil
                            </Link>
                        </Button>
                        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-11 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 md:min-h-9"
                                >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    Hapus
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white">
                                <DialogHeader>
                                    <DialogTitle className="text-[#18352a]">Hapus mitra {partner.name}?</DialogTitle>
                                    <DialogDescription>
                                        Mitra beserta seluruh kontraknya akan dihapus secara permanen dan tidak dapat dikembalikan.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setDeleteOpen(false)}
                                        disabled={deleteForm.processing}
                                        className="min-h-11 focus-visible:ring-[#e88c12] md:min-h-9"
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={removePartner}
                                        disabled={deleteForm.processing}
                                        className="min-h-11 bg-red-700 text-white hover:bg-red-800 focus-visible:ring-[#e88c12] md:min-h-9"
                                    >
                                        Hapus permanen
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                    {activeContract ? (
                        ([
                            ['Minimum', minCap],
                            ['Ideal', idealCap],
                            ['Maksimum', maxCap],
                        ] as const).map(([label, value]) => (
                            <div key={label} className="rounded-2xl border border-[#2f6848]/15 bg-white p-5">
                                <p className="text-xs font-medium text-[#18352a]/70">Kapasitas {label.toLowerCase()}</p>
                                <p className="mt-1 text-xl font-semibold text-[#18352a] tabular-nums">
                                    {formatKg(value)}
                                    <span className="ml-1 text-xs font-normal text-[#18352a]/60">kg/minggu</span>
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-3 rounded-2xl border border-[#2f6848]/15 bg-gradient-to-r from-gray-50/80 to-emerald-50/30 p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-[#18352a]">Total Kebutuhan Pokok Mitra</p>
                                <span className="rounded-full bg-[#2f6848]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#2f6848]">Profil Mitra</span>
                            </div>
                            <p className="mt-1 text-2xl font-bold text-[#18352a] tabular-nums">
                                {formatKg(idealCap || 0)}
                                <span className="ml-1.5 text-xs font-normal text-[#18352a]/70">kg/minggu (Estimasi Kebutuhan)</span>
                            </p>
                            <p className="mt-1 text-[11px] text-[#18352a]/60">Batasan min & max kapasitas akan aktif setelah kontrak diterbitkan.</p>
                        </div>
                    )}
                    <div className="rounded-2xl border border-[#2f6848]/15 bg-white p-5">
                        <p className="text-xs font-medium text-[#18352a]/70">Frekuensi penerimaan</p>
                        <p className="mt-1 text-xl font-semibold text-[#18352a]">{FREQUENCY_LABELS[activeContract?.frequency || partner.frequency] ?? partner.frequency}</p>
                        {(activeContract?.frequency || partner.frequency) === 'mingguan' && (
                            <p className="mt-1 text-xs font-bold text-[#2f6848]">
                                Setiap Hari {getPrimaryDay(activeContract?.receiving_days || partner.receiving_days)}
                            </p>
                        )}
                    </div>
                </div>

                <section aria-labelledby="contracts-heading" className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 id="contracts-heading" className="text-base font-semibold text-[#18352a]">
                                Kontrak Kerja Sama Mitra
                            </h2>
                            <p className="text-xs text-[#18352a]/70">Atur batasan kapasitas (min/ideal/max) dan harga nego khusus kontrak.</p>
                        </div>
                        <Button
                            asChild
                            className="min-h-11 bg-[#e88c12] text-[#18352a] font-bold hover:bg-[#e88c12]/90 md:min-h-9"
                        >
                            <Link href={`/partners/${partner.id}/contracts/create`}>
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Buat Kontrak Baru
                            </Link>
                        </Button>
                    </div>

                    <ContractList contracts={contracts} partnerName={partner.name} />
                </section>
            </div>
        </AppLayout>
    );
}
