import { AllocationStatus } from '@/components/allocation-status';
import { GradeBadge } from '@/components/grade-badge';
import { FREQUENCY_LABELS, formatKg, type PartnerSummary } from '@/components/partner-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Handshake, Plus, Search, Users } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Mitra', href: '/partners' },
];

interface PartnersIndexProps {
    partners: PartnerSummary[];
    filters: { q: string };
    stats: { total: number; active: number; without_contract: number };
}

export default function PartnersIndex({ partners, filters, stats }: PartnersIndexProps) {
    const [query, setQuery] = useState(filters.q);

    const search = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/partners', { q: query }, { preserveState: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Mitra" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-[#f4f3ed] p-4 md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Mitra</h1>
                        <p className="mt-1 text-sm text-[#18352a]/70">Penerima hasil olahan per grade beserta kapasitas kontraknya.</p>
                    </div>
                    <Button asChild className="min-h-11 bg-[#e88c12] text-[#18352a] hover:bg-[#e88c12]/90 md:min-h-9">
                        <Link href="/partners/create">
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Tambah mitra
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#2f6848]/15 bg-white p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2f6848]/10 text-[#2f6848]">
                                <Users className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-sm text-[#18352a]/70">Total mitra</p>
                                <p className="text-xl font-semibold text-[#18352a] tabular-nums">{stats.total}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-[#2f6848]/15 bg-white p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2f6848]/10 text-[#2f6848]">
                                <Handshake className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-sm text-[#18352a]/70">Kontrak aktif</p>
                                <p className="text-xl font-semibold text-[#18352a] tabular-nums">{stats.active}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-[#2f6848]/15 bg-white p-5">
                        <p className="text-sm text-[#18352a]/70">Belum punya kontrak</p>
                        <p className="mt-1 text-xl font-semibold text-[#18352a] tabular-nums">{stats.without_contract}</p>
                        <p className="mt-1 text-xs text-[#18352a]/70">Mitra tanpa kontrak tidak menerima alokasi.</p>
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
                            className="min-h-11 bg-white focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                        />
                    </div>
                    <Button
                        type="submit"
                        variant="outline"
                        className="min-h-11 border-[#2f6848]/30 text-[#2f6848] hover:bg-[#2f6848]/5 hover:text-[#2f6848]"
                    >
                        <Search className="h-4 w-4" aria-hidden="true" />
                        Cari
                    </Button>
                </form>

                <div className="overflow-hidden rounded-2xl border border-[#2f6848]/15 bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-[#f4f3ed] hover:bg-[#f4f3ed]">
                                <TableHead>Nama</TableHead>
                                <TableHead className="hidden lg:table-cell">Alamat</TableHead>
                                <TableHead>Preferensi</TableHead>
                                <TableHead>Frekuensi</TableHead>
                                <TableHead className="hidden md:table-cell">Kapasitas (min–ideal–maks)</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {partners.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-10 text-center text-[#18352a]/70">
                                        {filters.q
                                            ? `Tidak ada mitra yang cocok dengan "${filters.q}".`
                                            : 'Belum ada mitra. Tambahkan mitra pertama.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                partners.map((p) => {
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
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
