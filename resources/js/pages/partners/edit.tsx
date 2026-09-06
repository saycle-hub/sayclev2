import { PartnerFormFields, type PartnerFormData } from '@/components/partner-form-fields';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Building2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface PartnerEditProps {
    partner: {
        id: number;
        name: string;
        address: string;
        grade_preference: string | null;
        min_capacity_kg: string | number;
        ideal_capacity_kg: string | number;
        max_capacity_kg: string | number;
        frequency: string;
    };
}

export default function PartnerEdit({ partner }: PartnerEditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dasbor', href: '/dashboard' },
        { title: 'Mitra', href: '/partners' },
        { title: partner.name, href: `/partners/${partner.id}` },
        { title: 'Ubah', href: `/partners/${partner.id}/edit` },
    ];

    const form = useForm<PartnerFormData>({
        name: partner.name,
        address: partner.address,
        grade_preference: partner.grade_preference ?? '',
        min_capacity_kg: String(partner.min_capacity_kg),
        ideal_capacity_kg: String(partner.ideal_capacity_kg),
        max_capacity_kg: String(partner.max_capacity_kg),
        frequency: partner.frequency,
    });
    const errorSummaryRef = useRef<HTMLDivElement>(null);
    const errorCount = Object.keys(form.errors).length;

    useEffect(() => {
        if (errorCount > 0) errorSummaryRef.current?.focus();
    }, [errorCount]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(`/partners/${partner.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Ubah ${partner.name}`} />
            <main className="min-h-full p-4 md:p-6 text-[#18352a]">
                <div className="mx-auto max-w-3xl space-y-6">
                    {/* Header */}
                    <div className="space-y-1">
                        <Link
                            href="/partners"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2f6848] transition-colors hover:text-[#18352a]"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Kembali ke daftar mitra
                        </Link>
                        <div className="flex items-center gap-3 pt-2">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2f6848]/10 text-[#2f6848]">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-extrabold tracking-tight text-[#18352a]">Ubah {partner.name}</h1>
                                <p className="text-xs text-[#18352a]/70">Perbarui profil dan kapasitas mingguan mitra.</p>
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

                        <PartnerFormFields form={form} idPrefix={`edit-partner-${partner.id}`} />

                        <div className="flex flex-col-reverse justify-end gap-3 pt-2 sm:flex-row">
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                className="min-h-11 rounded-xl border-[#18352a]/20 text-[#18352a] hover:bg-gray-50"
                            >
                                <Link href="/partners">Batal</Link>
                            </Button>
                            <Button
                                type="submit"
                                disabled={form.processing}
                                className="min-h-11 rounded-xl bg-[#2f6848] px-6 font-bold text-white shadow-sm hover:bg-[#18352a]"
                            >
                                {form.processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </Button>
                        </div>
                    </form>
                </div>
            </main>
        </AppLayout>
    );
}
