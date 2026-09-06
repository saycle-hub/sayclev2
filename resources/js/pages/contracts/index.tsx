import { contractStatusLabels, contractStatusStyles, type ContractRow } from '@/components/contract-list';
import { GradeBadge } from '@/components/grade-badge';
import { FREQUENCY_LABELS, formatKg } from '@/components/partner-card';
import { PriceBadge } from '@/components/reusable/price-badge';
import { AllocationStatus } from '@/components/allocation-status';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { FileText, Handshake } from 'lucide-react';

import { useState } from 'react';
import { PaginationBar } from '@/components/ui/pagination-bar';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Kontrak', href: '/contracts' },
];

interface ContractIndexRow extends ContractRow {
    partner: { id: number; name: string; grade_preference: string | null } | null;
}

interface ContractsIndexProps {
    contracts: ContractIndexRow[];
    stats: { total: number; active: number };
}

export default function ContractsIndex({ contracts, stats }: ContractsIndexProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const totalPages = Math.ceil(contracts.length / itemsPerPage);
    const paginatedContracts = contracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            title="Kontrak"
            description="Seluruh kontrak mitra lintas grade beserta kapasitas dan harganya."
        >
            <Head title="Kontrak" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#8FB996]/35 bg-white p-5 shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A1CCA5]/30 text-[#415D43]">
                                <FileText className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-sm text-[#111D13]/70">Total kontrak</p>
                                <p className="text-xl font-semibold text-[#111D13] tabular-nums">{stats.total}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-[#8FB996]/35 bg-white p-5 shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A1CCA5]/30 text-[#415D43]">
                                <Handshake className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-sm text-[#111D13]/70">Kontrak aktif</p>
                                <p className="text-xl font-semibold text-[#111D13] tabular-nums">{stats.active}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile: compact cards with partner context. */}
                <div className="md:hidden">
                    {contracts.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#709775]/30 bg-white px-4 py-8 text-center text-sm text-[#111D13]/70">
                            Belum ada kontrak. Tambahkan kontrak dari halaman detail mitra.
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {paginatedContracts.map((c) => (
                                <li key={c.id} className="rounded-xl border border-[#8FB996]/35 bg-white p-4 shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <GradeBadge grade={c.grade} />
                                        <Badge variant="outline" className={contractStatusStyles[c.status] + ' font-semibold'}>
                                            {contractStatusLabels[c.status]}
                                        </Badge>
                                        <AllocationStatus status={c.status === 'active' ? 'active' : 'inactive'} />
                                    </div>
                                    {c.partner && (
                                        <Link
                                            href={`/partners/${c.partner.id}`}
                                            className="mt-2 inline-block text-sm font-semibold text-[#111D13] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#709775] focus-visible:outline-none"
                                        >
                                            {c.partner.name}
                                        </Link>
                                    )}
                                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#111D13]/70">
                                        <p>
                                            Kapasitas{' '}
                                            <span className="font-semibold text-[#111D13] tabular-nums">
                                                {formatKg(c.min_capacity_kg)}–{formatKg(c.max_capacity_kg)}
                                            </span>{' '}
                                            kg/minggu (ideal {formatKg(c.ideal_capacity_kg)})
                                        </p>
                                        <p>{FREQUENCY_LABELS[c.frequency] ?? c.frequency}</p>
                                        <div className="flex gap-2">
                                            <PriceBadge label="Beli" value={Number(c.buy_price)} />
                                            <PriceBadge label="Jual" value={Number(c.sell_price)} />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Desktop/tablet: full table. */}
                <div className="hidden overflow-hidden rounded-2xl border border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)] md:block">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-[#8FB996]/25 bg-[#F2F7F3] hover:bg-[#F2F7F3] [&>th]:text-[#111D13] [&>th]:font-semibold">
                                <TableHead>Mitra</TableHead>
                                <TableHead>Grade</TableHead>
                                <TableHead>Kapasitas (min–ideal–maks)</TableHead>
                                <TableHead>Frekuensi</TableHead>
                                <TableHead>Harga beli</TableHead>
                                <TableHead>Harga jual</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Alokasi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contracts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-10 text-center text-[#18352a]/70">
                                        Belum ada kontrak. Tambahkan kontrak dari halaman detail mitra.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedContracts.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell>
                                            {c.partner ? (
                                                <Link
                                                    href={`/partners/${c.partner.id}`}
                                                    className="font-semibold text-[#18352a] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none"
                                                >
                                                    {c.partner.name}
                                                </Link>
                                            ) : (
                                                <span className="text-[#18352a]/70">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <GradeBadge grade={c.grade} />
                                        </TableCell>
                                        <TableCell className="text-[#18352a]/80 tabular-nums">
                                            {formatKg(c.min_capacity_kg)} – {formatKg(c.ideal_capacity_kg)} – {formatKg(c.max_capacity_kg)}
                                        </TableCell>
                                        <TableCell className="text-[#18352a]/80">{FREQUENCY_LABELS[c.frequency] ?? c.frequency}</TableCell>
                                        <TableCell>
                                            <PriceBadge label="Beli" value={Number(c.buy_price)} />
                                        </TableCell>
                                        <TableCell>
                                            <PriceBadge label="Jual" value={Number(c.sell_price)} />
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={contractStatusStyles[c.status] + ' font-semibold'}>
                                                {contractStatusLabels[c.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <AllocationStatus status={c.status === 'active' ? 'active' : 'inactive'} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <PaginationBar
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={contracts.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
