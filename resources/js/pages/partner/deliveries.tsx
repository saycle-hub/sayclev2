import { GradeBadge } from '@/components/grade-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { MapPin } from 'lucide-react';

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

const statusStyles: Record<string, string> = {
    pending: 'border-transparent bg-[#e88c12]/15 text-[#18352a]',
    assigned: 'border-transparent bg-[#2f6848]/10 text-[#2f6848]',
    in_progress: 'border-transparent bg-[#2f6848]/10 text-[#2f6848]',
    done: 'border-transparent bg-[#2f6848] text-[#f4f3ed]',
};

function formatKg(value: number | null): string {
    return value === null
        ? '-'
        : value.toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function formatTime(iso: string | null): string {
    return iso === null
        ? '-'
        : new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

interface Props {
    deliveries: DeliveryRow[];
}

export default function PartnerDeliveries({ deliveries }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Riwayat Pengiriman" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-[#f4f3ed] p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Pengiriman</h1>
                    <p className="mt-1 text-sm text-[#18352a]/70">
                        Riwayat penjadwalan dan penimbangan setoran Anda.
                    </p>
                </div>

                {deliveries.length === 0 ? (
                    <Card className="rounded-2xl border-dashed border-[#2f6848]/30 bg-transparent shadow-none">
                        <CardContent className="p-8 text-center text-sm text-[#18352a]/70">
                            Belum ada pengiriman. Setoran Anda akan muncul di sini setelah dijadwalkan oleh admin.
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Mobile: compact cards. */}
                        <div className="md:hidden">
                            <ul className="space-y-3">
                                {deliveries.map((d) => (
                                    <li key={d.id} className="rounded-xl border border-[#2f6848]/15 bg-white p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <Badge variant="outline" className={cn('font-semibold', statusStyles[d.status] ?? 'bg-muted text-foreground')}>
                                                {d.status_label}
                                            </Badge>
                                            <span className="text-xs text-[#18352a]/70">{formatDate(d.created_at)}</span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#18352a]/70">
                                            <span>
                                                Est <span className="font-semibold text-[#18352a] tabular-nums">{formatKg(d.estimated_kg)}</span> kg
                                                {d.actual_kg !== null && (
                                                    <>
                                                        {' '}· Timbang <span className="font-semibold text-[#18352a] tabular-nums">{formatKg(d.actual_kg)}</span> kg
                                                    </>
                                                )}
                                            </span>
                                            {d.grade && <GradeBadge grade={d.grade} />}
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#18352a]/70">
                                            {d.vehicle_name && <span>Kendaraan: {d.vehicle_name}</span>}
                                            <span>Check-in: {formatTime(d.checked_in_at)}</span>
                                        </div>
                                        {d.address && (
                                            <p className="mt-1 flex items-center gap-1 text-xs text-[#18352a]/70">
                                                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                                                <span className="truncate">{d.address}</span>
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Desktop/tablet: full table. */}
                        <div className="hidden overflow-hidden rounded-2xl border border-[#2f6848]/15 bg-white md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[#f4f3ed] hover:bg-[#f4f3ed]">
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Estimasi</TableHead>
                                        <TableHead>Hasil timbang</TableHead>
                                        <TableHead>Grade</TableHead>
                                        <TableHead>Kendaraan</TableHead>
                                        <TableHead>Check-in</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {deliveries.map((d) => (
                                        <TableRow key={d.id}>
                                            <TableCell className="whitespace-nowrap text-[#18352a]">{formatDate(d.created_at)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn('font-semibold', statusStyles[d.status] ?? 'bg-muted text-foreground')}>
                                                    {d.status_label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="tabular-nums text-[#18352a]/70">{formatKg(d.estimated_kg)} kg</TableCell>
                                            <TableCell className="font-semibold tabular-nums text-[#18352a]">
                                                {d.actual_kg !== null ? `${formatKg(d.actual_kg)} kg` : '-'}
                                            </TableCell>
                                            <TableCell>{d.grade ? <GradeBadge grade={d.grade} /> : '-'}</TableCell>
                                            <TableCell className="text-[#18352a]/70">{d.vehicle_name ?? '-'}</TableCell>
                                            <TableCell className="whitespace-nowrap text-[#18352a]/70">{formatTime(d.checked_in_at)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
