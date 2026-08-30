import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { CheckCircle2, Download, Eye, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Beranda', href: '/partner' },
    { title: 'Tagihan', href: '/partner/billing' },
];

export interface BillingRow {
    grade: string;
    kg: number;
    buy_price: number;
    total: number;
    pickups: number;
}

interface Props {
    breakdown: BillingRow[];
    grandTotal: number;
    totalKg: number;
}

const formatKg = (value: number) => value.toLocaleString('id-ID', { maximumFractionDigits: 1 });
const formatRupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

export default function PartnerBilling({ breakdown, grandTotal }: Props) {
    const [status, setStatus] = useState('all');
    const [period, setPeriod] = useState('month');
    const hasRows = breakdown.some((row) => row.pickups > 0);
    const paidTotal = 0;
    const unpaidTotal = grandTotal;
    const visible = useMemo(() => status === 'all' ? breakdown : breakdown.filter((row) => status === 'due' ? row.total > 0 : row.total === 0), [breakdown, status]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tagihan dan Pembayaran" />
            <main className="min-h-full flex-1 bg-[#f9f9f8] p-4 text-[#191c1c] md:p-6 lg:p-8">
                <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
                    <header>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#07240c]">Portal Mitra SayCle</p>
                        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.01em] text-[#191c1c] md:text-[32px]">Tagihan &amp; Pembayaran</h1>
                        <p className="mt-3 text-[15px] text-[#424841]">Kelola dan pantau riwayat tagihan penyetoran organik Anda.</p>
                    </header>

                    <section aria-label="Ringkasan tagihan" className="grid gap-5 md:grid-cols-3">
                        <SummaryCard icon={Wallet} label="Total Tagihan" value={formatRupiah(grandTotal)} tone="green" />
                        <SummaryCard icon={Wallet} label="Belum Dibayar" value={formatRupiah(unpaidTotal)} tone="red" />
                        <SummaryCard icon={CheckCircle2} label="Tagihan Selesai" value={formatRupiah(paidTotal)} tone="mint" />
                    </section>

                    <section className="overflow-hidden rounded-xl border border-[#e1e3e2] bg-white shadow-sm">
                        <div className="flex flex-col gap-4 border-b border-[#e1e3e2] bg-[#f9f9f8] p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-col gap-3 sm:flex-row"><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[#e1e3e2] bg-white px-4 py-2 text-sm font-semibold text-[#191c1c] outline-none focus:ring-2 focus:ring-[#07240c]"><option value="all">Semua Status</option><option value="due">Menunggu Pembayaran</option><option value="paid">Dibayar</option></select><select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-lg border border-[#e1e3e2] bg-white px-4 py-2 text-sm font-semibold text-[#191c1c] outline-none focus:ring-2 focus:ring-[#07240c]"><option value="month">Bulan Ini</option><option value="previous">Bulan Lalu</option><option value="three">3 Bulan Terakhir</option></select></div>
                            <button type="button" disabled={!hasRows} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#07240c] px-4 py-2 text-sm font-semibold text-[#07240c] transition-colors hover:bg-[#c9ecc6] disabled:cursor-not-allowed disabled:opacity-50"><Download className="size-4" />Ekspor CSV</button>
                        </div>

                        {!hasRows ? <EmptyBilling /> : <><div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-left"><thead><tr className="border-b border-[#e1e3e2] bg-white text-xs font-semibold uppercase tracking-wider text-[#424841]"><th className="px-4 py-3">Grade</th><th className="px-4 py-3 text-right">Jumlah Setoran</th><th className="px-4 py-3 text-right">Total (kg)</th><th className="px-4 py-3 text-right">Harga Beli</th><th className="px-4 py-3 text-right">Nominal (Rp)</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-center">Aksi</th></tr></thead><tbody className="divide-y divide-[#e1e3e2] text-sm">{visible.map((row) => <tr key={row.grade} className="group transition-colors hover:bg-[#f3f4f3]"><td className="px-4 py-4 font-semibold text-[#07240c]">{row.grade}</td><td className="px-4 py-4 text-right tabular-nums text-[#424841]">{row.pickups}x</td><td className="px-4 py-4 text-right tabular-nums">{formatKg(row.kg)}</td><td className="px-4 py-4 text-right tabular-nums text-[#424841]">{formatRupiah(row.buy_price)}/kg</td><td className="px-4 py-4 text-right font-semibold tabular-nums">{formatRupiah(row.total)}</td><td className="px-4 py-4 text-center"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.total > 0 ? 'bg-[#ffdad6] text-[#93000a]' : 'bg-[#c3eec2] text-[#163b1d]'}`}>{row.total > 0 ? 'Menunggu' : 'Dibayar'}</span></td><td className="px-4 py-4 text-center"><div className="flex justify-center gap-2 opacity-70 transition-opacity group-hover:opacity-100"><button type="button" aria-label="Lihat rincian" className="rounded p-1 text-[#07240c] hover:bg-[#c9ecc6]"><Eye className="size-5" /></button></div></td></tr>)}</tbody></table></div><div className="border-t border-[#e1e3e2] p-4 text-sm text-[#424841]">Menampilkan {visible.length} dari {breakdown.length} tagihan</div></>}
                    </section>
                </div>
            </main>
        </AppLayout>
    );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof Wallet; label: string; value: string; tone: 'green' | 'red' | 'mint' }) {
    const tones = { green: 'bg-[#dbe6d2] text-[#304e32]', red: 'bg-[#ffdad6] text-[#93000a]', mint: 'bg-[#c3eec2] text-[#163b1d]' };
    return <article className="flex min-h-[116px] items-center rounded-xl border border-[#e1e3e2] bg-white p-5 transition-shadow hover:shadow-[0_4px_20px_rgba(7,36,12,0.05)]"><div className={`mr-4 grid size-12 shrink-0 place-items-center rounded-full ${tones[tone]}`}><Icon className="size-6" /></div><div><p className="text-xs font-semibold text-[#424841]">{label}</p><p className="mt-1 text-2xl font-semibold text-[#07240c]">{value}</p></div></article>;
}

function EmptyBilling() {
    return <div className="grid min-h-72 place-items-center px-6 py-12 text-center"><div><Wallet className="mx-auto size-10 text-[#737970]" /><h2 className="mt-4 text-lg font-semibold text-[#191c1c]">Belum ada tagihan</h2><p className="mt-2 max-w-md text-sm leading-6 text-[#424841]">Tagihan muncul setelah pengiriman selesai dan tercatat pada sistem.</p></div></div>;
}
