import { AllocationBar } from '@/components/allocation-bar';
import { GradeBadge } from '@/components/grade-badge';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Building2, Calendar, Layers, MapPin, Play, ShieldCheck, Truck, Warehouse as WarehouseIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Alokasi', href: '/allocation' },
];

interface OverviewRow {
    grade: string;
    stock_kg: number;
    demand_kg: number;
    ideal_kg: number;
    maximum_kg: number;
    allocated_kg: number;
    held_kg: number;
    status: string;
}

interface AvailableWeek {
    date: string;
    week_start: string;
    week_end: string;
    label: string;
    is_selected: boolean;
    is_current: boolean;
}

interface PartnerAllocation {
    id: number;
    name: string;
    address: string;
    grade_preference: string | null;
    has_contract: boolean;
    contract_name: string;
    weekly_allocated_kg: number;
    primary_warehouse: string;
    daily_schedule: {
        date: string;
        day_name: string;
        day_short: string;
        kg: number;
        status: string;
        is_past?: boolean;
        is_today?: boolean;
        is_scheduled?: boolean;
        warehouses: { name: string; code: string; kg: number }[];
        is_multi_warehouse: boolean;
    }[];
}

const statusStyles: Record<string, string> = {
    Defisit: 'border-transparent bg-[#6b4f2e]/10 text-[#6b4f2e]',
    Normal: 'border-transparent bg-[#2f6848]/10 text-[#2f6848]',
    Surplus: 'border-transparent bg-[#e88c12]/15 text-[#18352a]',
    'Surplus ditahan': 'border-transparent bg-[#e88c12]/15 text-[#18352a]',
    'Belum dijalankan': 'border-transparent bg-[#18352a]/10 text-[#18352a]',
    'Tanpa kontrak': 'border-transparent bg-[#18352a]/10 text-[#18352a]',
};

function formatKg(value: number): string {
    const cleanValue = Math.abs(value) < 0.0001 ? 0 : value;
    return `${cleanValue.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg`;
}

