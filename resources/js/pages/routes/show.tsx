import { RouteMap } from '@/components/route-map';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

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

interface Props {
    vehicle: { id: number; name: string; capacity_kg: number };
    depot: { lat: number; lng: number };
    stops: Stop[];
    officers: { id: number; name: string }[];
}

function fmtKg(v: number) {
    return `${v.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg`;
}
function fmtM(m: number) {
    return m >= 1000 ? `${(m / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} km` : `${Math.round(m)} m`;
}
function fmtSec(s: number) {
    const min = Math.ceil(s / 60);
    return min < 60 ? `${min} mnt` : `${Math.floor(min / 60)} j ${min % 60} mnt`;
}

const statusLabel: Record<string, string> = { pending: 'Pending', assigned: 'Ditugaskan', in_progress: 'Berjalan' };
const statusStyle: Record<string, string> = {
    pending: 'border-transparent bg-[#e88c12]/15 text-[#18352a]',
    assigned: 'border-transparent bg-[#2f6848]/10 text-[#2f6848]',
    in_progress: 'border-transparent bg-[#18352a]/10 text-[#18352a]',
};

export default function RouteShow({ vehicle, depot, stops, officers }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dasbor', href: '/dashboard' },
        { title: 'Rute', href: '/routes' },
        { title: vehicle.name, href: `/routes/${vehicle.id}` },
    ];

    const [officerId, setOfficerId] = useState<string>('');
    const assignForm = useForm<{ officer_id: number | '' }>({ officer_id: '' });

    const hasPending = stops.some((s) => s.status === 'pending');
    const totalKg = stops.reduce((s, st) => s + st.kg, 0);
    const totalM = stops.reduce((s, st) => s + st.distance_m, 0);
    const totalS = stops.reduce((s, st) => s + st.duration_s, 0);

    const doAssign = () => {
        if (!officerId) return;
        assignForm.data.officer_id = parseInt(officerId, 10);
        assignForm.post(route('routes.assign', vehicle.id), {
            preserveScroll: true,
        });
    };

    const mapStops = stops.map((s) => ({
        lat: s.lat,
        lng: s.lng,
        order: s.order,
        label: `${s.contact} — ${fmtKg(s.kg)}`,
        color: '#2f6848',
    }));
    const mapLines = stops.length > 0
        ? [{ color: '#2f6848', points: [[depot.lat, depot.lng] as [number, number], ...stops.map((s) => [s.lat, s.lng] as [number, number])] }]
        : [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Rute ${vehicle.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 bg-[#f4f3ed] p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">{vehicle.name}</h1>
                        <p className="mt-1 text-sm text-[#18352a]/70">
                            Kapasitas {fmtKg(vehicle.capacity_kg)} · {stops.length} titik · {fmtKg(totalKg)} muatan
                        </p>
                    </div>
                    <Link href="/routes" className="min-h-11 text-sm font-medium text-[#2f6848] underline-offset-4 hover:underline md:min-h-9">
                        Kembali
                    </Link>
                </div>

                {/* Assign panel */}
                {hasPending && officers.length > 0 && (
                    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#2f6848]/15 bg-white p-4">
                        <div className="flex-1">
                            <label htmlFor="officer-select" className="mb-1 block text-sm font-medium text-[#18352a]">
                                Tugaskan ke officer
                            </label>
                            <Select value={officerId} onValueChange={setOfficerId}>
                                <SelectTrigger id="officer-select" className="min-h-11 w-full max-w-xs">
                                    <SelectValue placeholder="Pilih officer…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {officers.map((o) => (
                                        <SelectItem key={o.id} value={String(o.id)}>
                                            {o.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={doAssign}
                            disabled={!officerId || assignForm.processing}
                            className="min-h-11 bg-[#2f6848] text-[#f4f3ed] hover:bg-[#18352a] focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none"
                        >
                            {assignForm.processing ? 'Menugaskan…' : 'Tugaskan'}
                        </Button>
                        {assignForm.errors.officer_id && (
                            <p className="w-full text-sm text-red-600">{assignForm.errors.officer_id}</p>
                        )}
                    </div>
                )}

                {/* Map */}
                {stops.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-[#2f6848]/15 bg-white">
                        <RouteMap depot={depot} stops={mapStops} lines={mapLines} className="h-[380px] w-full" />
                    </div>
                )}

                {/* Stops table */}
                {stops.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-[#2f6848]/15 bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12 text-center">#</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead className="text-right">Estimasi</TableHead>
                                    <TableHead className="text-right">Jarak leg</TableHead>
                                    <TableHead className="text-right">Durasi leg</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stops.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="text-center tabular-nums">{s.order}</TableCell>
                                        <TableCell>
                                            <span className="font-medium text-[#18352a]">{s.contact}</span>
                                            {s.address && <span className="ml-1 text-xs text-[#18352a]/70">{s.address}</span>}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{fmtKg(s.kg)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{fmtM(s.distance_m)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{fmtSec(s.duration_s)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`font-semibold ${statusStyle[s.status] ?? ''}`}>
                                                {statusLabel[s.status] ?? s.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-[#f4f3ed]/50 font-semibold">
                                    <TableCell />
                                    <TableCell>Total</TableCell>
                                    <TableCell className="text-right tabular-nums">{fmtKg(totalKg)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{fmtM(totalM)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{fmtSec(totalS)}</TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-[#2f6848]/25 bg-white py-14 text-center text-sm text-[#18352a]/70">
                        Belum ada titik pickup untuk kendaraan ini.
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
