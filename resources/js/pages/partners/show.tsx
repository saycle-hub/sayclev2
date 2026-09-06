import { ContractForm, emptyContractForm, type ContractFormData } from '@/components/contract-form';
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

interface PartnerDetail {
    id: number;
    name: string;
    address: string;
    grade_preference: string | null;
    min_capacity_kg: string | number;
    ideal_capacity_kg: string | number;
    max_capacity_kg: string | number;
    frequency: string;
    contracts: ContractRow[];
}

export default function PartnerShow({ partner }: { partner: PartnerDetail }) {
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const form = useForm<ContractFormData>(emptyContractForm);
    const deleteForm = useForm({});

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dasbor', href: '/dashboard' },
        { title: 'Mitra', href: '/partners' },
        { title: partner.name, href: `/partners/${partner.id}` },
    ];

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/partners/${partner.id}/contracts`, {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                form.reset();
            },
        });
    };

    const removePartner = () => {
        deleteForm.delete(`/partners/${partner.id}`, {
            onFinish: () => setDeleteOpen(false),
        });
    };

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
                    {(
                        [
                            ['Minimum', partner.min_capacity_kg],
                            ['Ideal', partner.ideal_capacity_kg],
                            ['Maksimum', partner.max_capacity_kg],
                        ] as const
                    ).map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-[#2f6848]/15 bg-white p-5">
                            <p className="text-sm text-[#18352a]/70">Kapasitas {label.toLowerCase()}</p>
                            <p className="mt-1 text-xl font-semibold text-[#18352a] tabular-nums">
                                {formatKg(value)}
                                <span className="ml-1 text-sm font-medium text-[#18352a]/70">kg/minggu</span>
                            </p>
                        </div>
                    ))}
                    <div className="rounded-2xl border border-[#2f6848]/15 bg-white p-5">
                        <p className="text-sm text-[#18352a]/70">Frekuensi penerimaan</p>
                        <p className="mt-1 text-xl font-semibold text-[#18352a]">{FREQUENCY_LABELS[partner.frequency] ?? partner.frequency}</p>
                    </div>
                </div>

                <section aria-labelledby="contracts-heading" className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 id="contracts-heading" className="text-base font-semibold text-[#18352a]">
                                Kontrak
                            </h2>
                            <p className="text-sm text-[#18352a]/70">Kapasitas dan harga per grade yang disepakati.</p>
                        </div>
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button className="min-h-11 bg-[#e88c12] text-[#18352a] hover:bg-[#e88c12]/90 md:min-h-9">
                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                    Tambah kontrak
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90vh] overflow-y-auto bg-white">
                                <DialogHeader>
                                    <DialogTitle className="text-[#18352a]">Tambah kontrak</DialogTitle>
                                    <DialogDescription>Kontrak baru langsung berstatus aktif.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={submit} className="space-y-4">
                                    {Object.keys(form.errors).length > 0 && (
                                        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                                            Periksa kembali isian formulir.
                                        </div>
                                    )}
                                    <ContractForm form={form} idPrefix="new-contract" />
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setOpen(false)}
                                            disabled={form.processing}
                                            className="min-h-11 md:min-h-9"
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={form.processing}
                                            className="min-h-11 bg-[#2f6848] text-[#f4f3ed] hover:bg-[#18352a] md:min-h-9"
                                        >
                                            Simpan kontrak
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <ContractList contracts={partner.contracts} partnerName={partner.name} />
                </section>
            </div>
        </AppLayout>
    );
}
