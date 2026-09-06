import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { MapPin, MessageCircle, LogOut, User, Navigation, PlayCircle, CheckCircle2 } from 'lucide-react';
import { FlashBanner } from '@/components/flash-banner';
import { SharedData } from '@/types';
import { RouteMap } from '@/components/route-map';

interface Props {
    pickups: RouteItem[];
    deliveries: RouteItem[];
    tasks?: RouteItem[];
}

interface RouteItem {
    id: number;
    task_type: 'pickup' | 'delivery';
    stop_order: number | null;
    status: string;
    scheduled_for: string | null;
    service_date: string | null;
    supplier: { name: string; phone: string; address: string | null } | null;
    destination: { name: string; address: string | null } | null;
    planned_kg: number;
    vehicle: { name: string } | null;
    latitude: number | null;
    longitude: number | null;
    wa_enroute_url?: string | null;
}

export default function OfficerDashboard({ pickups = [], deliveries = [] }: Props) {
    const { auth } = usePage<SharedData>().props;
    const user = auth?.user;

    const handleLogout = () => {
        router.post(route('logout'));
    };

    // Combine and sort stops in sequential order
    const allStops = [...pickups, ...deliveries].sort((a, b) => (a.stop_order ?? 99) - (b.stop_order ?? 99));

    const depot = { lat: -7.797068, lng: 110.370529 };

    const validStops = allStops.filter((s) => s.latitude !== null && s.longitude !== null);
    const stopsForMap = validStops.map((s) => ({
        lat: s.latitude!,
        lng: s.longitude!,
        order: s.stop_order ?? 1,
        label: s.task_type === 'pickup' ? (s.supplier?.name ?? 'Pickup') : (s.destination?.name ?? 'Delivery'),
        color: s.task_type === 'pickup' ? '#e88c12' : '#2f6848',
    }));

    const linesForMap = validStops.length > 0 ? [
        {
            color: '#2f6848',
            points: [
                [depot.lat, depot.lng] as [number, number],
                ...validStops.map((s) => [s.latitude!, s.longitude!] as [number, number]),
            ],
        },
    ] : [];

    return (
        <>
            <Head title="Dashboard Officer - Rute Tugas Hari Ini" />
            <div className="min-h-screen bg-[#f9fafb] pb-12">
                {/* Header Top Bar with Officer Profile & Logout */}
                <header className="sticky top-0 z-40 bg-[#18352a] text-white shadow-md border-b border-white/10">
                    <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2f6848] text-emerald-100 border border-emerald-400/30 shadow-inner">
                                <User className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#e88c12]">
                                        Petugas Lapangan
                                    </span>
                                </div>
                                <h1 className="truncate text-sm font-bold text-white leading-snug">
                                    {user?.name ?? 'Petugas Pickup'}
                                </h1>
                                <p className="truncate text-[11px] text-emerald-200/80">
                                    {user?.email ?? 'officer@saycle.com'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-red-500/20 text-red-200 border border-red-500/30 px-3.5 py-2 text-xs font-semibold hover:bg-red-500/30 active:bg-red-500/40 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Keluar</span>
                        </button>
                    </div>
                </header>

                <div className="p-4">
                    <FlashBanner />

                    <div className="mx-auto max-w-2xl space-y-6">
                        <div>
                            <div className="flex items-center justify-between">
                                <h1 className="text-2xl font-bold tracking-tight text-[#18352a]">Tugas & Rute Hari Ini</h1>
                                <span className="rounded-full bg-[#e88c12]/15 px-3 py-1 text-xs font-bold text-[#e88c12]">
                                    {allStops.length} Pemberhentian
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-[#18352a]/70">
                                Urutan tugas pengiriman & penjemputan dari Stop #1 hingga selesai.
                            </p>
                        </div>

                        {/* Interactive Overview Route Map */}
                        {validStops.length > 0 && (
                            <Card className="overflow-hidden border-[#18352a]/10 shadow-sm">
                                <div className="flex items-center justify-between border-b border-[#18352a]/10 bg-white px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Navigation className="h-4 w-4 text-[#e88c12]" />
                                        <h2 className="text-sm font-bold text-[#18352a]">Peta Rute Seluruh Tugas</h2>
                                    </div>
                                    <span className="text-xs font-medium text-[#18352a]/60">Jogja Hub Depot &rarr; Stops</span>
                                </div>
                                <RouteMap depot={depot} stops={stopsForMap} lines={linesForMap} className="h-56 w-full" />
                            </Card>
                        )}

                        {allStops.length === 0 ? (
                            <Card className="p-8 text-center">
                                <CheckCircle2 className="mx-auto h-10 w-10 text-[#2f6848]/40" />
                                <p className="mt-2 text-sm font-medium text-[#18352a]/70">Tidak ada tugas terjadwal hari ini.</p>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#18352a]/70">
                                        Urutan Pemberhentian (1 - {allStops.length})
                                    </h2>
                                </div>

                                <div className="space-y-3">
                                    {allStops.map((item, index) => {
                                        const place = item.task_type === 'pickup' ? item.supplier : item.destination;
                                        const date = item.service_date ?? item.scheduled_for;
                                        const isPickup = item.task_type === 'pickup';
                                        const isCompleted = item.status === 'completed' || item.status === 'delivered';

                                        return (
                                            <Card
                                                key={`${item.task_type}-${item.id}`}
                                                className={`overflow-hidden border-[#18352a]/10 p-4 shadow-sm transition-all ${
                                                    isCompleted ? 'bg-gray-50/80 opacity-75' : 'bg-white'
                                                }`}
                                            >
                                                <div className="flex gap-3">
                                                    <span
                                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${
                                                            isPickup ? 'bg-[#e88c12]' : 'bg-[#2f6848]'
                                                        }`}
                                                    >
                                                        {item.stop_order ?? index + 1}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                                            <div>
                                                                <span
                                                                    className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                                                        isPickup
                                                                            ? 'bg-[#e88c12]/15 text-[#e88c12]'
                                                                            : 'bg-[#2f6848]/15 text-[#2f6848]'
                                                                    }`}
                                                                >
                                                                    Stop #{item.stop_order ?? index + 1} • {isPickup ? 'Pickup' : 'Delivery'}
                                                                </span>
                                                                <h3 className="mt-1 text-base font-bold text-[#18352a]">
                                                                    {place?.name ?? 'Lokasi tidak tersedia'}
                                                                </h3>
                                                            </div>
                                                            <span className="rounded-full bg-[#2f6848]/10 px-2.5 py-1 text-xs font-medium text-[#2f6848]">
                                                                {item.status.replace('_', ' ')}
                                                            </span>
                                                        </div>

                                                        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-[#18352a]/75">
                                                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#e88c12]" />
                                                            {place?.address ?? 'Alamat tidak tersedia'}
                                                        </p>

                                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#18352a]/65 sm:grid-cols-3">
                                                            <div>
                                                                <strong className="block text-[#18352a]">Tanggal</strong>
                                                                {date ? new Date(date).toLocaleDateString('id-ID') : '—'}
                                                            </div>
                                                            <div>
                                                                <strong className="block text-[#18352a]">Kendaraan</strong>
                                                                {item.vehicle?.name ?? 'Belum ada'}
                                                            </div>
                                                            <div>
                                                                <strong className="block text-[#18352a]">Rencana Berat</strong>
                                                                {item.planned_kg.toLocaleString('id-ID')} kg
                                                            </div>
                                                        </div>

                                                        {/* Action Buttons: Mulai & WA OTW */}
                                                        <div className="mt-4 flex flex-wrap sm:flex-nowrap items-center gap-2">
                                                            <Link
                                                                href={route('officer.stop.show', {
                                                                    type: item.task_type,
                                                                    id: item.id,
                                                                })}
                                                                className={`inline-flex min-h-11 flex-1 whitespace-nowrap items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-bold text-white shadow-sm transition-all ${
                                                                    isPickup
                                                                        ? 'bg-[#e88c12] hover:bg-[#d17a0a] active:bg-[#b86b08]'
                                                                        : 'bg-[#2f6848] hover:bg-[#235137] active:bg-[#1a3d29]'
                                                                }`}
                                                            >
                                                                <PlayCircle className="h-4 w-4 shrink-0" />
                                                                <span>Mulai</span>
                                                            </Link>
                                                            {item.wa_enroute_url && (
                                                                <a
                                                                    href={item.wa_enroute_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex min-h-11 flex-1 whitespace-nowrap items-center justify-center gap-1.5 rounded-xl border-0 bg-[#25D366] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#20bd5a] active:bg-[#1da850]"
                                                                >
                                                                    <MessageCircle className="h-4 w-4 shrink-0" />
                                                                    <span>WA OTW</span>
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
