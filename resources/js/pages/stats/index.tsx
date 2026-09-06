import { TrendChart } from '@/components/stats/TrendChart';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { HandCoins, Recycle, TrendingDown, TrendingUp, Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Statistik', href: '/stats' },
];

interface Kpi {
    pendapatan: number;
    pengeluaran: number;
    margin: number;
    kg_terolah: number;
    total_mitra: number;
    total_pemasok: number;
}

interface TrendPoint {
    week_start: string;
    kg: number;
    pendapatan: number;
}

interface Props {
    kpi: Kpi;
    trend: TrendPoint[];
}

function formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

export default function StatsIndex({ kpi, trend }: Props) {
    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            title="Statistik"
            description="Ringkasan pendapatan, pengeluaran, dan dampak pengolahan sampah."
        >
            <Head title="Statistik" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">

                {/* KPI grid */}
                <section aria-label="Ringkasan" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <KpiCard icon={TrendingUp} label="Total pendapatan" value={formatRupiah(kpi.pendapatan)} />
                    <KpiCard icon={TrendingDown} label="Total pengeluaran" value={formatRupiah(kpi.pengeluaran)} />
                    <KpiCard
                        icon={HandCoins}
                        label="Margin"
                        value={formatRupiah(kpi.margin)}
                        tone={kpi.margin >= 0 ? 'positive' : 'negative'}
                    />
                    <KpiCard icon={Recycle} label="Kg terolah" value={`${kpi.kg_terolah.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg`} />
                    <KpiCard icon={Users} label="Total mitra" value={kpi.total_mitra.toLocaleString('id-ID')} />
                    <KpiCard icon={Users} label="Total pemasok" value={kpi.total_pemasok.toLocaleString('id-ID')} />
                </section>

                <TrendChart data={trend} metric="kg" />

                {/* Sub-module links */}
                <section aria-label="Detail statistik" className="grid gap-4 sm:grid-cols-3">
                    <QuickLink href="/stats/revenue" title="Pendapatan" desc="Rincian transaksi per penimbangan." />
                    <QuickLink href="/stats/impact" title="Dampak" desc="Kg terolah per grade dan tujuan olahnya." />
                    <QuickLink href="/stats/partners" title="Mitra & Pemasok" desc="Sebaran grade preferensi dan frekuensi." />
                </section>
            </div>
        </AppLayout>
    );
}

function KpiCard({ icon: Icon, label, value, tone = 'default' }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    tone?: 'default' | 'positive' | 'negative';
}) {
    return (
        <Card className="rounded-2xl border border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
            <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A1CCA5]/30 text-[#415D43]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#111D13]/70">{label}</p>
                    <p
                        className={
                            tone === 'positive'
                                ? 'mt-1 truncate text-2xl font-semibold tracking-tight text-[#415D43] tabular-nums'
                                : tone === 'negative'
                                    ? 'mt-1 truncate text-2xl font-semibold tracking-tight text-red-700 tabular-nums'
                                    : 'mt-1 truncate text-2xl font-semibold tracking-tight text-[#111D13] tabular-nums'
                        }
                    >
                        {value}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
    return (
        <Link
            href={href}
            className="block rounded-2xl border-none bg-[#415D43] p-6 shadow-sm transition-all hover:bg-[#2A422D] active:scale-[0.99] text-white"
        >
            <p className="font-bold text-lg text-white">{title}</p>
            <p className="mt-1.5 text-sm font-medium text-[#A1CCA5]">{desc}</p>
        </Link>
    );
}
