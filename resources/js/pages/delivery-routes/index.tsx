import { RouteMap } from '@/components/route-map';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertTriangle, Calendar, MapPin, RotateCw, Truck, UserCheck } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Rute pengiriman', href: '/delivery-routes' },
];

interface Trip {
    id: number;
    delivery_id: number;
    stop_order: number | null;
    stop?: number;
    load_kg: number;
    capacity_kg: number;
    officer: { id: number; name: string } | null;
    status: string;
    distance_m: number;
    duration_s: number;
    estimation_source: string | null;
    partner: { id?: number; name: string | null; address: string | null; lat?: number; lng?: number } | null;
    destination?: { id?: number; name: string | null; address: string | null; lat?: number; lng?: number } | null;
    metrics: { distance_m: number; duration_s: number };
}

interface DeliveryRoute {
    vehicle_id: number;
    vehicle_name: string;
    capacity_kg: number;
    color?: string;
    load_kg: number;
    distance_km?: number;
    duration_min?: number;
    all_assigned?: boolean;
    officer_id?: number | null;
    officer_name?: string | null;
    trips: Trip[];
}

interface Unassigned {
    delivery_id: number;
    partner: string | null;
    kg: number;
    reason: string;
}

interface HorizonDay {
    date: string;
    day_name: string;
    day_short: string;
    is_today: boolean;
    is_past: boolean;
    is_future: boolean;
    delivery_count: number;
}

interface Props {
    selectedDate: string;
    scheduleHorizon?: HorizonDay[];
    deliveryRoutes?: DeliveryRoute[];
    unassignedDeliveries?: Unassigned[];
    depot?: { id?: number; name?: string; address?: string; lat: number; lng: number };
    officers?: { id: number; name: string }[];
    allVehicles?: { id: number; name: string; capacity_kg: number; is_active: boolean }[];
}

function fmtKm(km: number) {
    return `${km.toLocaleString('id-ID', { maximumFractionDigits: 1 })} km`;
}

function fmtMin(min: number) {
    if (min < 60) return `${min} mnt`;
    return `${Math.floor(min / 60)} j ${min % 60} mnt`;
}

function fmtKg(kg: number) {
    return `${kg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg`;
}

const DEFAULT_COLORS = ['#2f6848', '#315c72', '#6b4f2e', '#4a7c59', '#8a5a44', '#6d5843'];

