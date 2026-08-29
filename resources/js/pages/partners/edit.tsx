import { PartnerFormFields, type PartnerFormData } from '@/components/partner-form-fields';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
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
            <div className="flex h-full flex-1 flex-col gap-6 bg-[#f4f3ed] p-4 md:p-6">
                <div>
                    <Link
                        href={`/partners/${partner.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-[#2f6848] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Kembali ke detail mitra
                    </Link>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#18352a]">Ubah {partner.name}</h1>
                    <p className="mt-1 text-sm text-[#18352a]/70">Perbarui profil dan kapasitas mingguan mitra.</p>
                </div>

                <form onSubmit={submit} className="max-w-xl space-y-5 rounded-2xl border border-[#2f6848]/15 bg-white p-6">
                    {errorCount > 0 && (
                        <div
                            ref={errorSummaryRef}
                            role="alert"
                            tabIndex={-1}
                            className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 focus:outline-none"
                        >
                            Ada {errorCount} isian yang perlu diperbaiki. Periksa kembali formulir.
                        </div>
                    )}
                    <PartnerFormFields form={form} idPrefix={`edit-partner-${partner.id}`} />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" asChild className="min-h-11 md:min-h-9">
                            <Link href={`/partners/${partner.id}`}>Batal</Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="min-h-11 bg-[#2f6848] text-[#f4f3ed] hover:bg-[#18352a] md:min-h-9"
                        >
                            Simpan perubahan
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
