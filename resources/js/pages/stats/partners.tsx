import { GradeBadge } from '@/components/grade-badge';
import { FREQUENCY_LABELS } from '@/components/partner-card';
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
import { Truck, Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Statistik', href: '/stats' },
    { title: 'Mitra & Pemasok', href: '/stats/partners' },
];

export interface GroupRow {
    label: string;
    total: number;
}

interface Props {
    totals: { mitra: number; pemasok: number };
    byGrade: GroupRow[];
    byFrequency: GroupRow[];
}

export default function StatsPartners({ totals, byGrade, byFrequency }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Mitra & Pemasok" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-[#f4f3ed] p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Mitra & Pemasok</h1>
                    <p className="mt-1 text-sm text-[#18352a]/70">
                        Sebaran mitra dan pemasok berdasarkan grade preferensi dan frekuensi.
                    </p>
                </div>

                <section aria-label="Total" className="grid gap-4 sm:grid-cols-2">
                    <Card className="rounded-2xl border-[#2f6848]/15 bg-white shadow-none">
                        <CardContent className="flex items-start gap-4 p-5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2f6848]/10 text-[#2f6848]">
                                <Users className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#18352a]/70">Total mitra</p>
                                <p className="mt-1 text-2xl font-semibold tracking-tight text-[#18352a] tabular-nums">
                                    {totals.mitra.toLocaleString('id-ID')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-[#2f6848]/15 bg-white shadow-none">
                        <CardContent className="flex items-start gap-4 p-5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2f6848]/10 text-[#2f6848]">
                                <Truck className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#18352a]/70">Total pemasok</p>
                                <p className="mt-1 text-2xl font-semibold tracking-tight text-[#18352a] tabular-nums">
                                    {totals.pemasok.toLocaleString('id-ID')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section aria-label="Breakdown" className="grid gap-6 lg:grid-cols-2">
                    <div>
                        <h2 className="mb-3 text-base font-semibold text-[#18352a]">Per grade preferensi</h2>
                        <BreakdownTable rows={byGrade} renderLabel={(label) => (
                            label === 'Tanpa preferensi'
                                ? <span className="text-[#18352a]/70">Tanpa preferensi</span>
                                : <GradeBadge grade={label} />
                        )} />
                    </div>
                    <div>
                        <h2 className="mb-3 text-base font-semibold text-[#18352a]">Per frekuensi</h2>
                        <BreakdownTable rows={byFrequency} renderLabel={(label) => (
                            <span className="text-[#18352a]">{FREQUENCY_LABELS[label] ?? label}</span>
                        )} />
                    </div>
                </section>

                <p className="text-xs text-[#18352a]/70">
                    Pemasok dihitung unik berdasarkan nama kontak pada laporan setoran.
                </p>
            </div>
        </AppLayout>
    );
}

function BreakdownTable({ rows, renderLabel }: { rows: GroupRow[]; renderLabel: (label: string) => React.ReactNode }) {
    if (rows.length === 0) {
        return (
            <Card className="rounded-2xl border-dashed border-[#2f6848]/30 bg-transparent shadow-none">
                <CardContent className="p-6 text-center text-sm text-[#18352a]/70">Belum ada data mitra.</CardContent>
            </Card>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-[#2f6848]/15 bg-white">
            <Table>
                <TableHeader>
                    <TableRow className="bg-[#f4f3ed] hover:bg-[#f4f3ed]">
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.label}>
                            <TableCell>{renderLabel(row.label)}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums text-[#18352a]">
                                {row.total.toLocaleString('id-ID')}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
