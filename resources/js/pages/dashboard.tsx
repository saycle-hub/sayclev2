import { GradeBadge } from '@/components/grade-badge';
import { StatCard } from '@/components/stat-card';
import { StockTable, type StockEntry } from '@/components/stock-table';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Banknote, Package, PackageCheck, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dasbor', href: '/dashboard' }];

interface GradeStock {
    grade: string;
    total_kg: number;
}

interface TrendPoint {
    date: string;
    total_kg: number;
}

interface DashboardProps {
    stock: GradeStock[];
    trend: TrendPoint[];
    recentEntries: StockEntry[];
    stats: {
        total_stock_kg: number;
        active_partners: number;
        estimated_revenue: number;
    };
}

const gradeIcons = [PackageCheck, Package, Package];

function formatKg(value: number): string {
    return `${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg`;
}

function formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

export default function Dashboard({ stock, trend, recentEntries, stats }: DashboardProps) {
    const chartData = trend.map((t) => ({ ...t, label: new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-[#f4f3ed] p-4 md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Ringkasan operasional</h1>
                        <p className="mt-1 text-sm text-[#18352a]/70">Posisi stok, mitra, dan nilai persediaan saat ini.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline" className="border-[#2f6848]/30 text-[#2f6848] hover:bg-[#2f6848]/5 hover:text-[#2f6848]">
                            <Link href="/prices">
                                Harga grade
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        </Button>
                        <Button asChild className="bg-[#e88c12] text-[#18352a] hover:bg-[#e88c12]/90">
                            <Link href="/stock">
                                Kelola stok
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {stock.map((s, i) => {
                        const Icon = gradeIcons[i % gradeIcons.length];
                        return (
                            <StatCard
                                key={s.grade}
                                icon={Icon}
                                label={
                                    <span className="inline-flex items-center gap-2">
                                        Stok <GradeBadge grade={s.grade} />
                                    </span>
                                }
                                value={formatKg(s.total_kg)}
                            />
                        );
                    })}
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <section aria-labelledby="trend-heading" className="rounded-2xl border border-[#2f6848]/15 bg-white p-5 lg:col-span-2">
                        <div className="flex items-baseline justify-between gap-3">
                            <div>
                                <h2 id="trend-heading" className="text-base font-semibold text-[#18352a]">
                                    Tren stok kumulatif
                                </h2>
                                <p className="text-sm text-[#18352a]/70">30 hari entri terakhir, semua grade.</p>
                            </div>
                            <p className="text-lg font-semibold text-[#2f6848] tabular-nums">{formatKg(stats.total_stock_kg)}</p>
                        </div>
                        <div className="mt-4 h-64 w-full" role="img" aria-label="Grafik tren stok kumulatif">
                            {chartData.length === 0 ? (
                                <div className="flex h-full items-center justify-center rounded-xl bg-[#f4f3ed] text-sm text-[#18352a]/60">
                                    Belum ada data stok. Tambahkan penyesuaian pertama dari halaman stok.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                                        <CartesianGrid stroke="#2f6848" strokeOpacity={0.12} vertical={false} />
                                        <XAxis dataKey="label" tick={{ fill: '#18352a', fontSize: 12 }} tickLine={false} axisLine={false} />
                                        <YAxis
                                            tick={{ fill: '#18352a', fontSize: 12 }}
                                            tickLine={false}
                                            axisLine={false}
                                            width={56}
                                            tickFormatter={(v: number) => `${v}`}
                                        />
                                        <Tooltip
                                            formatter={(value) => [formatKg(Number(value)), 'Stok kumulatif']}
                                            contentStyle={{
                                                backgroundColor: '#ffffff',
                                                border: '1px solid rgba(47, 104, 72, 0.2)',
                                                borderRadius: '0.75rem',
                                                color: '#18352a',
                                            }}
                                            labelStyle={{ color: '#18352a', fontWeight: 600 }}
                                        />
                                        <Area type="monotone" dataKey="total_kg" stroke="#2f6848" strokeWidth={2} fill="#2f6848" fillOpacity={0.15} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </section>

                    <div className="flex flex-col gap-4">
                        <StatCard icon={Users} label="Mitra aktif" value={String(stats.active_partners)} hint="Mitra terdaftar" />
                        <StatCard
                            icon={Banknote}
                            label="Estimasi nilai jual stok"
                            value={formatRupiah(stats.estimated_revenue)}
                            hint="Berdasarkan harga jual per grade"
                        />
                    </div>
                </div>

                <section aria-labelledby="recent-heading" className="rounded-2xl border border-[#2f6848]/15 bg-white p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 id="recent-heading" className="text-base font-semibold text-[#18352a]">
                            Entri stok terbaru
                        </h2>
                        <Link
                            href="/stock"
                            className="inline-flex items-center gap-1 text-sm font-medium text-[#2f6848] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none"
                        >
                            Lihat semua
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                    <StockTable entries={recentEntries} />
                </section>
            </div>
        </AppLayout>
    );
}
