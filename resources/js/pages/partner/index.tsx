import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, ClipboardList, Layers3, ReceiptText, Truck, Wallet } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Beranda', href: '/partner' }];

interface PartnerSummary {
    id: number;
    name: string;
    grade_preference: string | null;
    frequency: string;
}

interface Stats {
    pending: number;
    done: number;
    allocated_kg: number;
    billing: number;
}

interface OverviewContract {
    status: 'active' | 'paused' | 'cancelled';
    grade: string;
    min_capacity_kg: number;
    ideal_capacity_kg: number;
    max_capacity_kg: number;
    frequency: string;
    buy_price: number;
}

interface Props {
    partner: PartnerSummary | null;
    stats: Stats | null;
    contract: OverviewContract | null;
}

const formatNumber = (value: number) => value.toLocaleString('id-ID', { maximumFractionDigits: 1 });
const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

export default function PartnerOverview({ partner, stats, contract }: Props) {
    const kpis = [
        { icon: ClipboardList, label: 'Pengiriman menunggu', value: stats?.pending ?? 0 },
        { icon: CheckCircle2, label: 'Pengiriman selesai', value: stats?.done ?? 0 },
        { icon: Layers3, label: 'Alokasi minggu ini', value: formatNumber(stats?.allocated_kg ?? 0), suffix: 'kg' },
        { icon: Wallet, label: 'Tagihan total', value: formatCurrency(stats?.billing ?? 0), currency: true },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dasbor Mitra" />
            <main className="min-h-full flex-1 bg-[#f9f9f8] bg-[radial-gradient(circle_at_40%_20%,#f2f7ef_0,transparent_42%),radial-gradient(circle_at_80%_0%,#ecf2e8_0,transparent_40%),radial-gradient(circle_at_0%_55%,#f4f7f2_0,transparent_42%)] p-5 text-[#191c1c] md:p-8">
                <div className="mx-auto max-w-7xl">
                    <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#476648]">Partner Portal</p>
                            <h1 className="text-[30px] font-semibold tracking-[-0.01em] text-[#191c1c] md:text-[32px]">Selamat datang, {partner?.name ?? 'Mitra'}</h1>
                            <p className="mt-2 text-[15px] text-[#424841]">Ringkasan aktivitas dan performa operasional Anda hari ini.</p>
                        </div>
                        <div className="flex items-center gap-3 self-start rounded-2xl bg-[#1d3a20] px-4 py-3 text-[#c9ecc6] shadow-sm lg:self-auto">
                            <div className="grid size-9 place-items-center rounded-xl bg-white/10"><Layers3 className="size-5" /></div>
                            <div>
                                <p className="text-xs font-semibold text-white/80">Alokasi minggu ini</p>
                                <p className="text-lg font-bold leading-tight">{formatNumber(stats?.allocated_kg ?? 0)} kg</p>
                            </div>
                        </div>
                    </header>

                    <section aria-label="Ringkasan metrik" className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {kpis.map(({ icon: Icon, label, value, suffix, currency }) => (
                            <Metric key={label} icon={Icon} label={label} value={String(value)} suffix={suffix} currency={currency} />
                        ))}
                    </section>

                    <section className="grid gap-6 xl:grid-cols-12">
                        <article className="rounded-[20px] border border-[#e1e3e2] bg-white p-6 shadow-[0_2px_8px_rgba(7,36,12,0.02)] xl:col-span-8">
                            {contract ? (
                                <>
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h2 className="text-2xl font-semibold tracking-[-0.01em] text-[#191c1c]">Kontrak Aktif</h2>
                                            <p className="mt-1 text-sm text-[#424841]">Detail kapasitas dan status kelayakan.</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="rounded-lg bg-[#dbe6d2] px-3 py-1.5 text-xs font-semibold text-[#404a3b]">{contract.grade}</span>
                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#c9ecc6] px-3 py-1.5 text-xs font-semibold text-[#04210a]"><span className="size-2 rounded-full bg-[#07240c]" />{contract.status === 'active' ? 'Aktif' : contract.status}</span>
                                        </div>
                                    </div>
                                    <div className="my-6 grid grid-cols-1 gap-5 border-y border-[#e1e3e2] py-5 sm:grid-cols-3">
                                        <Capacity label="Kapasitas Min" value={contract.min_capacity_kg} />
                                        <Capacity label="Kapasitas Ideal" value={contract.ideal_capacity_kg} />
                                        <Capacity label="Kapasitas Maks" value={contract.max_capacity_kg} />
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f3f4f3] px-4 py-3">
                                        <span className="text-sm font-semibold text-[#424841]">Harga Beli</span>
                                        <span className="text-xl font-semibold text-[#07240c]">{formatCurrency(contract.buy_price)} <span className="text-sm font-normal text-[#424841]">/kg</span></span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex min-h-64 flex-col items-start justify-center">
                                    <h2 className="text-2xl font-semibold text-[#191c1c]">Belum ada kontrak aktif</h2>
                                    <p className="mt-2 text-sm text-[#424841]">Hubungi admin SayCle untuk pengaturan kontrak.</p>
                                    <Link href="/partner/contract" className="mt-5 rounded-xl bg-[#1d3a20] px-4 py-2.5 text-sm font-semibold text-white">Lihat kontrak</Link>
                                </div>
                            )}
                        </article>

                        <aside className="flex min-h-[300px] flex-col rounded-[20px] border border-[#e1e3e2] bg-white p-6 shadow-[0_2px_8px_rgba(7,36,12,0.02)] xl:col-span-4">
                            <div>
                                <h2 className="text-xl font-semibold text-[#191c1c]">Aktivitas Terakhir</h2>
                                <p className="mt-1 text-sm text-[#424841]">Tindakan terbaru dari akun Anda.</p>
                            </div>
                            <div className="mt-6 flex flex-1 flex-col gap-5">
                                <Activity icon={Truck} title={`${stats?.pending ?? 0} pengiriman menunggu`} detail="Tinjau status pengiriman terbaru." />
                                <Activity icon={ReceiptText} title="Ringkasan tagihan tersedia" detail={`${formatCurrency(stats?.billing ?? 0)} tercatat pada portal.`} />
                            </div>
                            <div className="mt-6 border-t border-[#e1e3e2] pt-4">
                                <Link href="/partner/deliveries" className="flex min-h-11 items-center justify-center rounded-xl bg-[#1d3a20] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#163b1d]">Lihat Pengiriman</Link>
                            </div>
                        </aside>
                    </section>
                </div>
            </main>
        </AppLayout>
    );
}

