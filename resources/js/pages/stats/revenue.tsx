import { MarginCard } from '@/components/stats/MarginCard';
import { GradeBadge } from '@/components/grade-badge';
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
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Statistik', href: '/stats' },
    { title: 'Pendapatan', href: '/stats/revenue' },
];

export interface RevenueRow {
    id: number;
    tanggal: string | null;
    jenis: string;
    pihak: string;
    grade: string;
    kg: number;
    status: string;
    pengeluaran: number;
    pendapatan: number;
    paid: number;
    margin: number;
}

interface Props {
    transactions: RevenueRow[];
    totals: { pendapatan: number; pengeluaran: number; terbayar: number; margin: number };
}

function formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

function formatKg(value: number): string {
    return value.toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

function formatDate(iso: string | null): string {
    return iso === null
        ? '-'
        : new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StatsRevenue({ transactions, totals }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pendapatan" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-white p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Pendapatan</h1>
                    <p className="mt-1 text-sm text-[#18352a]/70">
                        Setiap baris = satu financial line dengan harga snapshot (maks 200 terakhir).
                    </p>
                </div>

                <MarginCard pendapatan={totals.pendapatan} pengeluaran={totals.pengeluaran} className="sm:max-w-sm" />

                {transactions.length === 0 ? (
                    <Card className="rounded-2xl border-dashed border-[#2f6848]/30 bg-transparent shadow-none">
                        <CardContent className="p-8 text-center text-sm text-[#18352a]/70">
                            Belum ada transaksi. Data muncul setelah petugas menyelesaikan penimbangan.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-[#2f6848]/15 bg-white">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-white hover:bg-white">
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Jenis</TableHead>
                                        <TableHead>Pihak</TableHead>
                                        <TableHead>Grade</TableHead>
                                        <TableHead>Kg</TableHead>
                                        <TableHead>Pengeluaran</TableHead>
                                        <TableHead>Pendapatan</TableHead>
                                        <TableHead>Terbayar</TableHead>
                                        <TableHead className="text-right">Margin</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((t) => (
                                        <TableRow key={t.id}>
                                            <TableCell className="whitespace-nowrap text-[#18352a]">{formatDate(t.tanggal)}</TableCell>
                                            <TableCell className="whitespace-nowrap text-[#18352a]/70">{t.jenis}</TableCell>
                                            <TableCell className="max-w-40 truncate text-[#18352a]/70">{t.pihak}</TableCell>
                                            <TableCell><GradeBadge grade={t.grade} /></TableCell>
                                            <TableCell className="tabular-nums text-[#18352a]/70">{formatKg(t.kg)}</TableCell>
                                            <TableCell className="tabular-nums text-[#18352a]/70">{formatRupiah(t.pengeluaran)}</TableCell>
                                            <TableCell className="tabular-nums text-[#18352a]/70">{formatRupiah(t.pendapatan)}</TableCell>
                                            <TableCell className="tabular-nums text-[#18352a]/70">{formatRupiah(t.paid)}</TableCell>
                                            <TableCell
                                                className={
                                                    t.margin >= 0
                                                        ? 'text-right font-semibold tabular-nums text-[#2f6848]'
                                                        : 'text-right font-semibold tabular-nums text-red-700'
                                                }
                                            >
                                                {formatRupiah(t.margin)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
