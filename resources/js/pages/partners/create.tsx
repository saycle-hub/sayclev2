import { emptyPartnerForm, PartnerFormFields, type PartnerFormData } from '@/components/partner-form-fields';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Building2 } from 'lucide-react';
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
            <main className="min-h-full p-4 md:p-6 text-[#18352a]">
                <div className="max-w-4xl space-y-6">
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
                                <h1 className="text-2xl font-extrabold tracking-tight text-[#18352a]">Tambah Mitra Baru</h1>
                                <p className="text-xs text-[#18352a]/70">Daftarkan penerima hasil olahan dan kapasitas mingguannya.</p>
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

                        <PartnerFormFields form={form} idPrefix="create-partner" />

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
                                {form.processing ? 'Menyimpan...' : 'Simpan Mitra'}
                            </Button>
                        </div>
                    </form>
                </div>
            </main>
        </AppLayout>
    );
}
