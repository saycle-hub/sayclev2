import { RouteMap } from '@/components/route-map';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertTriangle, MapPin, RotateCw, Truck } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Rute', href: '/routes' },
];

interface Stop {
    id: number;
    order: number;
    contact: string;
    address: string;
    lat: number;
    lng: number;
    kg: number;
    distance_m: number;
    duration_s: number;
    status: string;
}

interface VehicleRoute {
    vehicle_id: number;
    vehicle_name: string;
    capacity_kg: number;
    color: string;
    load_kg: number;
    distance_km: number;
    duration_min: number;
    all_assigned: boolean;
    officer_name?: string | null;
    stops: Stop[];
}

interface Unassigned {
    id: number;
    contact: string;
    kg: number;
}

interface Props {
    routes?: VehicleRoute[];
    unassigned?: Unassigned[];
    noCoordsCount?: number;
    depot?: { lat: number; lng: number };
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

export default function RoutesIndex({
    routes = [],
    unassigned = [],
    noCoordsCount = 0,
    depot = { lat: -7.7123, lng: 110.3621 },
}: Props) {
    const form = useForm({});
    const [showUnassignedModal, setShowUnassignedModal] = useState(false);

    const runOptimize = () => {
        form.post(route('routes.optimize'));
    };

    const totalStops = routes.reduce((acc, r) => acc + r.stops.length, 0);
    const totalKg = routes.reduce((acc, r) => acc + r.load_kg, 0);
    const totalKm = routes.reduce((acc, r) => acc + r.distance_km, 0);

    // Build Leaflet Route Map data starting from Depot
    let globalOrder = 1;
    const mapStops: any[] = [];
    const mapLines: any[] = [];

    routes.forEach((r) => {
        const routePoints: [number, number][] = [[depot.lat, depot.lng]];

        r.stops.forEach((stop) => {
            if (stop.lat !== 0 && stop.lng !== 0) {
                mapStops.push({
                    lat: stop.lat,
                    lng: stop.lng,
                    order: globalOrder++,
                    label: `${r.vehicle_name} (Stop ${stop.order}): ${stop.contact} — ${fmtKg(stop.kg)}`,
                    color: r.color,
                });
                routePoints.push([stop.lat, stop.lng]);
            }
        });

        if (routePoints.length > 1) {
            // Return back to depot
            routePoints.push([depot.lat, depot.lng]);
            mapLines.push({
                color: r.color,
                points: routePoints,
            });
        }
    });

    const hasStops = totalStops > 0;

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            title="Rute Penjemputan Pemasok"
            description="Optimasi rute penjemputan sampah organik dari pemasok ke gudang utama."
            actions={
                <>
                    <Link
                        href={route('vehicles.index')}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 text-sm font-medium text-white hover:bg-white hover:text-[#0f5235] transition-all"
                    >
                        <Truck size={16} aria-hidden />
                        Kendaraan
                    </Link>
                    <button
                        type="button"
                        onClick={runOptimize}
                        disabled={form.processing}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 font-semibold text-[#0f5235] hover:bg-white/90 shadow-sm transition-all disabled:opacity-60"
                    >
                        <RotateCw size={16} className={form.processing ? 'animate-spin' : ''} aria-hidden />
                        Optimasi Rute
                    </button>
                </>
            }
        >
            <Head title="Rute Penjemputan" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 text-[#18352a]">

                {/* Top Notification Bar for Unassigned Capacity Overflow */}
                {unassigned.length > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#2f6848]/30 bg-[#2f6848]/10 p-3.5 px-5 text-[#18352a] shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2f6848]/20 text-[#2f6848]">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[#18352a]">
                                    {unassigned.length} Titik Penjemputan Melebihi Kapasitas Armada
                                </p>
                                <p className="text-xs text-[#18352a]/70">
                                    Beberapa lokasi penjemputan belum tertampung pada rute aktif hari ini.
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            onClick={() => setShowUnassignedModal(true)}
                            className="h-9 rounded-xl bg-[#18352a] px-4 text-xs font-bold text-white hover:bg-[#2f6848] transition-all shrink-0"
                        >
                            Lihat Rincian ({unassigned.length})
                        </Button>
                    </div>
                )}

                {/* Warnings */}
                {noCoordsCount > 0 && (
                    <div role="status" className="rounded-xl border border-[#e88c12]/40 bg-[#e88c12]/10 p-4 text-sm text-[#18352a]">
                        {noCoordsCount} laporan tanpa koordinat GPS — perlu penanganan manual.
                    </div>
                )}

                {hasStops ? (
                    <>
                        {/* Summary strip */}
                        <dl className="flex flex-wrap gap-6 text-sm text-[#18352a]">
                            <div>
                                <dt className="text-[#18352a]/70">Total titik</dt>
                                <dd className="text-lg font-semibold tabular-nums">{totalStops}</dd>
                            </div>
                            <div>
                                <dt className="text-[#18352a]/70">Muatan</dt>
                                <dd className="text-lg font-semibold tabular-nums">{fmtKg(totalKg)}</dd>
                            </div>
                            <div>
                                <dt className="text-[#18352a]/70">Jarak tempuh</dt>
                                <dd className="text-lg font-semibold tabular-nums">{fmtKm(totalKm)}</dd>
                            </div>
                        </dl>

                        {/* Map */}
                        <div className="overflow-hidden rounded-2xl border-0 bg-white shadow-sm">
                            <RouteMap depot={depot} stops={mapStops} lines={mapLines} className="h-[420px] w-full" />
                        </div>

                        {/* Vehicle route cards */}
                        <div className="grid gap-4 lg:grid-cols-2">
                            {routes.map((r) => (
                                <div
                                    key={r.vehicle_id}
                                    className="flex flex-col justify-between rounded-2xl border border-[#18352a]/10 bg-white p-5 shadow-sm transition hover:border-[#2f6848]/40"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2">
                                            <Link
                                                href={route('routes.show', r.vehicle_id)}
                                                className="flex items-center gap-2 font-bold text-base text-[#18352a] hover:underline"
                                            >
                                                <span
                                                    className="inline-block size-3 rounded-full"
                                                    style={{ background: r.color }}
                                                    aria-hidden
                                                />
                                                <span>{r.vehicle_name}</span>
                                            </Link>
                                            {r.all_assigned && r.officer_name ? (
                                                <span className="rounded-full bg-[#2f6848]/10 px-3 py-1 text-xs font-bold text-[#2f6848]">
                                                    Driver: {r.officer_name}
                                                </span>
                                            ) : r.stops.length > 0 ? (
                                                <span className="rounded-full bg-[#e88c12]/15 px-3 py-1 text-xs font-bold text-[#e88c12]">
                                                    Belum Ditugaskan
                                                </span>
                                            ) : null}
                                        </div>

                                        <dl className="mt-3 grid grid-cols-3 gap-2 text-sm bg-[#F2F7F3] p-3 rounded-xl">
                                            <div>
                                                <dt className="text-xs text-[#18352a]/70">Titik</dt>
                                                <dd className="font-semibold tabular-nums">{r.stops.length}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs text-[#18352a]/70">Jarak</dt>
                                                <dd className="font-semibold tabular-nums">{fmtKm(r.distance_km)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs text-[#18352a]/70">Durasi</dt>
                                                <dd className="font-semibold tabular-nums">{fmtMin(r.duration_min)}</dd>
                                            </div>
                                        </dl>

                                        {/* Capacity bar */}
                                        <div className="mt-3">
                                            <div className="h-1.5 w-full rounded-full bg-[#2f6848]/10">
                                                <div
                                                    className="h-1.5 rounded-full bg-[#2f6848]"
                                                    style={{ width: `${Math.min(100, (r.load_kg / r.capacity_kg) * 100)}%` }}
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-[#18352a]/70 tabular-nums">
                                                Kapasitas: {fmtKg(r.load_kg)} / {fmtKg(r.capacity_kg)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action & Assignment Footer */}
                                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#18352a]/10 pt-3">
                                        <Link
                                            href={route('routes.show', r.vehicle_id)}
                                            className="text-xs font-bold text-[#2f6848] hover:underline"
                                        >
                                            Lihat rute detail →
                                        </Link>

                                        {r.stops.length > 0 && (!r.all_assigned || !r.officer_name) && (
                                            <Link
                                                href={route('routes.show', r.vehicle_id)}
                                                className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#2f6848] px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#18352a]"
                                            >
                                                Tugaskan Driver
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2f6848]/25 bg-white py-16 text-center">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#d7e6c9]">
                            <MapPin size={20} />
                        </div>
                        <h2 className="mt-4 text-lg font-semibold text-[#18352a]">Belum ada rute</h2>
                        <p className="mt-1 max-w-md text-sm text-[#18352a]/70">
                            Jalankan optimasi untuk membuat rute pickup dari laporan yang masuk.
                        </p>
                    </div>
                )}
            </div>

            {/* Unassigned Capacity Modal Dialog */}
            <Dialog open={showUnassignedModal} onOpenChange={setShowUnassignedModal}>
                <DialogContent className="bg-white text-[#18352a] border border-[#8FB996]/35 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-[#18352a] flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-[#2f6848]" />
                            {unassigned.length} Titik Penjemputan Melebihi Kapasitas
                        </DialogTitle>
                        <DialogDescription className="text-[#709775]">
                            Lokasi penjemputan dari laporan pemasok yang belum tertampung oleh armada aktif hari ini.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2 max-h-96 overflow-y-auto pr-1">
                        {unassigned.map((s) => (
                            <div key={s.id} className="flex justify-between items-center text-xs p-3 rounded-xl bg-[#F2F7F3] border border-[#8FB996]/20">
                                <div className="space-y-0.5">
                                    <p className="font-bold text-[#18352a]">{s.contact}</p>
                                    <p className="text-[11px] text-[#709775]">Penjemputan #{s.id}</p>
                                </div>
                                <span className="font-mono font-bold text-[#2f6848] bg-[#2f6848]/10 px-2.5 py-1 rounded-lg">
                                    {fmtKg(s.kg)}
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
