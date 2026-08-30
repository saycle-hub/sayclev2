import { GradeBadge } from '@/components/grade-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { CalendarDays, CheckCircle2, Info, MoreVertical, Scale, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Beranda', href: '/partner' },
    { title: 'Pengiriman', href: '/partner/deliveries' },
];

export interface DeliveryRow {
    id: number;
    status: string;
    status_label: string;
    estimated_kg: number | null;
    actual_kg: number | null;
    grade: string | null;
    vehicle_name: string | null;
    checked_in_at: string | null;
    created_at: string;
    address: string | null;
}

interface Props {
    deliveries: DeliveryRow[];
}

const statusStyles: Record<string, string> = {
    pending: 'border-[#e8af30] bg-amber-50 text-[#8a6400]',
    assigned: 'border-[#476648] bg-[#edf4e9] text-[#304e32]',
    in_progress: 'border-[#476648] bg-[#edf4e9] text-[#304e32]',
    done: 'border-[#163b1d] bg-[#c3eec2] text-[#163b1d]',
};

const formatKg = (value: number | null) => value === null ? '-' : value.toLocaleString('id-ID', { maximumFractionDigits: 1 });
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const deliveryId = (id: number) => `DLV-${String(id).padStart(6, '0')}`;

export default function PartnerDeliveries({ deliveries }: Props) {
    const [status, setStatus] = useState('all');
    const [grade, setGrade] = useState('all');
    const [period, setPeriod] = useState('all');

    const visible = useMemo(() => deliveries.filter((delivery) => {
        const date = new Date(delivery.created_at);
        const now = new Date();
        const matchesPeriod = period === 'all'
            || (period === 'month' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear())
            || (period === 'previous' && date.getMonth() === new Date(now.getFullYear(), now.getMonth() - 1).getMonth() && date.getFullYear() === new Date(now.getFullYear(), now.getMonth() - 1).getFullYear());

        return (status === 'all' || delivery.status === status)
            && (grade === 'all' || delivery.grade === grade)
            && matchesPeriod;
    }), [deliveries, grade, period, status]);

    const totalReceived = deliveries.reduce((sum, delivery) => sum + (delivery.actual_kg ?? 0), 0);
    const done = deliveries.filter((delivery) => delivery.status === 'done').length;
    const scheduled = deliveries.filter((delivery) => delivery.status !== 'done').length;
    const thisMonth = deliveries.filter((delivery) => {
        const date = new Date(delivery.created_at);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengiriman Mitra" />
            <main className="min-h-full flex-1 bg-[#f9f9f8] p-4 text-[#191c1c] md:p-6 lg:p-8">
                <div className="mx-auto max-w-[1440px]">
                    <header className="mb-8">
                        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.01em] text-[#07240c] md:text-[32px]">Pengiriman</h1>
                        <p className="mt-3 text-[15px] text-[#424841]">Pantau jadwal dan status pengiriman logistik Anda.</p>
                    </header>

                    <section aria-label="Ringkasan pengiriman" className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        <Metric icon={Truck} label="Pengiriman Bulan Ini" value={thisMonth.toLocaleString('id-ID')} />
                        <Metric icon={Scale} label="Total Diterima" value={formatKg(totalReceived)} suffix="kg" />
                        <Metric icon={CalendarDays} label="Dijadwalkan" value={scheduled.toLocaleString('id-ID')} alert />
                        <Metric icon={CheckCircle2} label="Selesai" value={done.toLocaleString('id-ID')} success />
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-[#e1e3e2] bg-white">
                        <div className="flex flex-col gap-4 border-b border-[#e1e3e2] p-5 lg:flex-row lg:items-center lg:justify-between">
                            <h2 className="text-xl font-semibold text-[#07240c]">Daftar Pengiriman</h2>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <Filter value={status} onChange={setStatus} placeholder="Status (Semua)" options={[
                                    ['all', 'Status (Semua)'], ['pending', 'Dijadwalkan'], ['assigned', 'Ditugaskan'], ['in_progress', 'Dalam perjalanan'], ['done', 'Diterima'],
                                ]} />
                                <Filter value={grade} onChange={setGrade} placeholder="Grade (Semua)" options={[
                                    ['all', 'Grade (Semua)'], ['Layak', 'Layak'], ['Kurang Layak', 'Kurang Layak'], ['Tidak Layak', 'Tidak Layak'],
                                ]} />
                                <Filter value={period} onChange={setPeriod} placeholder="Semua periode" options={[
                                    ['all', 'Semua periode'], ['month', 'Bulan ini'], ['previous', 'Bulan lalu'],
                                ]} />
                            </div>
                        </div>

                        {visible.length === 0 ? (
                            <div className="grid min-h-72 place-items-center px-6 py-12 text-center">
                                <div><Truck className="mx-auto size-10 text-[#737970]" /><h3 className="mt-4 text-lg font-semibold text-[#191c1c]">Belum ada pengiriman</h3><p className="mt-2 max-w-md text-sm leading-6 text-[#424841]">Pengiriman akan muncul setelah admin membuat alokasi dan menjadwalkannya.</p></div>
                            </div>
                        ) : (
                            <>
                                <div className="grid gap-3 p-4 md:hidden">
                                    {visible.map((delivery) => <DeliveryCard key={delivery.id} delivery={delivery} />)}
                                </div>
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full min-w-[980px] border-collapse text-left">
                                        <thead><tr className="border-b border-[#e1e3e2] bg-white text-sm font-semibold text-[#424841]">
                                            <th className="p-4">ID Pengiriman</th><th className="p-4">Tanggal</th><th className="p-4">Grade</th><th className="p-4">Estimasi (kg)</th><th className="p-4">Berat Final (kg)</th><th className="p-4">Status</th><th className="p-4">Kendaraan</th><th className="p-4 text-right">Aksi</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-[#e1e3e2] text-sm">
                                            {visible.map((delivery) => (
                                                <tr key={delivery.id} className="transition-colors hover:bg-[#f3f4f3]">
                                                    <td className="p-4 font-semibold text-[#07240c]">{deliveryId(delivery.id)}</td>
                                                    <td className="whitespace-nowrap p-4">{formatDate(delivery.created_at)}</td>
                                                    <td className="p-4">{delivery.grade ? <GradeBadge grade={delivery.grade} className="rounded-full px-2.5 py-1" /> : '-'}</td>
                                                    <td className="p-4 tabular-nums">{formatKg(delivery.estimated_kg)}</td>
                                                    <td className="p-4 font-semibold tabular-nums text-[#07240c]">{formatKg(delivery.actual_kg)}</td>
                                                    <td className="p-4"><StatusBadge delivery={delivery} /></td>
                                                    <td className="p-4 text-[#424841]">{delivery.vehicle_name ?? '-'}</td>
                                                    <td className="p-4 text-right"><button type="button" aria-label={`Aksi ${deliveryId(delivery.id)}`} className="rounded-full p-2 text-[#424841] hover:bg-[#edeeed] hover:text-[#07240c]"><MoreVertical className="size-5" /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="border-t border-[#e1e3e2] p-4 text-sm text-[#424841]">Menampilkan {visible.length} dari {deliveries.length} pengiriman</div>
                            </>
                        )}
                    </section>

                    <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#c2c8be]/50 bg-[#dbe6d2] p-4 text-[#404a3b]">
                        <Info className="mt-0.5 size-5 shrink-0" /><p className="text-sm leading-6">Pelacakan kendaraan real-time belum tersedia pada MVP. Status diperbarui oleh admin dan officer melalui proses operasional.</p>
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}

function Metric({ icon: Icon, label, value, suffix, alert, success }: { icon: typeof Truck; label: string; value: string; suffix?: string; alert?: boolean; success?: boolean }) {
    return <article className="flex items-center rounded-xl border border-[#e1e3e2] bg-white p-5 transition-shadow hover:shadow-[0_4px_20px_rgba(29,58,32,0.05)]"><div className={`mr-4 grid size-12 shrink-0 place-items-center rounded-full ${success ? 'bg-[#c3eec2] text-[#163b1d]' : alert ? 'bg-[#e7e8e7] text-[#a47400]' : 'bg-[#dbe6d2] text-[#1d3a20]'}`}><Icon className="size-6" /></div><div><p className="text-xs font-semibold text-[#424841]">{label}</p><p className="mt-1 text-2xl font-semibold text-[#07240c]">{value}{suffix && <span className="ml-1 text-base font-normal text-[#424841]">{suffix}</span>}</p></div></article>;
}

function Filter({ value, onChange, placeholder, options }: { value: string; onChange: (value: string) => void; placeholder: string; options: [string, string][] }) {
    return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={placeholder} className="min-w-44 rounded-lg border-0 bg-[#f3f4f3] text-sm font-semibold text-[#191c1c] shadow-none focus:ring-[#07240c]"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map(([optionValue, label]) => <SelectItem key={optionValue} value={optionValue}>{label}</SelectItem>)}</SelectContent></Select>;
}

function StatusBadge({ delivery }: { delivery: DeliveryRow }) {
    return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[delivery.status] ?? 'border-[#c2c8be] bg-[#f3f4f3] text-[#424841]'}`}><span className="size-2 rounded-full bg-current" />{delivery.status_label}</span>;
}

function DeliveryCard({ delivery }: { delivery: DeliveryRow }) {
    return <article className="rounded-xl border border-[#e1e3e2] p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-[#07240c]">{deliveryId(delivery.id)}</p><StatusBadge delivery={delivery} /></div><p className="mt-2 text-sm text-[#424841]">{formatDate(delivery.created_at)}</p><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-[#737970]">Estimasi</p><p className="mt-1 font-semibold">{formatKg(delivery.estimated_kg)} kg</p></div><div><p className="text-xs text-[#737970]">Berat final</p><p className="mt-1 font-semibold">{formatKg(delivery.actual_kg)} kg</p></div><div><p className="text-xs text-[#737970]">Grade</p><div className="mt-1">{delivery.grade ? <GradeBadge grade={delivery.grade} /> : '-'}</div></div><div><p className="text-xs text-[#737970]">Kendaraan</p><p className="mt-1 font-semibold">{delivery.vehicle_name ?? '-'}</p></div></div></article>;
}
