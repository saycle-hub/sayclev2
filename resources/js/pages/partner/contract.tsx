import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Beranda', href: '/partner' },
    { title: 'Kontrak', href: '/partner/contract' },
];

export interface PartnerContractRow {
    id: number;
    name: string | null;
    status: 'active' | 'paused' | 'cancelled';
    grade: string;
    min_capacity_kg: number;
    ideal_capacity_kg: number;
    max_capacity_kg: number;
    frequency: string;
    buy_price: number;
    sell_price: number;
    start_date: string | null;
    end_date: string | null;
}

interface Props {
    contracts: PartnerContractRow[];
}

const frequencyLabels: Record<string, string> = { harian: 'Harian', mingguan: 'Mingguan', bulanan: 'Bulanan' };
const statusLabels: Record<PartnerContractRow['status'], string> = { active: 'Aktif', paused: 'Dijeda', cancelled: 'Dibatalkan' };
const statusStyles: Record<PartnerContractRow['status'], string> = { active: 'bg-[#adcfab] text-[#04210a]', paused: 'bg-[#e1e3e2] text-[#424841]', cancelled: 'bg-[#ffdad6] text-[#93000a]' };
const formatKg = (value: number) => value.toLocaleString('id-ID', { maximumFractionDigits: 1 });
const formatRupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

export default function PartnerContract({ contracts }: Props) {
    const active = contracts.find((contract) => contract.status === 'active') ?? null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Kontrak Mitra" />
            <main className="min-h-full flex-1 bg-[#f9f9f8] p-4 text-[#191c1c] md:p-6 lg:p-8">
                <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
                    <header>
                        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.01em] text-[#07240c] md:text-[32px]">Kontrak</h1>
                        <p className="mt-3 text-[15px] text-[#424841]">Rincian kontrak kerja sama operasional dan kapasitas penerimaan Anda.</p>
                    </header>

                    {contracts.length === 0 ? (
                        <section className="grid min-h-72 place-items-center rounded-xl border border-dashed border-[#c2c8be] bg-white p-8 text-center">
                            <div><h2 className="text-xl font-semibold text-[#191c1c]">Belum ada kontrak</h2><p className="mt-2 text-sm text-[#424841]">Hubungi admin SayCle untuk pengaturan kontrak.</p></div>
                        </section>
                    ) : (
                        <>
                            {active && <ActiveContract contract={active} />}
                            <ContractTable contracts={contracts} />
                        </>
                    )}
                </div>
            </main>
        </AppLayout>
    );
}

function ActiveContract({ contract }: { contract: PartnerContractRow }) {
    return (
        <section className="rounded-xl border border-[#e1e3e2] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[#e1e3e2] pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="text-2xl font-semibold text-[#191c1c]">Kontrak Aktif </h2></div>
                <div className="flex flex-wrap gap-2"><GradePill grade={contract.grade} /><StatusPill status={contract.status} /></div>
            </div>
            <div className="my-5 grid gap-3 md:grid-cols-3">
                <Capacity label="Min" value={contract.min_capacity_kg} />
                <Capacity label="Ideal" value={contract.ideal_capacity_kg} ideal />
                <Capacity label="Maks" value={contract.max_capacity_kg} />
            </div>
            <div className="flex flex-col gap-3 border-t border-[#e1e3e2] pt-4 text-sm text-[#424841] sm:flex-row sm:items-center sm:justify-between">
                <p>Frekuensi: <strong className="font-semibold text-[#191c1c]">{frequencyLabels[contract.frequency] ?? contract.frequency}</strong></p>
                <p className="font-semibold text-[#191c1c]">Harga beli {formatRupiah(contract.buy_price)}/kg</p>
            </div>
        </section>
    );
}

function ContractTable({ contracts }: { contracts: PartnerContractRow[] }) {
    return (
        <section className="overflow-hidden rounded-xl border border-[#e1e3e2] bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] border-collapse text-left">
                    <thead><tr className="border-b border-[#e1e3e2] bg-[#f3f4f3] text-xs font-semibold uppercase tracking-wider text-[#576152]"><th className="px-4 py-3">Kontrak</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3">Kapasitas (Min-Ideal-Maks)</th><th className="px-4 py-3">Frekuensi</th><th className="px-4 py-3">Harga Beli</th><th className="px-4 py-3">Harga Jual</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Periode</th></tr></thead>
                    <tbody className="divide-y divide-[#e1e3e2] text-sm">
                        {contracts.map((contract) => <tr key={contract.id} className="transition-colors hover:bg-[#f9f9f8]"><td className="px-4 py-4 font-semibold text-[#191c1c]"><p>{contract.name?.trim() || `Kontrak ${contract.id}`}</p><p className="mt-1 text-[13px] font-normal text-[#424841]">#CTR-MTR-{String(contract.id).padStart(4, '0')}</p></td><td className="px-4 py-4"><GradePill grade={contract.grade} /></td><td className="px-4 py-4 font-medium tabular-nums text-[#191c1c]">{formatKg(contract.min_capacity_kg)}-{formatKg(contract.ideal_capacity_kg)}-{formatKg(contract.max_capacity_kg)} kg</td><td className="px-4 py-4 text-[#424841]">{frequencyLabels[contract.frequency] ?? contract.frequency}</td><td className="px-4 py-4 font-medium tabular-nums text-[#191c1c]">{formatRupiah(contract.buy_price)}</td><td className="px-4 py-4 tabular-nums text-[#424841]">{formatRupiah(contract.sell_price)}</td><td className="px-4 py-4"><StatusPill status={contract.status} /></td><td className="whitespace-nowrap px-4 py-4 text-right text-[#424841]">{contract.start_date ?? '-'} s/d {contract.end_date ?? '-'}</td></tr>)}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function Capacity({ label, value, ideal = false }: { label: string; value: number; ideal?: boolean }) {
    return <div className={`rounded-lg border p-4 text-center ${ideal ? 'border-[#fdecd4] bg-[#fff8f0]' : 'border-transparent bg-[#f3f4f3]'}`}><p className="text-xs font-semibold text-[#424841]">{label}</p><p className={`mt-1 text-2xl font-semibold ${ideal ? 'text-[#b87000]' : 'text-[#191c1c]'}`}>{formatKg(value)} kg</p></div>;
}

function GradePill({ grade }: { grade: string }) {
    return <span className="inline-flex rounded-full bg-[#e1e3e2] px-3 py-1 text-xs font-semibold text-[#576152]">{grade}</span>;
}

function StatusPill({ status }: { status: PartnerContractRow['status'] }) {
    return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>{statusLabels[status]}</span>;
}
