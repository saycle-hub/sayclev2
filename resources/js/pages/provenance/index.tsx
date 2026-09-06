import { GradeBadge } from '@/components/grade-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Camera, Layers, Package, Search, Truck, Users } from 'lucide-react';
import { useState } from 'react';

type ProvenanceRow = {
    supplier_id: number;
    supplier: string | null;
    pickup_id: number;
    pickup_status: string;
    grade: string;
    intended_use: string;
    kg: number;
    officer: string | null;
    checked_in_at: string | null;
    evidence: string | null;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Asal-Usul Pasokan', href: '/provenance' },
];

function formatKg(val: number): string {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(val) + ' kg';
}

export default function ProvenanceIndex({ rows = [] }: { rows: ProvenanceRow[] }) {
    const [searchQuery, setSearchQuery] = useState('');

    const totalKg = rows.reduce((sum, row) => sum + row.kg, 0);
    const totalPickups = new Set(rows.map((r) => r.pickup_id)).size;
    const totalSuppliers = new Set(rows.map((r) => r.supplier_id)).size;

    const filteredRows = rows.filter((row) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (row.supplier ?? '').toLowerCase().includes(q) ||
            row.grade.toLowerCase().includes(q) ||
            (row.officer ?? '').toLowerCase().includes(q) ||
            `#${row.pickup_id}`.includes(q)
        );
    });

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            title="Asal-Usul Pasokan (Provenance)"
            description="Jejak digital rantai pasok: melacak setiap kg persediaan dari pemasok asal, penjemputan petugas, hasil klasifikasi grade, hingga bukti verifikasi."
        >
            <Head title="Asal-Usul Pasokan (Provenance)" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                {/* Summary KPI Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#415D43]/10 text-[#415D43]">
                                <Package className="h-6 w-6" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-[#709775]">Total Pasokan Masuk</p>
                                <p className="mt-1 text-2xl font-bold text-[#111D13] tabular-nums">{formatKg(totalKg)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#415D43]/10 text-[#415D43]">
                                <Layers className="h-6 w-6" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-[#709775]">Lot Klasifikasi</p>
                                <p className="mt-1 text-2xl font-bold text-[#111D13] tabular-nums">{rows.length} lot</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#415D43]/10 text-[#415D43]">
                                <Truck className="h-6 w-6" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-[#709775]">Penjemputan Selesai</p>
                                <p className="mt-1 text-2xl font-bold text-[#111D13] tabular-nums">{totalPickups} titik</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#415D43]/10 text-[#415D43]">
                                <Users className="h-6 w-6" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-[#709775]">Pemasok Sumber</p>
                                <p className="mt-1 text-2xl font-bold text-[#111D13] tabular-nums">{totalSuppliers} pemasok</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Table Card */}
                <Card className="overflow-hidden border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#8FB996]/25 bg-[#F2F7F3] px-5 py-4">
                        <div>
                            <h2 className="text-base font-semibold text-[#111D13]">Riwayat Asal-Usul Persediaan</h2>
                            <p className="text-xs text-[#709775]">Detail verifikasi pencatatan sampah dari penimbangan lapangan hingga lot persediaan.</p>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#709775]" />
                            <Input
                                placeholder="Cari pemasok, grade, petugas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-white border-[#8FB996]/40 text-sm focus-visible:ring-[#415D43]"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-[#F2F7F3]/50 border-b border-[#8FB996]/20 text-[#415D43]">
                                    <TableHead className="font-semibold">Pemasok Sumber</TableHead>
                                    <TableHead className="font-semibold">ID Penjemputan</TableHead>
                                    <TableHead className="font-semibold">Grade & Peruntukan</TableHead>
                                    <TableHead className="font-semibold text-right">Berat (Kg)</TableHead>
                                    <TableHead className="font-semibold">Petugas Lapangan</TableHead>
                                    <TableHead className="font-semibold">Waktu Timbang</TableHead>
                                    <TableHead className="font-semibold text-center">Bukti Foto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-12 text-center text-[#709775]">
                                            {searchQuery ? `Tidak ada lot pasokan yang cocok dengan "${searchQuery}".` : 'Belum ada data lot klasifikasi pasokan.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRows.map((row, index) => (
                                        <TableRow key={`${row.pickup_id}-${row.grade}-${index}`} className="hover:bg-[#F2F7F3]/30 transition-colors">
                                            <TableCell className="font-semibold text-[#111D13]">
                                                {row.supplier ?? `Pemasok #${row.supplier_id}`}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-medium text-[#415D43]">#{row.pickup_id}</span>
                                                    <Badge variant="outline" className="border-transparent bg-emerald-100 text-emerald-800 text-[10px]">
                                                        {row.pickup_status === 'completed' ? 'Selesai' : row.pickup_status}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <GradeBadge grade={row.grade} />
                                                    <span className="text-xs text-[#709775]">({row.intended_use})</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-[#111D13] tabular-nums">
                                                {formatKg(row.kg)}
                                            </TableCell>
                                            <TableCell className="text-[#111D13]">
                                                {row.officer ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-xs text-[#709775] tabular-nums">
                                                {row.checked_in_at
                                                    ? new Date(row.checked_in_at).toLocaleString('id-ID', {
                                                          day: 'numeric',
                                                          month: 'short',
                                                          year: 'numeric',
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                      })
                                                    : '—'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {row.evidence ? (
                                                    <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 border-[#8FB996]/40 text-[#415D43] hover:bg-[#415D43] hover:text-white">
                                                        <a href={row.evidence} target="_blank" rel="noopener noreferrer">
                                                            <Camera className="h-3.5 w-3.5" />
                                                            <span>Foto</span>
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-[#709775]">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
