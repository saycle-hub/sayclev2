import {
    CONTRACT_STATUS_LABELS,
    CONTRACT_STATUS_STYLES,
    ContractSummary,
    formatRupiah,
} from '@/components/partner/ContractSummary';
import { FREQUENCY_LABELS, formatKg } from '@/components/partner-card';
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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Beranda', href: '/partner' },
    { title: 'Kontrak', href: '/partner/contract' },
];

export interface PartnerContractRow {
    id: number;
    name: string | null;
    status: 'active' | 'paused' | 'cancelled';
    grade: string;
    min_capacity_kg: number;
    ideal_capacity_kg: number;
    max_capacity_kg: number;
    frequency: string;
    receiving_days: string[];
    buy_price: number;
    sell_price: number;
    start_date: string | null;
    end_date: string | null;
}

interface Props {
    contracts: PartnerContractRow[];
}

export default function PartnerContract({ contracts }: Props) {
    const active = contracts.find((c) => c.status === 'active') ?? null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Kontrak" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-white p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Kontrak</h1>
                    <p className="mt-1 text-sm text-[#18352a]/70">
                        Rincian kontrak kerja sama antara Anda dan SayCle.
                    </p>
                </div>

                {contracts.length === 0 ? (
                    <Card className="rounded-2xl border-dashed border-[#2f6848]/30 bg-transparent shadow-none">
                        <CardContent className="p-8 text-center text-sm text-[#18352a]/70">
                            Belum ada kontrak. Hubungi admin SayCle untuk pengaturan kontrak.
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {active && (
                            <ContractSummary
                                status={active.status}
                                grade={active.grade}
                                minCapacityKg={active.min_capacity_kg}
                                idealCapacityKg={active.ideal_capacity_kg}
                                maxCapacityKg={active.max_capacity_kg}
                                frequency={active.frequency}
                                buyPrice={active.buy_price}
                            />
                        )}

                        {/* Full contract details, horizontally scrollable on mobile. */}
                        <div className="overflow-hidden rounded-2xl border border-[#2f6848]/15 bg-white">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-white hover:bg-white">
                                            <TableHead>Kontrak</TableHead>
                                            <TableHead>Grade</TableHead>
                                            <TableHead>Kapasitas (min-ideal-maks)</TableHead>
                                            <TableHead>Frekuensi</TableHead>
                                            <TableHead>Harga beli</TableHead>
                                            <TableHead>Harga jual</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Periode</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {contracts.map((c) => (
                                            <TableRow key={c.id}>
                                                <TableCell className="font-medium text-[#18352a]">
                                                    {c.name?.trim() || `Grade ${c.grade}`}
                                                </TableCell>
                                                <TableCell className="text-[#18352a]/70">{c.grade}</TableCell>
                                                <TableCell className="tabular-nums text-[#18352a]/70">
                                                    {formatKg(c.min_capacity_kg)}-{formatKg(c.ideal_capacity_kg)}-{formatKg(c.max_capacity_kg)} kg
                                                </TableCell>
                                                <TableCell className="text-[#18352a]/70">
                                                    {FREQUENCY_LABELS[c.frequency] ?? c.frequency}
                                                </TableCell>
                                                <TableCell className="tabular-nums text-[#18352a]/70">{formatRupiah(c.buy_price)}</TableCell>
                                                <TableCell className="tabular-nums text-[#18352a]/70">{formatRupiah(c.sell_price)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn('font-semibold', CONTRACT_STATUS_STYLES[c.status])}>
                                                        {CONTRACT_STATUS_LABELS[c.status]}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-[#18352a]/70">
                                                    {c.start_date ?? '-'} s/d {c.end_date ?? '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
