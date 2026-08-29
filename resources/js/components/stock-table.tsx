import { GradeBadge } from '@/components/grade-badge';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';

export interface StockEntry {
    id: number;
    grade: string;
    kg: string | number;
    type: 'in' | 'out' | 'adjust';
    description: string | null;
    created_at: string;
}

const typeStyles: Record<StockEntry['type'], string> = {
    in: 'border-transparent bg-[#2f6848]/10 text-[#2f6848]',
    out: 'border-transparent bg-[#6b4f2e]/10 text-[#6b4f2e]',
    adjust: 'border-transparent bg-[#e88c12]/15 text-[#18352a]',
};

const typeLabels: Record<StockEntry['type'], string> = {
    in: 'Masuk',
    out: 'Keluar',
    adjust: 'Penyesuaian',
};

const GRADE_FILTER_OPTIONS = ['Semua grade', 'Layak', 'Kurang Layak', 'Tidak Layak'];

function formatDate(value: string): string {
    return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatKg(value: string | number): string {
    return `${Number(value).toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg`;
}

export function StockTable({ entries, className }: { entries: StockEntry[]; className?: string }) {
    const [gradeFilter, setGradeFilter] = useState<string>('Semua grade');
    const [sortDesc, setSortDesc] = useState(true);

    const filtered = useMemo(() => {
        const rows = gradeFilter === 'Semua grade' ? entries : entries.filter((e) => e.grade === gradeFilter);
        return [...rows].sort((a, b) => {
            const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            return sortDesc ? -diff : diff;
        });
    }, [entries, gradeFilter, sortDesc]);

    return (
        <div className={cn('space-y-3', className)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Select value={gradeFilter} onValueChange={setGradeFilter}>
                        <SelectTrigger className="w-44" aria-label="Filter grade">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {GRADE_FILTER_OPTIONS.map((g) => (
                                <SelectItem key={g} value={g}>
                                    {g}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <button
                    type="button"
                    onClick={() => setSortDesc((v) => !v)}
                    className="min-h-11 text-sm font-medium text-[#2f6848] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none md:min-h-9"
                    aria-label={sortDesc ? 'Urutkan terlama dulu' : 'Urutkan terbaru dulu'}
                >
                    {sortDesc ? 'Terlama dulu' : 'Terbaru dulu'}
                </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#2f6848]/15 bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-[#f4f3ed] hover:bg-[#f4f3ed]">
                            <TableHead>Waktu</TableHead>
                            <TableHead>Grade</TableHead>
                            <TableHead>Tipe</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="hidden md:table-cell">Keterangan</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="py-10 text-center text-[#18352a]/70">
                                    Belum ada entri stok.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell className="whitespace-nowrap text-[#18352a] tabular-nums">{formatDate(entry.created_at)}</TableCell>
                                    <TableCell>
                                        <GradeBadge grade={entry.grade} />
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn('font-semibold', typeStyles[entry.type])}>
                                            {typeLabels[entry.type]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums font-semibold text-[#18352a]">
                                        {Number(entry.kg).toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
                                    </TableCell>
                                    <TableCell className="hidden text-[#18352a]/60 md:table-cell">{entry.description ?? '—'}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