export default function AllocationIndex({
    allocationDate,
    weekStart,
    weekEnd,
    availableWeeks = [],
    hasRun,
    overview,
    partners = [],
    heldGrades = 0,
}: {
    allocationDate?: string;
    weekStart?: string;
    weekEnd?: string;
    availableWeeks?: AvailableWeek[];
    hasRun: boolean;
    overview: OverviewRow[];
    partners?: PartnerAllocation[];
    heldGrades?: number;
}) {
    const form = useForm({
        date: allocationDate,
    });

    const selectedWeek = availableWeeks.find((w) => w.is_selected) ?? availableWeeks.find((w) => w.is_current);

    const run = () => {
        form.post(route('allocation.run'), { preserveScroll: true });
    };

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            title="Alokasi Harian"
            description={`Distribusi stok gudang per minggu (${selectedWeek?.label ?? 'Minggu Ini'}) ke mitra sesuai kontrak: minimum, ideal, lalu surplus.`}
            actions={
                <div className="flex flex-wrap items-center gap-3">
                    {availableWeeks.length > 0 && (
                        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 backdrop-blur-md text-white text-xs font-medium border border-white/20 shadow-inner">
                            <Calendar className="h-4 w-4 text-emerald-300 shrink-0" />
                            <span className="hidden sm:inline">Periode:</span>
                            <select
                                value={weekStart}
                                onChange={(e) => {
                                    router.get(route('allocation.index'), { date: e.target.value }, { preserveState: true });
                                }}
                                className="bg-white text-[#18352a] font-bold rounded-lg text-xs py-1 px-2.5 border-0 focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-sm"
                            >
                                {availableWeeks.map((w) => (
                                    <option key={w.week_start} value={w.date}>
                                        {w.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={run}
                        disabled={form.processing}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 font-semibold text-[#0f5235] hover:bg-white/90 shadow-sm transition-all disabled:opacity-60"
                    >
                        <Play size={16} aria-hidden="true" />
                        {form.processing ? 'Menjalankan…' : 'Jalankan alokasi harian'}
                    </button>
                </div>
            }
        >
            <Head title="Alokasi Harian" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {heldGrades > 0 && (
                    <div role="status" className="rounded-xl border border-[#e88c12]/40 bg-[#e88c12]/10 p-4 text-sm text-[#18352a]">
                        Ada surplus melebihi kapasitas semua mitra dan ditahan di gudang (tetap tercatat per grade, menunggu arahan tujuan).
                    </div>
                )}                {!hasRun && (
                    <div role="status" className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-sm text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Layers className="h-5 w-5 text-amber-700 shrink-0" />
                            <div>
                                <span className="font-bold">Alokasi Belum Dijalankan (Periode {selectedWeek?.label ?? 'Ini'}):</span> Jadwal dan target penyerapan mitra di bawah siap diproses. Klik tombol <strong>"Jalankan alokasi harian"</strong> untuk mendistribusikan stok gudang secara otomatis.
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-3">
                    {overview.map((row) => (
                        <Link
                            key={row.grade}
                            href={route('allocation.show', row.grade)}
                            className="rounded-2xl border border-[#8FB996]/35 bg-white p-5 shadow-[0_2px_8px_rgba(17,29,19,0.04)] transition hover:border-[#709775] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#709775]"
                        >
                            <div className="flex items-center justify-between gap-2 bg-[#415D43] -mx-5 -mt-5 px-5 py-3.5 mb-4 text-white">
                                <GradeBadge grade={row.grade} />
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[row.status] ?? statusStyles['Belum dijalankan']}`}>
                                    {row.status}
                                </span>
                            </div>
                            <dl className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <dt className="text-[#111D13]/70">Stok gudang</dt>
                                    <dd className="font-semibold text-[#111D13] tabular-nums">{formatKg(row.stock_kg)}</dd>
                                </div>
                                <div>
                                    <dt className="text-[#111D13]/70">Target ideal</dt>
                                    <dd className="font-semibold text-[#111D13] tabular-nums">{formatKg(row.ideal_kg)}</dd>
                                </div>
                                <div className="col-span-2 flex items-center justify-between text-xs text-[#111D13]/60 border-t border-[#18352a]/10 pt-2">
                                    <span>Batas min: <strong className="font-semibold text-[#111D13]">{formatKg(row.demand_kg)}</strong></span>
                                    <span>Kapasitas max: <strong className="font-semibold text-[#111D13]">{formatKg(row.maximum_kg)}</strong></span>
                                </div>
                                {row.held_kg > 0 && (
                                    <div className="col-span-2 rounded-lg bg-[#A1CCA5]/20 px-3 py-2">
                                        <dt className="text-[#111D13]/70">Ditahan di gudang</dt>
                                        <dd className="font-semibold text-[#111D13] tabular-nums">{formatKg(row.held_kg)}</dd>
                                    </div>
                                )}
                            </dl>
                            <div className="mt-4">
                                <AllocationBar
                                    allocated={row.allocated_kg}
                                    minimum={row.demand_kg}
                                    ideal={row.ideal_kg}
                                    maximum={row.maximum_kg}
                                />
                            </div>
                        </Link>
                    ))}
                </div>

                <section className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#18352a]/10 pb-3">
                        <div>
                            <h2 className="text-lg font-bold text-[#18352a] flex items-center gap-2">
                                <Truck className="h-5 w-5 text-[#2f6848]" />
                                Rincian Alokasi & Depo Pengirim per Mitra ({partners.length} Mitra)
                            </h2>
                            <p className="text-xs text-[#18352a]/70">
                                Jadwal harian penyerapan stok mitra dan penentuan gudang pengirim terdekat.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {partners.map((partner) => (
                            <div
                                key={partner.id}
                                className="overflow-hidden rounded-2xl border border-[#18352a]/10 bg-white p-5 shadow-sm space-y-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#18352a]/10 pb-3">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                                    partner.has_contract
                                                        ? 'bg-[#2f6848]/15 text-[#2f6848]'
                                                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                                                }`}
                                            >
                                                {partner.has_contract ? 'Kontrak Aktif' : 'Non-Kontrak (Reguler)'}
                                            </span>
                                            <span className="rounded-full bg-[#18352a]/10 px-2.5 py-0.5 text-xs font-bold text-[#18352a] capitalize">
                                                Supplai: {partner.delivery_frequency ?? 'harian'}
                                            </span>
                                            {partner.grade_preference && <GradeBadge grade={partner.grade_preference} />}
                                        </div>
                                        <h3 className="mt-1 text-base font-bold text-[#18352a]">{partner.name}</h3>
                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#18352a]/70">
                                            <MapPin className="h-3.5 w-3.5 text-[#e88c12]" />
                                            {partner.address}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-medium text-[#18352a]/60 block">Target Alokasi Minggu Ini</span>
                                        <span className="text-lg font-bold text-[#2f6848] tabular-nums">
                                            {partner.weekly_allocated_kg.toLocaleString('id-ID')} kg
                                        </span>
                                        <span className="mt-1 flex items-center justify-end gap-1 text-[11px] font-semibold text-[#18352a]/70">
                                            <WarehouseIcon className="h-3.5 w-3.5 text-[#2f6848]" />
                                            Depo Utama: {partner.primary_warehouse}
                                        </span>
                                    </div>
                                </div>

                                {/* 7-Day Schedule Horizon Cards */}
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                                    {partner.daily_schedule.map((day) => (
                                        <div
                                            key={day.date}
                                            className={`flex flex-col justify-between rounded-xl border p-2.5 transition-all text-xs ${
                                                day.is_past
                                                    ? 'border-gray-200 bg-gray-100/90 text-gray-500 opacity-80'
                                                    : !day.is_scheduled
                                                    ? 'border-dashed border-gray-200 bg-gray-50/50 text-gray-400'
                                                    : day.is_today
                                                    ? 'border-2 border-[#2f6848] bg-emerald-50/70 shadow-sm'
                                                    : day.is_multi_warehouse
                                                    ? 'border-emerald-400 bg-emerald-50/80 shadow-sm'
                                                    : day.kg > 0
                                                    ? 'border-[#18352a]/15 bg-white shadow-sm'
                                                    : 'border-dashed border-gray-200 bg-gray-50/40 text-gray-400'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between font-bold text-[#18352a]">
                                                    <span
                                                        className={`uppercase tracking-wider text-[10px] ${
                                                            day.is_past ? 'text-gray-400' : day.is_today ? 'text-[#2f6848] font-extrabold' : 'text-[#18352a]/60'
                                                        }`}
                                                    >
                                                        {day.day_name}
                                                    </span>
                                                    <span
                                                        className={`tabular-nums text-[10px] ${
                                                            day.is_past ? 'text-gray-400' : 'text-[#2f6848]'
                                                        }`}
                                                    >
                                                        {day.day_short}
                                                    </span>
                                                </div>
                                                <div
                                                    className={`mt-2 text-sm font-bold tabular-nums ${
                                                        day.is_past ? 'text-gray-500' : 'text-[#18352a]'
                                                    }`}
                                                >
                                                    {day.kg > 0 ? `${day.kg.toLocaleString('id-ID')} kg` : '—'}
                                                </div>
                                            </div>

                                            {day.is_past ? (
                                                <div className="mt-2 pt-2 border-t border-gray-200">
                                                    <span className="inline-block w-full rounded bg-[#2f6848]/15 px-1 py-0.5 text-center text-[10px] font-bold text-[#2f6848]">
                                                        Selesai
                                                    </span>
                                                </div>
                                            ) : !day.is_scheduled ? (
                                                <div className="mt-2 pt-2 border-t border-gray-200">
                                                    <span className="inline-block w-full rounded bg-gray-100 px-1 py-0.5 text-center text-[10px] font-medium text-gray-500">
                                                        Libur / Off
                                                    </span>
                                                </div>
                                            ) : (
                                                day.warehouses.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-[#18352a]/10 space-y-1">
                                                        {day.warehouses.map((wh) => (
                                                            <div
                                                                key={wh.code}
                                                                className="flex items-center justify-between text-[10px] text-[#18352a]/80 font-medium truncate"
                                                            >
                                                                <span className="truncate max-w-[70px]" title={wh.name}>
                                                                    {wh.code.replace('GDG-', '')}
                                                                </span>
                                                                <span className="font-bold text-[#2f6848] tabular-nums">{wh.kg}kg</span>
                                                            </div>
                                                        ))}
                                                        {day.is_multi_warehouse && (
                                                            <span className="inline-block w-full rounded bg-emerald-600 px-1 py-0.5 text-center text-[9px] font-extrabold uppercase text-white">
                                                                Multi-Gudang
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