function Metric({ icon: Icon, label, value, suffix, currency }: { icon: typeof Truck; label: string; value: string; suffix?: string; currency?: boolean }) {
    return <article className="flex min-h-[116px] items-center rounded-xl border border-[#e1e3e2] bg-white p-5 transition-shadow hover:shadow-[0_4px_20px_rgba(29,58,32,0.05)]"><div className="mr-4 grid size-12 shrink-0 place-items-center rounded-full bg-[#dbe6d2] text-[#1d3a20]"><Icon className="size-6" /></div><div><p className="text-xs font-semibold text-[#424841]">{label}</p><p className={`mt-1 font-semibold text-[#07240c] ${currency ? 'text-[28px] leading-tight' : 'text-2xl'}`}>{value}{suffix && <span className="ml-1 text-base font-normal text-[#424841]">{suffix}</span>}</p></div></article>;
}

function Capacity({ label, value }: { label: string; value: number }) {
    return <div><p className="text-sm font-semibold text-[#424841]">{label}</p><p className="mt-2 text-lg font-semibold text-[#191c1c]">{formatNumber(value)} kg</p></div>;
}

function Activity({ icon: Icon, title, detail }: { icon: typeof Truck; title: string; detail: string }) {
    return <div className="flex items-start gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#dbe6d2] text-[#151e12]"><Icon className="size-4" /></div><div><p className="text-sm font-semibold text-[#191c1c]">{title}</p><p className="mt-1 text-xs leading-5 text-[#424841]">{detail}</p></div></div>;
}
