import { GradeBadge } from '@/components/grade-badge';
import { StatCard } from '@/components/stat-card';
import { StockTable, type StockEntry } from '@/components/stock-table';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Banknote, Package, PackageCheck, ReceiptText, TrendingDown, Truck, Users } from 'lucide-react';
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
    allocationStatus: {
        grade: string;
        stock_kg: number;
        allocated_kg: number;
        status: string;
        held_kg: number;
    }[];
    stats: {
        total_stock_kg: number;
        active_partners: number;
        estimated_revenue: number;
        realized_pendapatan: number;
        realized_pengeluaran: number;
        realized_margin: number;
        active_pickup_tasks: number;
    };
}

const gradeIcons = [PackageCheck, Package, Package];

function formatKg(value: number): string {
    const cleanValue = Math.abs(value) < 0.0001 ? 0 : value;
    return `${cleanValue.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg`;
}

function formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

const statusStyles: Record<string, string> = {
    'Belum dijalankan': 'bg-gray-200 text-gray-800 font-semibold',
    'Tanpa kontrak': 'bg-gray-200 text-gray-800 font-semibold',
    Defisit: 'bg-red-600 text-white font-bold shadow-sm',
    Normal: 'bg-emerald-600 text-white font-bold shadow-sm',
    Surplus: 'bg-amber-500 text-white font-bold shadow-sm',
    'Surplus ditahan': 'bg-amber-600 text-white font-bold shadow-sm',
};

