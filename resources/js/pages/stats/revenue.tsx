import { useState, useMemo } from 'react';
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
import { Filter, Calendar, ArrowDownLeft, ArrowUpRight, Layers } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Statistik', href: '/stats' },
    { title: 'Pendapatan & Pengeluaran', href: '/stats/revenue' },
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

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

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
    const [filterType, setFilterType] = useState<'all' | 'pendapatan' | 'pengeluaran'>('all');
    const [filterRange, setFilterRange] = useState<'all' | 'today' | '7days' | 'this_month' | 'custom_month' | 'custom_year' | 'custom_date'>('all');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        const currentYear = new Date().getFullYear();
        years.add(currentYear);
        transactions.forEach((t) => {
            if (t.tanggal) {
                const yr = new Date(t.tanggal).getFullYear();
                if (!isNaN(yr)) years.add(yr);
            }
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter((t) => {
            // Type filter
            if (filterType === 'pendapatan' && t.pendapatan <= 0) return false;
            if (filterType === 'pengeluaran' && t.pengeluaran <= 0) return false;

            // Date range filter
            if (filterRange === 'all') return true;
            if (!t.tanggal) return false;

            const txDate = new Date(t.tanggal);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (filterRange === 'today') {
                const d = new Date(txDate);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === today.getTime();
            }

            if (filterRange === '7days') {
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(today.getDate() - 7);
                return txDate >= sevenDaysAgo;
            }

            if (filterRange === 'this_month') {
                return txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
            }

            if (filterRange === 'custom_month') {
                return txDate.getMonth() === selectedMonth && txDate.getFullYear() === selectedYear;
            }

            if (filterRange === 'custom_year') {
                return txDate.getFullYear() === selectedYear;
            }

            if (filterRange === 'custom_date' && selectedDate) {
                const target = new Date(selectedDate + 'T00:00:00');
                return (
                    txDate.getDate() === target.getDate() &&
                    txDate.getMonth() === target.getMonth() &&
                    txDate.getFullYear() === target.getFullYear()
                );
            }

            return true;
        });
    }, [transactions, filterType, filterRange, selectedMonth, selectedYear, selectedDate]);

    const activeTotals = useMemo(() => {
        const pendapatan = filteredTransactions.reduce((acc, t) => acc + t.pendapatan, 0);
        const pengeluaran = filteredTransactions.reduce((acc, t) => acc + t.pengeluaran, 0);
        const paid = filteredTransactions.reduce((acc, t) => acc + t.paid, 0);
        const margin = pendapatan - pengeluaran;
        return { pendapatan, pengeluaran, terbayar: paid, margin };
    }, [filteredTransactions]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pendapatan & Pengeluaran" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-white p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Pendapatan &amp; Pengeluaran</h1>
                    <p className="mt-1 text-sm text-[#18352a]/70">
                        Pencatatan mutasi keuangan riil berdasarkan snapshot penimbangan dan pengiriman.
                    </p>
                </div>

                {/* Bank-Style Filter Card (Solid Sidebar Green Card) */}
                <div className="rounded-2xl bg-[#415D43] p-5 text-white shadow-md space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <Filter className="h-4 w-4 text-[#A1CCA5]" />
                        <span>Filter Mutasi Keuangan</span>
                    </div>

                    {/* Filter Jenis Transaksi */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-[#A1CCA5] mr-1">Jenis:</span>
                        <button
                            type="button"
                            onClick={() => setFilterType('all')}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                filterType === 'all'
                                    ? 'bg-white text-[#415D43] shadow-sm'
                                    : 'bg-white/10 text-white border border-white/15 hover:bg-white/20'
                            }`}
                        >
                            <Layers className="h-3.5 w-3.5" />
                            Semua Transaksi
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType('pendapatan')}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                filterType === 'pendapatan'
                                    ? 'bg-white text-[#415D43] shadow-sm'
                                    : 'bg-white/10 text-white border border-white/15 hover:bg-white/20'
                            }`}
                        >
                            <ArrowUpRight className={`h-3.5 w-3.5 ${filterType === 'pendapatan' ? 'text-emerald-600' : 'text-emerald-400'}`} />
                            Pendapatan (Tagihan Mitra)
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType('pengeluaran')}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                filterType === 'pengeluaran'
                                    ? 'bg-white text-[#415D43] shadow-sm'
                                    : 'bg-white/10 text-white border border-white/15 hover:bg-white/20'
                            }`}
                        >
                            <ArrowDownLeft className={`h-3.5 w-3.5 ${filterType === 'pengeluaran' ? 'text-amber-600' : 'text-amber-300'}`} />
                            Pengeluaran (Beli Pemasok)
                        </button>
                    </div>

                    {/* Filter Periode / Tanggal */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/15">
                        <span className="text-xs font-semibold text-[#A1CCA5] mr-1">Periode:</span>
                        {[
                            { id: 'all', label: 'Semua Tanggal' },
                            { id: 'today', label: 'Hari Ini' },
                            { id: '7days', label: '7 Hari Terakhir' },
                            { id: 'this_month', label: 'Bulan Ini' },
                            { id: 'custom_month', label: 'Pilih Bulan' },
                            { id: 'custom_year', label: 'Pilih Tahun' },
                            { id: 'custom_date', label: 'Pilih Tanggal Spesifik' },
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                type="button"
                                onClick={() => setFilterRange(btn.id as any)}
                                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                    filterRange === btn.id
                                        ? 'bg-white text-[#415D43] shadow-sm'
                                        : 'bg-white/10 text-white border border-white/15 hover:bg-white/20'
                                }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom Month */}
                    {filterRange === 'custom_month' && (
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <Calendar className="h-4 w-4 text-[#A1CCA5]" />
                            <span className="text-xs font-medium text-[#A1CCA5]">Pilih Bulan &amp; Tahun:</span>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="h-9 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-bold text-white focus:bg-[#415D43] focus:outline-none cursor-pointer"
                            >
                                {MONTH_NAMES.map((name, i) => (
                                    <option key={name} value={i} className="bg-[#415D43] text-white">{name}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="h-9 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-bold text-white focus:bg-[#415D43] focus:outline-none cursor-pointer"
                            >
                                {availableYears.map((yr) => (
                                    <option key={yr} value={yr} className="bg-[#415D43] text-white">{yr}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Custom Year */}
                    {filterRange === 'custom_year' && (
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <Calendar className="h-4 w-4 text-[#A1CCA5]" />
                            <span className="text-xs font-medium text-[#A1CCA5]">Pilih Tahun:</span>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="h-9 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-bold text-white focus:bg-[#415D43] focus:outline-none cursor-pointer"
                            >
                                {availableYears.map((yr) => (
                                    <option key={yr} value={yr} className="bg-[#415D43] text-white">{yr}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Custom Date */}
                    {filterRange === 'custom_date' && (
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <Calendar className="h-4 w-4 text-[#A1CCA5]" />
                            <span className="text-xs font-medium text-[#A1CCA5]">Pilih Tanggal:</span>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="h-9 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-bold text-white focus:outline-none cursor-pointer [color-scheme:dark]"
                            />
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <MarginCard pendapatan={activeTotals.pendapatan} pengeluaran={activeTotals.pengeluaran} className="sm:max-w-md" />
                    <div className="rounded-xl bg-[#F2F7F3] border border-[#8FB996]/30 px-4 py-2 text-xs font-bold text-[#18352a]">
                        Menampilkan {filteredTransactions.length} dari {transactions.length} transaksi
                    </div>
                </div>

                {filteredTransactions.length === 0 ? (
                    <Card className="rounded-2xl border-dashed border-[#2f6848]/30 bg-transparent shadow-none">
                        <CardContent className="p-8 text-center text-sm text-[#18352a]/70">
                            Tidak ada transaksi yang sesuai dengan filter yang Anda pilih.
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
                                    {filteredTransactions.map((t) => (
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

