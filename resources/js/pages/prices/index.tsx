import { GradeBadge } from '@/components/grade-badge';
import { PriceEditor } from '@/components/price-editor';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Harga', href: '/prices' },
];

interface PriceRow {
    grade: string;
    buy_price: number;
    sell_price: number;
}

const gradeHints: Record<string, string> = {
    Layak: 'Pakan ternak',
    'Kurang Layak': 'Maggot',
    'Tidak Layak': 'Kompos',
};

export default function PricesIndex({ prices }: { prices: PriceRow[] }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Harga per Grade" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-[#f4f3ed] p-4 md:p-6">
                <div>
                    <Link
                        href="/stock"
                        className="inline-flex items-center gap-1 text-sm font-medium text-[#2f6848] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Kembali ke stok
                    </Link>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#18352a]">Harga per grade</h1>
                    <p className="mt-1 text-sm text-[#18352a]/70">Atur harga beli dari pemasok dan harga jual ke mitra per kilogram.</p>
                </div>

                <div className="grid max-w-3xl gap-4">
                    {prices.map((p) => (
                        <section key={p.grade} aria-label={`Harga ${p.grade}`} className="rounded-2xl border border-[#2f6848]/15 bg-white p-5">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <GradeBadge grade={p.grade} />
                            <p className="text-sm text-[#18352a]/70">{gradeHints[p.grade] ?? ''}</p>
                            </div>
                            <p className="text-xs text-[#18352a]/70">per kg</p>
                            </div>
                            <PriceEditor grade={p.grade} buyPrice={p.buy_price} sellPrice={p.sell_price} />
                        </section>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