export default function Dashboard({ stock, trend, recentEntries, allocationStatus, stats }: DashboardProps) {
    const chartData = trend.map((t) => ({ ...t, label: new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) }));

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            title="Ringkasan operasional"
            description="Posisi stok, mitra, dan nilai persediaan saat ini."
            actions={
                <>
                    <Button asChild variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white hover:text-[#415D43] rounded-full transition-all">
                        <Link href="/prices">
                            Harga grade
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </Button>
                    <Button asChild className="bg-white text-[#415D43] font-semibold hover:bg-white/90 rounded-full shadow-sm transition-all">
                        <Link href="/stock">
                            Kelola stok
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </Button>
                </>
            }
        >
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">

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
                    <section aria-labelledby="trend-heading" className="overflow-hidden rounded-2xl border border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)] lg:col-span-2">
                        <div className="flex items-baseline justify-between gap-3 border-b border-[#8FB996]/25 bg-[#F2F7F3] px-5 py-3.5">
                            <div>
                                <h2 id="trend-heading" className="text-base font-semibold text-[#111D13]">
                                    Tren volume pickup harian
                                </h2>
                                <p className="text-sm text-[#709775]">Total kg sampah hasil penjemputan per hari.</p>
                            </div>
                            <p className="text-lg font-bold text-[#415D43] tabular-nums">{formatKg(stats.total_stock_kg)}</p>
                        </div>
                        <div className="p-5">
                            <div className="h-64 w-full" role="img" aria-label="Grafik tren volume pickup harian">
                                {chartData.length === 0 ? (
                                    <div className="flex h-full items-center justify-center rounded-xl bg-[#F2F7F3] text-sm text-[#111D13]/60">
                                        Belum ada data pickup. Lakukan penjemputan sampah pertama dari aplikasi officer.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                                            <CartesianGrid stroke="#709775" strokeOpacity={0.2} vertical={false} />
                                            <XAxis dataKey="label" tick={{ fill: '#111D13', fontSize: 12 }} tickLine={false} axisLine={false} />
                                            <YAxis
                                                tick={{ fill: '#111D13', fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={false}
                                                width={56}
                                                tickFormatter={(v: number) => `${v}`}
                                            />
                                            <Tooltip
                                                formatter={(value) => [formatKg(Number(value)), 'Volume pickup']}
                                                contentStyle={{
                                                    backgroundColor: '#ffffff',
                                                    border: '1px solid rgba(78, 112, 83, 0.3)',
                                                    borderRadius: '0.75rem',
                                                    color: '#111D13',
                                                    boxShadow: '0 4px 12px rgba(17,29,19,0.1)',
                                                }}
                                                labelStyle={{ color: '#111D13', fontWeight: 600 }}
                                            />
                                            <Area type="monotone" dataKey="total_kg" stroke="#415D43" strokeWidth={2.5} fill="#415D43" fillOpacity={0.5} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Combined green stats card: Mitra aktif + Estimasi nilai jual stok (50/50 split, left-aligned icon row) */}
                    <div className="grid h-full grid-rows-2 overflow-hidden rounded-2xl bg-[#415D43] text-white shadow-[0_2px_8px_rgba(17,29,19,0.06)]">
                        <div className="flex items-center gap-4 p-5 md:p-6 border-b border-white/15">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                                <Users className="h-6 w-6" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-[#A1CCA5]">Mitra aktif</div>
                                <p className="mt-1 text-3xl font-bold tracking-tight text-white tabular-nums">{stats.active_partners}</p>
                                <p className="mt-0.5 text-xs text-white/75">Mitra terdaftar</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-5 md:p-6">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                                <Banknote className="h-6 w-6" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-[#A1CCA5]">Estimasi nilai jual stok</div>
                                <p className="mt-1 text-2xl font-bold tracking-tight text-white tabular-nums">{formatRupiah(stats.estimated_revenue)}</p>
                                <p className="mt-0.5 text-xs text-white/75">Berdasarkan harga jual per grade</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status alokasi per grade */}
                <section aria-labelledby="allocation-heading" className="overflow-hidden rounded-2xl border border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#8FB996]/25 bg-[#F2F7F3] px-5 py-3.5">
                        <div>
                            <h2 id="allocation-heading" className="text-base font-semibold text-[#111D13]">
                                Status alokasi & penyerapan per grade
                            </h2>
                            <p className="text-sm text-[#709775]">Total sampah di-pickup dan status stok terhadap alokasi.</p>
                        </div>
                        <Link
                            href="/allocation"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[#415D43] hover:text-[#2A422D] transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#415D43] focus-visible:outline-none"
                        >
                            Kelola alokasi
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                    <div className="p-0">
                        <div className="grid grid-cols-1 divide-y divide-[#18352a]/10 sm:grid-cols-3 sm:divide-y-0 sm:divide-x sm:divide-[#18352a]/10">
                            {allocationStatus.map((row) => (
                                <div key={row.grade} className="p-5 sm:p-6">
                                    <div className="flex items-center justify-between gap-2">
                                        <GradeBadge grade={row.grade} />
                                    </div>
                                    <p className="mt-3 text-2xl font-bold text-[#18352a] tabular-nums">
                                        {formatKg(row.total_pickup_kg ?? row.stock_kg)}
                                        <span className="ml-1.5 text-xs font-normal text-[#18352a]/60">total di-pickup</span>
                                    </p>
                                    <p className="mt-1 text-xs text-[#18352a]/70 tabular-nums">
                                        Stok sisa: {formatKg(row.stock_kg)} · {formatKg(row.allocated_kg)} dialokasikan
                                        {row.held_kg > 0 && <> · {formatKg(row.held_kg)} ditahan</>}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Realisasi finansial */}
                <section aria-labelledby="realized-heading" className="overflow-hidden rounded-2xl border border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#8FB996]/25 bg-[#F2F7F3] px-5 py-3.5">
                        <div>
                            <h2 id="realized-heading" className="text-base font-semibold text-[#111D13]">
                                Realisasi finansial
                            </h2>
                            <p className="text-sm text-[#709775]">Dari tagihan &amp; pembayaran tercatat (harga snapshot saat transaksi).</p>
                        </div>
                        <Link
                            href="/stats"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[#415D43] hover:text-[#2A422D] transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#415D43] focus-visible:outline-none"
                        >
                            Lihat statistik
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                    <div className="p-5">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard icon={ReceiptText} label="Pendapatan tercatat" value={formatRupiah(stats.realized_pendapatan)} hint="Tagihan mitra" />
                            <StatCard icon={TrendingDown} label="Pengeluaran tercatat" value={formatRupiah(stats.realized_pengeluaran)} hint="Pembayaran pemasok" />
                            <StatCard
                                icon={Banknote}
                                label="Margin tercatat"
                                value={formatRupiah(stats.realized_margin)}
                                hint="Pendapatan − pengeluaran"
                            />
                            <StatCard icon={Truck} label="Tugas pickup aktif" value={String(stats.active_pickup_tasks)} hint="Planned / assigned / berjalan" />
                        </div>
                    </div>
                </section>

                <section aria-labelledby="recent-heading" className="overflow-hidden rounded-2xl border border-[#415D43]/20 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-white/15 bg-[#415D43] px-5 py-3.5 text-white">
                        <h2 id="recent-heading" className="text-base font-bold text-white">
                            Entri stok terbaru
                        </h2>
                        <Link
                            href="/stock"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[#A1CCA5] hover:text-white transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                        >
                            Lihat semua
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                    <div className="p-5">
                        <StockTable entries={recentEntries} />
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
