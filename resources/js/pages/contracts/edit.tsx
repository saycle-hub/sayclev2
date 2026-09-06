import { ContractForm, type ContractFormData } from '@/components/contract-form';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Handshake } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface SystemPrice {
    grade: string;
    buy_price: string | number;
    sell_price: string | number;
}

interface ContractEditProps {
    contract: {
        id: number;
        partner_id: number;
        name: string | null;
        status: string;
        grade: string;
        min_capacity_kg: string | number;
        ideal_capacity_kg: string | number;
        max_capacity_kg: string | number;
        frequency: string;
        monthly_day: number | null;
        receiving_days: string[] | null;
        buy_price: string | number;
        sell_price: string | number;
        start_date: string | null;
        end_date: string | null;
    };
    partner: {
        id: number;
        name: string;
    };
    systemPrices?: Record<string, SystemPrice>;
}

export default function ContractEdit({ contract, partner, systemPrices }: ContractEditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dasbor', href: '/dashboard' },
        { title: 'Mitra', href: '/partners' },
        { title: partner.name, href: `/partners/${partner.id}` },
        { title: 'Ubah Kontrak', href: `/contracts/${contract.id}/edit` },
    ];

    const form = useForm<ContractFormData>({
        name: contract.name || '',
        status: contract.status || 'active',
        grade: contract.grade || '',
        min_capacity_kg: String(contract.min_capacity_kg || ''),
        ideal_capacity_kg: String(contract.ideal_capacity_kg || ''),
        max_capacity_kg: String(contract.max_capacity_kg || ''),
        frequency: contract.frequency || 'harian',
        monthly_day: contract.monthly_day ? String(contract.monthly_day) : '',
        receiving_days: contract.receiving_days || [],
        buy_price: String(contract.buy_price || ''),
        sell_price: String(contract.sell_price || ''),
        start_date: contract.start_date || '',
        end_date: contract.end_date || '',
    });

    const errorSummaryRef = useRef<HTMLDivElement>(null);
    const errorCount = Object.keys(form.errors).length;

    useEffect(() => {
        if (errorCount > 0) errorSummaryRef.current?.focus();
    }, [errorCount]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(`/contracts/${contract.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Ubah Kontrak - ${partner.name}`} />
            <main className="min-h-full p-4 md:p-6 text-[#18352a]">
                <div className="mx-auto max-w-3xl space-y-6">
                    {/* Header */}
                    <div className="space-y-1">
                        <Link
                            href={`/partners/${partner.id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2f6848] transition-colors hover:text-[#18352a]"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Kembali ke detail {partner.name}
                        </Link>
                        <div className="flex items-center gap-3 pt-2">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e88c12]/15 text-[#e88c12]">
                                <Handshake className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-extrabold tracking-tight text-[#18352a]">Ubah Kontrak Kerja Sama</h1>
                                <p className="text-xs text-[#18352a]/70">Perbarui kapasitas, frekuensi, harga nego, atau status kontrak mitra {partner.name}.</p>
                            </div>
                        </div>
                    </div>

                    {/* Form Card */}
                    <form onSubmit={submit} className="overflow-hidden rounded-3xl border border-[#18352a]/10 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                        {errorCount > 0 && (
                            <div
                                ref={errorSummaryRef}
                                role="alert"
                                tabIndex={-1}
                                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
                            >
                                Ada {errorCount} isian yang perlu diperbaiki. Periksa kembali formulir di bawah.
                            </div>
                        )}

                        <ContractForm form={form} idPrefix={`edit-contract-${contract.id}`} showStatus={true} systemPrices={systemPrices} />

                        <div className="flex flex-col-reverse justify-end gap-3 pt-2 border-t border-[#2f6848]/10 sm:flex-row">
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                className="min-h-11 rounded-xl border-[#18352a]/20 text-[#18352a] hover:bg-gray-50"
                            >
                                <Link href={`/partners/${partner.id}`}>Batal</Link>
                            </Button>
                            <Button
                                type="submit"
                                disabled={form.processing}
                                className="min-h-11 rounded-xl bg-[#2f6848] px-6 font-bold text-white shadow-sm hover:bg-[#18352a]"
                            >
                                {form.processing ? 'Menyimpan...' : 'Simpan Perubahan Kontrak'}
                            </Button>
                        </div>
                    </form>
                </div>
            </main>
        </AppLayout>
    );
}
