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
import { UserCheck } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Beranda', href: '/partner' },
    { title: 'Pengiriman', href: '/partner/deliveries' },
];

export interface DeliveryLineRow {
    grade: string;
    intended_use: string;
    kg: number;
    unit_price_snapshot: number | null;
    total_amount_snapshot: number | null;
}

export interface DeliveryRow {
    id: number;
    status: string;
    status_label: string;
    service_date: string | null;
    delivered_at: string | null;
    received_by: string | null;
    lines: DeliveryLineRow[];
    trips: { status: string; vehicle: string | null; officer: string | null }[];
}

const statusStyles: Record<string, string> = {
    planned: 'border-transparent bg-[#e88c12]/15 text-[#18352a]',
    assigned: 'border-transparent bg-[#2f6848]/10 text-[#2f6848]',
    in_transit: 'border-transparent bg-[#2f6848]/10 text-[#2f6848]',
    delivered: 'border-transparent bg-[#2f6848] text-[#f4f3ed]',
    failed: 'border-transparent bg-red-100 text-red-700',
    cancelled: 'border-transparent bg-[#18352a]/10 text-[#18352a]',
};

function formatKg(value: number): string {
    return value.toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

function formatRupiah(value: number | null): string {
    return value === null
        ? '-'
        : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

function formatDate(iso: string | null): string {
    return iso === null
        ? '-'
        : new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
    deliveries: DeliveryRow[];
}

export default function PartnerDeliveries({ deliveries }: Props) {
    const totalKg = (rows: DeliveryLineRow[]) => rows.reduce((sum, l) => sum + l.kg, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengiriman" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-white p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Pengiriman</h1>
                    <p className="mt-1 text-sm text-[#18352a]/70">
                        Pengiriman aktif dan riwayat serah-terima barang ke lokasi Anda.
                    </p>
                </div>

                {deliveries.length === 0 ? (
                    <Card className="rounded-2xl border-dashed border-[#2f6848]/30 bg-transparent shadow-none">
                        <CardContent className="p-8 text-center text-sm text-[#18352a]/70">
                            Belum ada pengiriman. Jadwal pengiriman muncul setelah alokasi disiapkan admin.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {deliveries.map((d) => (
                            <Card key={d.id} className="rounded-2xl border-[#2f6848]/15 bg-white p-4 shadow-none">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={cn('font-semibold', statusStyles[d.status] ?? 'bg-muted text-foreground')}>
                                            {d.status_label}
                                        </Badge>
                                        <span className="text-sm font-medium text-[#18352a]">#{d.id}</span>
                                    </div>
                                    <span className="text-xs text-[#18352a]/70">Jadwal: {formatDate(d.service_date)}</span>
                                </div>

                                <div className="mt-3 overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[#18352a]/10 text-left text-xs uppercase tracking-wider text-[#18352a]/50">
                                                <th className="py-2 pr-4">Grade</th>
                                                <th className="py-2 pr-4">Kg</th>
                                                <th className="py-2 pr-4">Harga/kg</th>
                                                <th className="py-2 pr-4 text-right">Jumlah</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {d.lines.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="py-2 text-xs text-[#18352a]/60">Menunggu penugasan barang.</td>
                                                </tr>
                                            ) : (
                                                d.lines.map((line, i) => (
                                                    <tr key={`${d.id}-${line.grade}-${i}`} className="border-b border-[#18352a]/5 last:border-0">
                                                        <td className="py-2 pr-4"><GradeBadge grade={line.grade} /></td>
                                                        <td className="py-2 pr-4 tabular-nums text-[#18352a]/70">{formatKg(line.kg)} kg</td>
                                                        <td className="py-2 pr-4 tabular-nums text-[#18352a]/70">{formatRupiah(line.unit_price_snapshot)}</td>
                                                        <td className="py-2 pr-4 text-right font-semibold tabular-nums text-[#18352a]">{formatRupiah(line.total_amount_snapshot)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#18352a]/70">
                                    {d.trips.map((t, i) => (
                                        <span key={i}>
                                            {t.vehicle ?? 'Kendaraan belum ada'}
                                            {t.officer ? ` · Petugas ${t.officer}` : ''}
                                            {` · ${t.status.replace('_', ' ')}`}
                                        </span>
                                    ))}
                                    {d.delivered_at && (
                                        <span className="flex items-center gap-1 font-medium text-[#2f6848]">
                                            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                            Diterima {d.received_by ? `oleh ${d.received_by}` : ''} · {formatDate(d.delivered_at)}
                                        </span>
                                    )}
                                    <span className="ml-auto font-semibold text-[#18352a]">Total {formatKg(totalKg(d.lines))} kg</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