export default function DeliveryRoutes({
    selectedDate,
    scheduleHorizon = [],
    deliveryRoutes = [],
    unassignedDeliveries = [],
    depot = { name: 'Gudang Utama Saycle Sleman', lat: -7.7123, lng: 110.3621 },
    officers = [],
}: Props) {
    const optimizeForm = useForm({ service_date: selectedDate });
    const assignForm = useForm({ officer_id: '', service_date: selectedDate });
    const [assigningVehicleId, setAssigningVehicleId] = useState<number | null>(null);
    const [vehicleFilter, setVehicleFilter] = useState('');
    const [showUnassignedModal, setShowUnassignedModal] = useState(false);

    const runOptimize = () => {
        optimizeForm.post('/delivery-routes/optimize', { preserveScroll: true });
    };

    const handleAssign = (vehicleId: number, officerId: string) => {
        assignForm.setData({ officer_id: officerId, service_date: selectedDate });
        assignForm.post(`/delivery-routes/${vehicleId}/assign`, {
            preserveScroll: true,
            onSuccess: () => setAssigningVehicleId(null),
        });
    };

    const filteredDeliveryRoutes = deliveryRoutes.filter((r) => {
        if (!vehicleFilter.trim()) return true;
        const q = vehicleFilter.toLowerCase();
        const vName = r.vehicle_name.toLowerCase();
        const oName = (r.officer_name || '').toLowerCase();
        return vName.includes(q) || oName.includes(q);
    });

    // Calculate overall stats
    const totalStops = deliveryRoutes.reduce((acc, r) => acc + r.trips.length, 0);
    const totalKg = deliveryRoutes.reduce((acc, r) => acc + r.load_kg, 0);
    const totalKm = deliveryRoutes.reduce((acc, r) => {
        const km = r.distance_km ?? r.trips.reduce((sum, t) => sum + (t.distance_m || 0), 0) / 1000;
        return acc + km;
    }, 0);

    // Build Leaflet Route Map data starting from Depot
    let globalOrder = 1;
    const mapStops: any[] = [];
    const mapLines: any[] = [];

    deliveryRoutes.forEach((r, idx) => {
        const color = r.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
        const routePoints: [number, number][] = [[depot.lat, depot.lng]];

        r.trips.forEach((trip) => {
            const pLat = trip.partner?.lat || trip.destination?.lat || 0;
            const pLng = trip.partner?.lng || trip.destination?.lng || 0;
            if (pLat !== 0 && pLng !== 0) {
                mapStops.push({
                    lat: pLat,
                    lng: pLng,
                    order: globalOrder++,
                    label: `${r.vehicle_name} (Stop ${trip.stop_order ?? '—'}): ${trip.partner?.name ?? trip.destination?.name ?? 'Mitra'} — ${fmtKg(trip.load_kg)}`,
                    color,
                });
                routePoints.push([pLat, pLng]);
            }
        });

        if (routePoints.length > 1) {
            // Return back to depot
            routePoints.push([depot.lat, depot.lng]);
            mapLines.push({
                color,
                points: routePoints,
            });
        }
    });

    const hasRoutes = totalStops > 0;

    const selectedHorizonDay = scheduleHorizon.find((d) => d.date === selectedDate);
    const isTodaySelected = selectedHorizonDay ? selectedHorizonDay.is_today : selectedDate === new Date().toLocaleDateString('sv');

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            title="Rute Pengiriman Mitra"
            description={`Optimasi rute distribusi produk hasil olahan dari gudang ke mitra (${selectedDate}).`}
            actions={
                <>
                    <Link
                        href="/vehicles"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 text-sm font-medium text-white hover:bg-white hover:text-[#0f5235] transition-all"
                    >
                        <Truck size={16} aria-hidden />
                        Kendaraan
                    </Link>
                    {isTodaySelected && (
                        <button
                            type="button"
                            onClick={runOptimize}
                            disabled={optimizeForm.processing}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 font-semibold text-[#0f5235] hover:bg-white/90 shadow-sm transition-all disabled:opacity-60"
                        >
                            <RotateCw size={16} className={optimizeForm.processing ? 'animate-spin' : ''} aria-hidden />
                            Optimasi Rute
                        </button>
                    )}
                </>
            }
        >
            <Head title="Rute Pengiriman" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 text-[#18352a]">

                {/* Top Notification Bar for Unassigned Delivery Capacity Overflow */}
                {unassignedDeliveries.length > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#2f6848]/30 bg-[#2f6848]/10 p-3.5 px-5 text-[#18352a] shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2f6848]/20 text-[#2f6848]">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[#18352a]">
                                    {unassignedDeliveries.length} Pengiriman Melebihi Kapasitas Armada
                                </p>
                                <p className="text-xs text-[#18352a]/70">
                                    Beberapa jadwal pengiriman ke mitra belum tertampung pada rute aktif hari ini.
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            onClick={() => setShowUnassignedModal(true)}
                            className="h-9 rounded-xl bg-[#18352a] px-4 text-xs font-bold text-white hover:bg-[#2f6848] transition-all shrink-0"
                        >
                            Lihat Rincian ({unassignedDeliveries.length})
                        </Button>
                    </div>
                )}

                {/* 7-Day Horizon Schedule Date Selector Bar */}
                {scheduleHorizon && scheduleHorizon.length > 0 && (
                    <section aria-labelledby="schedule-bar-heading" className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h2 id="schedule-bar-heading" className="text-sm font-bold text-[#18352a] flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-[#415D43]" />
                                Jadwal Pengiriman Mingguan (7 Hari Horizon)
                            </h2>
                            <span className="text-xs text-[#709775]">Klik tanggal untuk melihat rute</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                            {scheduleHorizon.map((day) => {
                                const isSelected = day.date === selectedDate;
                                const isPast = day.is_past;

                                // Hari yang sudah lewat: tampilkan sebagai disabled span (tidak bisa diklik)
                                if (isPast) {
                                    return (
                                        <span
                                            key={day.date}
                                            title={`${day.day_name} — Data historis (terkunci)`}
                                            aria-label={`${day.day_name} ${day.day_short} — sudah selesai, tidak bisa dinavigasi`}
                                            className="flex flex-col items-center justify-center rounded-2xl p-3 text-center border border-[#8FB996]/20 bg-[#f5f5f4] text-[#a8a29e] cursor-not-allowed select-none opacity-70"
                                        >
                                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a8a29e]/80">
                                                {day.day_name}
                                            </span>
                                            <span className="text-sm font-bold mt-0.5 line-through">{day.day_short}</span>
                                            <span className="mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#e7e5e4] text-[#78716c]">
                                                ✓ Selesai
                                            </span>
                                        </span>
                                    );
                                }

                                // Hari ini & mendatang: bisa diklik
                                return (
                                    <Link
                                        key={day.date}
                                        href={`/delivery-routes?service_date=${day.date}`}
                                        className={`flex flex-col items-center justify-center rounded-2xl p-3 text-center border transition-all ${
                                            isSelected
                                                ? 'border-[#415D43] bg-[#415D43] text-white shadow-md'
                                                : day.is_today
                                                    ? 'border-[#2f6848]/50 bg-[#eef7f1] text-[#111D13] hover:border-[#415D43]/60 hover:bg-[#e2f0e6] ring-1 ring-[#2f6848]/30'
                                                    : 'border-[#8FB996]/35 bg-white text-[#111D13] hover:border-[#415D43]/60 hover:bg-[#F2F7F3]'
                                        }`}
                                    >
                                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                                            isSelected ? 'text-white/80' : day.is_today ? 'text-[#2f6848]' : 'text-[#709775]'
                                        }`}>
                                            {day.day_name}
                                        </span>
                                        <span className="text-sm font-bold mt-0.5">{day.day_short}</span>
                                        {day.is_today && !isSelected && (
                                            <span className="mt-1 text-[9px] font-bold text-[#2f6848] uppercase tracking-wide">Hari ini</span>
                                        )}
                                        {day.delivery_count > 0 ? (
                                            <span className={`mt-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                                isSelected ? 'bg-white/20 text-white' : 'bg-[#415D43]/10 text-[#415D43]'
                                            }`}>
                                                {day.delivery_count} titik
                                            </span>
                                        ) : (
                                            <span className={`mt-1.5 text-[10px] ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
                                                Kosong
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Date & Warehouse Info Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#8FB996]/30 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-[#2f6848]/10 text-[#2f6848]">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                            <span className="text-xs text-[#18352a]/70">Tanggal Layanan Terpilih</span>
                            <p className="font-bold text-[#18352a]">{selectedDate}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#18352a]/80 bg-[#F2F7F3] px-3.5 py-2 rounded-xl border border-[#8FB996]/20">
                        <MapPin className="h-4 w-4 text-[#e88c12]" />
                        <span>Titik Asal Depot: <strong>{depot.name || 'Gudang Utama Saycle Sleman'}</strong> ({depot.lat.toFixed(4)}, {depot.lng.toFixed(4)})</span>
                    </div>
                </div>

                {hasRoutes ? (
                    <>
                        {/* Metrics Summary Strip */}
                        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm bg-white p-4 rounded-2xl border border-[#8FB996]/30 shadow-sm">
                            <div className="space-y-0.5">
                                <dt className="text-xs text-[#18352a]/70">Total Pengiriman</dt>
                                <dd className="text-xl font-bold tabular-nums text-[#18352a]">{totalStops} Titik</dd>
                            </div>
                            <div className="space-y-0.5">
                                <dt className="text-xs text-[#18352a]/70">Total Muatan Mitra</dt>
                                <dd className="text-xl font-bold tabular-nums text-[#2f6848]">{fmtKg(totalKg)}</dd>
                            </div>
                            <div className="space-y-0.5 col-span-2 sm:col-span-1">
                                <dt className="text-xs text-[#18352a]/70">Est. Jarak Tempuh</dt>
                                <dd className="text-xl font-bold tabular-nums text-[#e88c12]">{fmtKm(totalKm)}</dd>
                            </div>
                        </dl>

                        {/* Interactive Leaflet Route Map */}
                        <div className="overflow-hidden rounded-2xl border border-[#8FB996]/35 bg-white shadow-sm">
                            <div className="border-b border-[#8FB996]/20 bg-[#F2F7F3] px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-[#18352a]">
                                <span>Peta Rute Distribusi Pengiriman Multi-Kendaraan</span>
                                <span className="text-[#2f6848] font-normal">Depo Gudang ➔ Mitra ➔ Return Depo</span>
                            </div>
                            <RouteMap depot={depot} stops={mapStops} lines={mapLines} className="h-[420px] w-full" />
                        </div>

                        {/* Vehicle Route Cards Section Header with Filter */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <h2 className="text-base font-bold text-[#18352a]">
                                Rute Kendaraan ({filteredDeliveryRoutes.length} Armada Aktif)
                            </h2>
                            {deliveryRoutes.length > 2 && (
                                <div className="relative w-full sm:w-64">
                                    <input
                                        type="text"
                                        placeholder="Cari armada / driver..."
                                        value={vehicleFilter}
                                        onChange={(e) => setVehicleFilter(e.target.value)}
                                        className="w-full rounded-xl border border-[#8FB996]/40 bg-white px-3 py-1.5 text-xs text-[#18352a] focus:border-[#415D43] focus:outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Vehicle Route Cards */}
                        <div className="grid gap-4 lg:grid-cols-2">
                            {filteredDeliveryRoutes.map((r, idx) => {
                                const color = r.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
                                const distanceKm = r.distance_km ?? r.trips.reduce((sum, t) => sum + (t.distance_m || 0), 0) / 1000;
                                const durationMin = r.duration_min ?? Math.ceil(r.trips.reduce((sum, t) => sum + (t.duration_s || 0), 0) / 60);
                                const officerName = r.officer_name || r.trips.find((t) => t.officer?.name)?.officer?.name;

                                return (
                                    <div
                                        key={r.vehicle_id}
                                        className="flex flex-col justify-between rounded-2xl border border-[#8FB996]/35 bg-white p-5 shadow-sm transition hover:border-[#2f6848]/50 space-y-4"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2">
                                                <Link
                                                    href={`/delivery-routes/${r.vehicle_id}?service_date=${selectedDate}`}
                                                    className="flex items-center gap-2 font-bold text-base text-[#18352a] hover:underline"
                                                >
                                                    <span
                                                        className="inline-block size-3 rounded-full"
                                                        style={{ background: color }}
                                                        aria-hidden
                                                    />
                                                    <span>{r.vehicle_name}</span>
                                                </Link>
                                                {officerName ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#2f6848]/10 px-3 py-1 text-xs font-bold text-[#2f6848]">
                                                        <UserCheck className="h-3 w-3" /> Driver: {officerName}
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-[#e88c12]/15 px-3 py-1 text-xs font-bold text-[#e88c12]">
                                                        Belum Ditugaskan
                                                    </span>
                                                )}
                                            </div>

                                            {/* Metrics overview */}
                                            <dl className="mt-3 grid grid-cols-4 gap-2 text-sm bg-[#F2F7F3]/70 p-3 rounded-xl border border-[#8FB996]/20">
                                                <div>
                                                    <dt className="text-xs text-[#18352a]/70">Titik</dt>
                                                    <dd className="font-semibold tabular-nums">{r.trips.length}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs text-[#18352a]/70">Muatan</dt>
                                                    <dd className="font-semibold tabular-nums">{fmtKg(r.load_kg)}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs text-[#18352a]/70">Jarak</dt>
                                                    <dd className="font-semibold tabular-nums">{fmtKm(distanceKm)}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs text-[#18352a]/70">Durasi</dt>
                                                    <dd className="font-semibold tabular-nums">{fmtMin(durationMin)}</dd>
                                                </div>
                                            </dl>

                                            {/* Vehicle Capacity Bar */}
                                            <div className="mt-3">
                                                <div className="flex justify-between text-xs text-[#18352a]/70 mb-1">
                                                    <span>Penggunaan Kapasitas</span>
                                                    <span className="font-semibold">{Math.round((r.load_kg / r.capacity_kg) * 100)}%</span>
                                                </div>
                                                <div className="h-2 w-full rounded-full bg-[#2f6848]/10 overflow-hidden">
                                                    <div
                                                        className="h-2 rounded-full transition-all"
                                                        style={{
                                                            width: `${Math.min(100, (r.load_kg / r.capacity_kg) * 100)}%`,
                                                            backgroundColor: color,
                                                        }}
                                                    />
                                                </div>
                                                <p className="mt-1 text-xs text-[#18352a]/70 tabular-nums">
                                                    {fmtKg(r.load_kg)} dari {fmtKg(r.capacity_kg)}
                                                </p>
                                            </div>

                                            {/* Stop list */}
                                            <ol className="mt-4 space-y-2.5 border-t border-[#8FB996]/20 pt-3">
                                                {r.trips.map((trip) => (
                                                    <li key={trip.id} className="flex items-start gap-2.5 text-sm">
                                                        <span
                                                            className="flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white mt-0.5"
                                                            style={{ backgroundColor: color }}
                                                        >
                                                            {trip.stop_order ?? '—'}
                                                        </span>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <span className="font-semibold text-[#18352a]">
                                                                    {trip.partner?.name ?? trip.destination?.name ?? 'Mitra'}
                                                                </span>
                                                                <span className="text-xs font-mono font-bold text-[#2f6848]">
                                                                    {trip.load_kg} kg
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-[#18352a]/70 line-clamp-1">
                                                                {trip.partner?.address ?? trip.destination?.address ?? 'Alamat tidak tersedia'}
                                                            </p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>

                                        {/* Driver Assignment Action */}
                                        <div className="border-t border-[#8FB996]/20 pt-3 space-y-2">
                                            {officers.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        className="flex-1 min-h-9 rounded-xl border border-[#8FB996]/50 text-xs px-2.5 py-1 text-[#18352a] focus:border-[#2f6848] focus:ring-[#2f6848]/20 bg-white"
                                                        value={r.officer_id ? String(r.officer_id) : (r.trips.find((t) => t.officer?.id)?.officer?.id ? String(r.trips.find((t) => t.officer?.id)?.officer?.id) : '')}
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                handleAssign(r.vehicle_id, e.target.value);
                                                            }
                                                        }}
                                                    >
                                                        <option value="">-- Pilih Petugas / Driver --</option>
                                                        {officers.map((off) => (
                                                            <option key={off.id} value={String(off.id)}>
                                                                {off.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <Link
                                                        href={`/delivery-routes/${r.vehicle_id}?service_date=${selectedDate}`}
                                                        className="text-xs font-bold text-[#2f6848] hover:underline shrink-0"
                                                    >
                                                        Detail →
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2f6848]/30 bg-white py-16 text-center shadow-sm space-y-3">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-[#d7e6c9] text-[#2f6848]">
                            <Truck size={28} />
                        </div>
                        <h2 className="text-lg font-bold text-[#18352a]">Belum Ada Rute Pengiriman Ditugaskan</h2>
                        <p className="max-w-md text-xs text-[#18352a]/70">
                            Jalankan optimasi rute untuk mengelompokkan jadwal pengiriman mitra ke armada kendaraan berdasarkan titik koordinat dan kapasitas gudang.
                        </p>
                        {isTodaySelected ? (
                            <button
                                type="button"
                                onClick={runOptimize}
                                disabled={optimizeForm.processing}
                                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#2f6848] px-5 text-xs font-bold text-white hover:bg-[#18352a] transition-all shadow-sm disabled:opacity-60 mt-2"
                            >
                                <RotateCw size={14} className={optimizeForm.processing ? 'animate-spin' : ''} aria-hidden />
                                Jalankan Optimasi Rute
                            </button>
                        ) : (
                            <p className="mt-2 text-xs font-semibold text-[#2f6848] bg-[#2f6848]/10 px-3.5 py-1.5 rounded-full">
                                Optimasi rute pengiriman hanya dapat dijalankan pada tanggal hari ini.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Unassigned Deliveries Modal Dialog */}
            <Dialog open={showUnassignedModal} onOpenChange={setShowUnassignedModal}>
                <DialogContent className="bg-white text-[#18352a] border border-[#8FB996]/35 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-[#18352a] flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-[#2f6848]" />
                            {unassignedDeliveries.length} Pengiriman Melebihi Kapasitas
                        </DialogTitle>
                        <DialogDescription className="text-[#709775]">
                            Jadwal pengiriman mitra yang belum tertampung oleh armada aktif pada tanggal {selectedDate}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2 max-h-96 overflow-y-auto pr-1">
                        {unassignedDeliveries.map((item) => (
                            <div key={item.delivery_id} className="flex justify-between items-center text-xs p-3 rounded-xl bg-[#F2F7F3] border border-[#8FB996]/20">
                                <div className="space-y-0.5">
                                    <p className="font-bold text-[#18352a]">{item.partner ?? 'Mitra'}</p>
                                    <p className="text-[11px] text-[#e88c12] font-medium">{item.reason}</p>
                                </div>
                                <span className="font-mono font-bold text-[#2f6848] bg-[#2f6848]/10 px-2.5 py-1 rounded-lg">
                                    {fmtKg(item.kg)}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button variant="outline" onClick={() => setShowUnassignedModal(false)}>
                            Tutup
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
