import { AllocationStatus } from '@/components/allocation-status';
import { GradeBadge } from '@/components/grade-badge';
import { FREQUENCY_LABELS, formatKg, type PartnerSummary } from '@/components/partner-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Eye, Handshake, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Mitra', href: '/partners' },
];

import { PaginationBar } from '@/components/ui/pagination-bar';

interface PartnersIndexProps {
    partners: PartnerSummary[];
    filters: { q: string };
    stats: { total: number; active: number; without_contract: number };
}

export default function PartnersIndex({ partners, filters, stats }: PartnersIndexProps) {
    const [query, setQuery] = useState(filters.q);
    const [deletePartner, setDeletePartner] = useState<PartnerSummary | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const totalPages = Math.ceil(partners.length / itemsPerPage);
    const paginatedPartners = partners.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const search = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/partners', { q: query }, { preserveState: true, replace: true });
    };

    const confirmDelete = () => {
        if (!deletePartner) return;
        router.delete(`/partners/${deletePartner.id}`, {
            onSuccess: () => setDeletePartner(null),
        });
    };

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            title="Mitra"
            description="Penerima hasil olahan per grade beserta kapasitas kontraknya."
            actions={
                <Button asChild className="bg-white text-[#0f5235] font-semibold hover:bg-white/90 rounded-full shadow-sm transition-all">
                    <Link href="/partners/create">
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Tambah mitra
                    </Link>
                </Button>
            }
        >
            <Head title="Mitra" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#8FB996]/35 bg-white p-5 shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A1CCA5]/20 text-[#415D43]">
                                <Users className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#111D13]/70">Total mitra</p>
                                <p className="text-2xl font-bold text-[#111D13] tabular-nums">{stats.total}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-[#8FB996]/35 bg-white p-5 shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A1CCA5]/20 text-[#415D43]">
                                <Handshake className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#111D13]/70">Mitra aktif (kontrak aktif)</p>
                                <p className="text-2xl font-bold text-[#111D13] tabular-nums">{stats.active}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-[#8FB996]/35 bg-white p-5 shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e88c12]/15 text-[#8a5a10]">
                                <Handshake className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#111D13]/70">Tanpa kontrak</p>
                                <p className="text-2xl font-bold text-[#111D13] tabular-nums">{stats.without_contract}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={search} className="flex max-w-md items-end gap-2" role="search">
                    <div className="flex-1 space-y-1.5">
                        <Label htmlFor="partner-search">Cari mitra</Label>
                        <Input
                            id="partner-search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Nama atau alamat…"
                            className="min-h-11 bg-white focus:border-[#709775] focus:ring-[#709775]/30"
                        />
                    </div>
                    <Button
                        type="submit"
                        variant="outline"
                        className="min-h-11 border-[#709775] text-[#415D43] hover:bg-[#A1CCA5]/20"
                    >
                        <Search className="h-4 w-4" aria-hidden="true" />
                        Cari
                    </Button>
                </form>

                <div className="overflow-hidden rounded-2xl border border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-[#8FB996]/25 bg-[#F2F7F3] hover:bg-[#F2F7F3] [&>th]:text-[#111D13] [&>th]:font-semibold">
                                <TableHead>Nama</TableHead>
                                <TableHead className="hidden lg:table-cell">Alamat</TableHead>
                                <TableHead>Preferensi</TableHead>
                                <TableHead>Frekuensi</TableHead>
                                <TableHead className="hidden md:table-cell">Kapasitas (min–ideal–maks)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {partners.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-10 text-center text-[#18352a]/70">
                                        {filters.q
                                            ? `Tidak ada mitra yang cocok dengan "${filters.q}".`
                                            : 'Belum ada mitra. Tambahkan mitra pertama.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedPartners.map((p) => {
                                    const active = (p.active_contracts_count ?? 0) > 0;
                                    const hasContract = (p.contracts_count ?? 0) > 0;
                                    return (
                                        <TableRow key={p.id}>
                                            <TableCell>
                                                <Link
                                                    href={`/partners/${p.id}`}
                                                    className="font-semibold text-[#18352a] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none"
                                                >
                                                    {p.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="hidden max-w-56 truncate text-[#18352a]/70 lg:table-cell">{p.address}</TableCell>
                                            <TableCell>
                                                {p.grade_preference ? (
                                                    <GradeBadge grade={p.grade_preference} />
                                                ) : (
                                                    <span className="text-[#18352a]/70">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-[#18352a]/80">{FREQUENCY_LABELS[p.frequency] ?? p.frequency}</TableCell>
                                            <TableCell className="hidden text-[#18352a]/80 tabular-nums md:table-cell">
                                                {formatKg(p.min_capacity_kg)} – {formatKg(p.ideal_capacity_kg)} – {formatKg(p.max_capacity_kg)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col items-start gap-1">
                                                    {active ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-transparent bg-[#2f6848]/10 font-semibold text-[#2f6848]"
                                                        >
                                                            Aktif
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-transparent bg-[#e88c12]/15 font-semibold text-[#18352a]"
                                                        >
                                                            Menunggu
                                                        </Badge>
                                                    )}
                                                    <AllocationStatus
                                                        status={active ? 'active' : hasContract ? 'inactive' : 'none'}
                                                        className="hidden xl:inline-flex"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-[#415D43] hover:bg-[#A1CCA5]/20" title="Detail & Kontrak">
                                                        <Link href={`/partners/${p.id}`}>
                                                            <Eye className="h-4 w-4" />
                                                            <span className="sr-only">Detail</span>
                                                        </Link>
                                                    </Button>
                                                    <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-[#415D43] hover:bg-[#A1CCA5]/20" title="Ubah Profil Mitra">
                                                        <Link href={`/partners/${p.id}/edit`}>
                                                            <Pencil className="h-4 w-4" />
                                                            <span className="sr-only">Ubah</span>
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        onClick={() => setDeletePartner(p)}
                                                        title="Hapus Mitra"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">Hapus</span>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                    <PaginationBar
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={partners.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </div>

                <Dialog open={!!deletePartner} onOpenChange={(open) => !open && setDeletePartner(null)}>
                    <DialogContent className="bg-white">
                        <DialogHeader>
                            <DialogTitle className="text-[#111D13]">Hapus mitra {deletePartner?.name}?</DialogTitle>
                            <DialogDescription>
                                Mitra beserta seluruh kontraknya akan dihapus secara permanen dari sistem.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setDeletePartner(null)}>
                                Batal
                            </Button>
                            <Button type="button" onClick={confirmDelete} className="bg-red-600 text-white hover:bg-red-700">
                                Hapus permanen
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
