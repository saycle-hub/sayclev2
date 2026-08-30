import { RouteMap } from '@/components/route-map';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { MapPin, Play, Truck } from 'lucide-react';

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
    officer_name: string | null;
    stops: Stop[];
}

interface UnassignedSale {
    id: number;
    contact: string;
    kg: number;
    lat: number;
    lng: number;
}

interface Props {
    depot: { lat: number; lng: number };
    routes: VehicleRoute[];
    unassigned: UnassignedSale[];
    noCoordsCount: number;
    officers: { id: number; name: string }[];
    allVehicles: { id: number; name: string; capacity_kg: number; is_active: boolean }[];
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

export default function RoutesIndex({ depot, routes, unassigned, noCoordsCount, officers, allVehicles }: Props) {
    const optimizeForm = useForm({});

    const runOptimize = () => {
        optimizeForm.post(route('routes.optimize'), { preserveScroll: true });
    };

    const totalStops = routes.reduce((s, r) => s + r.stops.length, 0);
    const totalKg = routes.reduce((s, r) => s + r.load_kg, 0);
    const totalKm = routes.reduce((s, r) => s + r.distance_km, 0);

    // Build map data
    const mapStops = routes.flatMap((r) =>
        r.stops.map((s) => ({ lat: s.lat, lng: s.lng, order: s.order, label: `${s.contact} — ${fmtKg(s.kg)}`, color: r.color })),
    );
    const mapLines = routes
        .filter((r) => r.stops.length > 0)
        .map((r) => ({
            color: r.color,
            points: [[depot.lat, depot.lng] as [number, number], ...r.stops.map((s) => [s.lat, s.lng] as [number, number])],
        }));

    const hasStops = totalStops > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rute pickup" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-[#f4f3ed] p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Rute pickup</h1>
                        <p className="mt-1 text-sm text-[#18352a]/70">
                            Optimasi rute pengambilan limbah sayur dari supplier ke gudang.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('vehicles.index')}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#2f6848]/25 bg-white px-4 text-sm font-medium text-[#18352a] hover:bg-[#2f6848]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88c12]"
                        >
                            <Truck size={16} aria-hidden />
                            Kendaraan
                        </Link>
                        <button
                            type="button"
                            onClick={runOptimize}
                            disabled={optimizeForm.processing}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#e88c12] px-5 font-semibold text-[#18352a] hover:bg-[#f6b33c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88c12] disabled:opacity-60"
                        >
                            <Play size={16} aria-hidden />
                            {optimizeForm.processing ? 'Mengoptimasi…' : 'Jalankan optimasi'}
                        </button>
                    </div>
                </div>

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
                        <div className="overflow-hidden rounded-2xl border border-[#2f6848]/15 bg-white">
                            <RouteMap depot={depot} stops={mapStops} lines={mapLines} className="h-[420px] w-full" />
                        </div>

                        {/* Vehicle route cards */}
                        <div className="grid gap-4 lg:grid-cols-2">
                            {routes.map((r) => (
                                <Link
                                    key={r.vehicle_id}
                                    href={route('routes.show', r.vehicle_id)}
                                    className="rounded-2xl border border-[#2f6848]/15 bg-white p-5 transition hover:border-[#2f6848]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88c12]"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="inline-block size-3 rounded-full"
                                                style={{ background: r.color }}
                                                aria-hidden
                                            />
                                            <span className="font-semibold text-[#18352a]">{r.vehicle_name}</span>
                                        </div>
                                        {r.all_assigned && r.officer_name ? (
                                            <span className="rounded-full bg-[#2f6848]/10 px-2.5 py-1 text-xs font-semibold text-[#2f6848]">
                                                {r.officer_name}
                                            </span>
                                        ) : r.stops.length > 0 ? (
                                            <span className="rounded-full bg-[#e88c12]/15 px-2.5 py-1 text-xs font-semibold text-[#18352a]">
                                                Belum ditugaskan
                                            </span>
                                        ) : null}
                                    </div>
                                    <dl className="mt-3 grid grid-cols-4 gap-3 text-sm">
                                        <div>
                                            <dt className="text-[#18352a]/70">Titik</dt>
                                            <dd className="font-semibold tabular-nums">{r.stops.length}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-[#18352a]/70">Muatan</dt>
                                            <dd className="font-semibold tabular-nums">
                                                {fmtKg(r.load_kg)}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-[#18352a]/70">Jarak</dt>
                                            <dd className="font-semibold tabular-nums">{fmtKm(r.distance_km)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-[#18352a]/70">Durasi</dt>
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
                                            {fmtKg(r.load_kg)} / {fmtKg(r.capacity_kg)}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Unassigned overflow */}
                        {unassigned.length > 0 && (
                            <div className="rounded-2xl border border-dashed border-[#e88c12]/40 bg-white p-5">
                                <h2 className="font-semibold text-[#18352a]">
                                    <MapPin size={16} className="mr-1 inline" aria-hidden />
                                    {unassigned.length} titik melebihi kapasitas armada
                                </h2>
                                <ul className="mt-3 space-y-1 text-sm text-[#18352a]/70">
                                    {unassigned.map((s) => (
                                        <li key={s.id}>
                                            {s.contact} — {fmtKg(s.kg)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
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
        </AppLayout>
    );
}
