import { BillingSummary } from '@/components/partner/BillingSummary';
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
    { title: 'Beranda', href: '/partner' },
    { title: 'Tagihan', href: '/partner/billing' },
];

export interface BillingRow {
    grade: string;
    kg: number;
    buy_price: number;
    total: number;
    pickups: number;
}

interface Props {
    breakdown: BillingRow[];
    grandTotal: number;
    totalKg: number;
}

function formatKg(value: number): string {
    return value.toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

function formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

export default function PartnerBilling({ breakdown, grandTotal, totalKg }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tagihan" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-[#f4f3ed] p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Tagihan</h1>
                    <p className="mt-1 text-sm text-[#18352a]/70">
                        Rincian pembayaran berdasarkan hasil penimbangan setoran Anda.
                    </p>
                </div>

                <BillingSummary grandTotal={grandTotal} totalKg={totalKg} />

                <div>
                    <h2 className="mb-3 text-base font-semibold text-[#18352a]">Rincian per grade</h2>
                    {breakdown.every((b) => b.pickups === 0) ? (
                        <Card className="rounded-2xl border-dashed border-[#2f6848]/30 bg-transparent shadow-none">
                            <CardContent className="p-8 text-center text-sm text-[#18352a]/70">
                                Belum ada setoran yang ditimbang. Tagihan muncul setelah petugas melakukan check-in dan penimbangan.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-[#2f6848]/15 bg-white">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#f4f3ed] hover:bg-[#f4f3ed]">
                                            <TableHead>Grade</TableHead>
                                            <TableHead>Bobot</TableHead>
                                            <TableHead>Harga beli</TableHead>
                                            <TableHead>Jumlah setoran</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {breakdown.map((b) => (
                                            <TableRow key={b.grade}>
                                                <TableCell>{b.kg > 0 ? <GradeBadge grade={b.grade} /> : <span className="text-[#18352a]/50">{b.grade}</span>}</TableCell>
                                                <TableCell className="tabular-nums text-[#18352a]/70">{formatKg(b.kg)} kg</TableCell>
                                                <TableCell className="tabular-nums text-[#18352a]/70">{formatRupiah(b.buy_price)}/kg</TableCell>
                                                <TableCell className="tabular-nums text-[#18352a]/70">{b.pickups}x</TableCell>
                                                <TableCell className="text-right font-semibold tabular-nums text-[#18352a]">
                                                    {formatRupiah(b.total)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
