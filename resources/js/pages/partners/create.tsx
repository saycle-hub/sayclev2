import { emptyPartnerForm, PartnerFormFields, type PartnerFormData } from '@/components/partner-form-fields';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Mitra', href: '/partners' },
    { title: 'Tambah', href: '/partners/create' },
];

export default function PartnerCreate() {
    const form = useForm<PartnerFormData>(emptyPartnerForm);
    const errorSummaryRef = useRef<HTMLDivElement>(null);
    const errorCount = Object.keys(form.errors).length;

    useEffect(() => {
        if (errorCount > 0) errorSummaryRef.current?.focus();
    }, [errorCount]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/partners');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tambah Mitra" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-[#f4f3ed] p-4 md:p-6">
                <div>
                    <Link
                        href="/partners"
                        className="inline-flex items-center gap-1 text-sm font-medium text-[#2f6848] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Kembali ke daftar mitra
                    </Link>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#18352a]">Tambah mitra</h1>
                    <p className="mt-1 text-sm text-[#18352a]/70">Daftarkan penerima hasil olahan dan kapasitas mingguannya.</p>
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
                    <PartnerFormFields form={form} idPrefix="create-partner" />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" asChild className="min-h-11 md:min-h-9">
                            <Link href="/partners">Batal</Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="min-h-11 bg-[#2f6848] text-[#f4f3ed] hover:bg-[#18352a] md:min-h-9"
                        >
                            Simpan mitra
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
