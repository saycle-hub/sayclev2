import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { StockFormFields, type StockFormData } from '@/pages/stock';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Stok', href: '/stock' },
    { title: 'Penyesuaian', href: '/stock/adjust' },
];

export default function StockAdjust() {
    const form = useForm<StockFormData>({ grade: '', type: 'in', kg: '', description: '' });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/stock/adjust', {
            onSuccess: () => form.reset(),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Penyesuaian Stok" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-[#f4f3ed] p-4 md:p-6">
                <div>
                    <Link
                        href="/stock"
                        className="inline-flex items-center gap-1 text-sm font-medium text-[#2f6848] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Kembali ke stok
                    </Link>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#18352a]">Penyesuaian stok</h1>
                    <p className="mt-1 text-sm text-[#18352a]/70">Catat stok masuk, keluar, atau koreksi per grade.</p>
                </div>

                <form onSubmit={submit} className="max-w-xl space-y-5 rounded-2xl border border-[#2f6848]/15 bg-white p-6">
                    {Object.keys(form.errors).length > 0 && (
                        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                            Periksa kembali isian formulir.
                        </div>
                    )}
                    <StockFormFields form={form} idPrefix="page-adjust" />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" asChild className="min-h-11 md:min-h-9">
                            <Link href="/stock">Batal</Link>
                        </Button>
                        <Button type="submit" disabled={form.processing} className="min-h-11 bg-[#2f6848] text-[#f4f3ed] hover:bg-[#18352a] md:min-h-9">
                            Simpan penyesuaian
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
