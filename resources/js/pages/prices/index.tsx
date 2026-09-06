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
        <AppLayout
            breadcrumbs={breadcrumbs}
            title="Harga per grade"
            description="Atur harga beli dari pemasok dan harga jual ke mitra per kilogram."
        >
            <Head title="Harga per Grade" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <Link
                        href="/stock"
                        className="inline-flex items-center gap-1 text-sm font-medium text-[#0f5235] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Kembali ke stok
                    </Link>
                </div>

                <div className="grid max-w-3xl gap-4">
                    {prices.map((p) => (
                        <section key={p.grade} aria-label={`Harga ${p.grade}`} className="overflow-hidden rounded-2xl border border-[#8FB996]/35 bg-white p-5 shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                            <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#8FB996]/25 bg-[#F2F7F3] -mx-5 -mt-5 px-5 py-3.5 text-[#111D13]">
                                <div className="flex items-center gap-3">
                                    <GradeBadge grade={p.grade} />
                                    <p className="text-sm font-semibold text-[#709775]">{gradeHints[p.grade] ?? ''}</p>
                                </div>
                                <p className="text-xs font-semibold text-[#709775]">per kg</p>
                            </div>
                            <PriceEditor grade={p.grade} buyPrice={p.buy_price} sellPrice={p.sell_price} />
                        </section>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
