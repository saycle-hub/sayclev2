import { GradeBadge } from '@/components/grade-badge';
import InputError from '@/components/input-error';
import { StockTable, type StockEntry } from '@/components/stock-table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertTriangle, ArrowRight, Building2, MapPin, PackagePlus, Plus } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Stok Gudang', href: '/stock' },
];

export interface GradeStock {
    grade: string;
    total_kg: number;
}

export interface Warehouse {
    id: number;
    code: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    capacity_kg: number;
    is_active: boolean;
    is_default: boolean;
    notes?: string;
    occupied_kg?: number;
    occupancy_rate?: number;
    grade_stocks?: Record<string, number>;
}

export interface SafeHoldingLimit {
    max_days: number;
    target: string;
    risk: string;
    badge: string;
}

interface StockIndexProps {
    stock: GradeStock[];
    entries: StockEntry[];
    warehouses?: Warehouse[];
    unallocatedStocks?: { grade: string; stock_kg: number; allocated_kg: number; unallocated_kg: number }[];
    safeHoldingLimits?: Record<string, SafeHoldingLimit>;
    idealDemands?: Record<string, number>;
}

export const GRADES = ['Layak', 'Kurang Layak', 'Tidak Layak'] as const;

export const MOVEMENT_TYPES = [
    { value: 'in', label: 'Masuk — tambah stok' },
    { value: 'out', label: 'Keluar — kurangi stok' },
    { value: 'adjust', label: 'Koreksi — tambah/kurangi dengan tanda' },
] as const;

export interface StockFormData {
    grade: string;
    type: string;
    kg: string;
    description: string;
    [key: string]: string;
}

export function StockFormFields({ form, idPrefix }: { form: ReturnType<typeof useForm<StockFormData>>; idPrefix: string }) {
    const isAdjust = form.data.type === 'adjust';

    return (
        <>
            <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-grade`}>Grade</Label>
                <Select value={form.data.grade} onValueChange={(v) => form.setData('grade', v)}>
                    <SelectTrigger id={`${idPrefix}-grade`} className="min-h-11 focus:border-[#2f6848] focus:ring-[#2f6848]/30">
                        <SelectValue placeholder="Pilih grade" />
                    </SelectTrigger>
                    <SelectContent>
                        {GRADES.map((g) => (
                            <SelectItem key={g} value={g}>
                                {g}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={form.errors.grade} />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-type`}>Tipe mutasi</Label>
                <Select value={form.data.type} onValueChange={(v) => form.setData('type', v)}>
                    <SelectTrigger id={`${idPrefix}-type`} className="min-h-11 focus:border-[#2f6848] focus:ring-[#2f6848]/30">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {MOVEMENT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                                {t.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-[#18352a]/70">
                    {isAdjust
                        ? 'Koreksi menerima tanda: isi +10 untuk menambah 10 kg atau -5 untuk mengurangi 5 kg.'
                        : 'Jumlah untuk stok masuk/keluar selalu angka positif.'}
                </p>
                <InputError message={form.errors.type} />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-kg`}>{isAdjust ? 'Koreksi jumlah (kg, contoh: +10 atau -5)' : 'Jumlah (kg)'}</Label>
                <Input
                    id={`${idPrefix}-kg`}
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    {...(isAdjust ? { min: undefined, placeholder: 'contoh: +10 atau -5' } : { min: '0.01' })}
                    value={form.data.kg}
                    onChange={(e) => form.setData('kg', e.target.value)}
                    className="min-h-11 focus:border-[#2f6848] focus:ring-[#2f6848]/30"
                    required
                />
                <InputError message={form.errors.kg} />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-description`}>Keterangan (opsional)</Label>
                <Textarea
                    id={`${idPrefix}-description`}
                    value={form.data.description}
                    onChange={(e) => form.setData('description', e.target.value)}
                    className="focus:border-[#2f6848] focus:ring-[#2f6848]/30"
                    rows={3}
                />
                <InputError message={form.errors.description} />
            </div>
        </>
    );
}

export default function StockIndex({
    stock,
    entries,
    warehouses = [],
    unallocatedStocks = [],
    safeHoldingLimits = {},
    idealDemands = {},
}: StockIndexProps) {
    const [openAdjust, setOpenAdjust] = useState(false);
    const [openAddWarehouse, setOpenAddWarehouse] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

    const form = useForm<StockFormData>({ grade: '', type: 'in', kg: '', description: '' });

    const warehouseForm = useForm({
        code: '',
        name: '',
        address: '',
        latitude: '-7.7956',
        longitude: '110.3695',
        capacity_kg: '5000',
        notes: '',
    });

    const submitAdjust = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/stock/adjust', {
            preserveScroll: true,
            onSuccess: () => {
                setOpenAdjust(false);
                form.reset();
            },
        });
    };

    const submitWarehouse = (e: React.FormEvent) => {
        e.preventDefault();
        warehouseForm.post('/stock/warehouses', {
            preserveScroll: true,
            onSuccess: () => {
                setOpenAddWarehouse(false);
                warehouseForm.reset();
            },
        });
    };

    const totalCapacityKg = warehouses.reduce((acc, w) => acc + Number(w.capacity_kg), 0);

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            title="Stok Gudang & Mutasi"
            description="Manajemen titik gudang fisik Yogyakarta, kapasitas, dan ledger mutasi stok."
            actions={
                <>
                    <Button
                        asChild
                        variant="outline"
                        className="border-white/40 bg-white/10 text-white hover:bg-white hover:text-[#0f5235] rounded-full transition-all"
                    >
                        <Link href="/prices">
                            Harga grade
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </Button>
                    <Dialog open={openAddWarehouse} onOpenChange={setOpenAddWarehouse}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white hover:text-[#0f5235] rounded-full transition-all">
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Tambah Gudang
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white text-[#111D13] border border-[#8FB996]/35 max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="text-[#111D13] flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-[#2f6848]" />
                                    Tambah Gudang Fisik Baru
                                </DialogTitle>
                                <DialogDescription className="text-[#709775]">
                                    Daftarkan depo/gudang penampungan baru di area Operasional Yogyakarta.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={submitWarehouse} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="wh-code">Kode Gudang</Label>
                                        <Input
                                            id="wh-code"
                                            placeholder="GDG-SLM-03"
                                            value={warehouseForm.data.code}
                                            onChange={(e) => warehouseForm.setData('code', e.target.value)}
                                            required
                                        />
                                        <InputError message={warehouseForm.errors.code} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="wh-name">Nama Gudang</Label>
                                        <Input
                                            id="wh-name"
                                            placeholder="Gudang Hub Kalasan"
                                            value={warehouseForm.data.name}
                                            onChange={(e) => warehouseForm.setData('name', e.target.value)}
                                            required
                                        />
                                        <InputError message={warehouseForm.errors.name} />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="wh-address">Alamat Lengkap</Label>
                                    <Textarea
                                        id="wh-address"
                                        rows={2}
                                        placeholder="Jl. Raya Solo-Yogyakarta Km 14, Kalasan, Sleman"
                                        value={warehouseForm.data.address}
                                        onChange={(e) => warehouseForm.setData('address', e.target.value)}
                                        required
                                    />
                                    <InputError message={warehouseForm.errors.address} />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="wh-lat">Latitude</Label>
                                        <Input
                                            id="wh-lat"
                                            type="number"
                                            step="0.000001"
                                            value={warehouseForm.data.latitude}
                                            onChange={(e) => warehouseForm.setData('latitude', e.target.value)}
                                            required
                                        />
                                        <InputError message={warehouseForm.errors.latitude} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="wh-lng">Longitude</Label>
                                        <Input
                                            id="wh-lng"
                                            type="number"
                                            step="0.000001"
                                            value={warehouseForm.data.longitude}
                                            onChange={(e) => warehouseForm.setData('longitude', e.target.value)}
                                            required
                                        />
                                        <InputError message={warehouseForm.errors.longitude} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="wh-cap">Kapasitas (kg)</Label>
                                        <Input
                                            id="wh-cap"
                                            type="number"
                                            step="100"
                                            value={warehouseForm.data.capacity_kg}
                                            onChange={(e) => warehouseForm.setData('capacity_kg', e.target.value)}
                                            required
                                        />
                                        <InputError message={warehouseForm.errors.capacity_kg} />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="wh-notes">Catatan (opsional)</Label>
                                    <Input
                                        id="wh-notes"
                                        placeholder="Fasilitas timbangan digital 2 ton"
                                        value={warehouseForm.data.notes}
                                        onChange={(e) => warehouseForm.setData('notes', e.target.value)}
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="ghost" onClick={() => setOpenAddWarehouse(false)}>
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={warehouseForm.processing} className="bg-[#2f6848] text-white hover:bg-[#18352a]">
                                        Simpan Gudang
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={openAdjust} onOpenChange={setOpenAdjust}>
                        <DialogTrigger asChild>
                            <Button className="bg-white text-[#0f5235] font-semibold hover:bg-white/90 rounded-full shadow-sm transition-all">
                                <PackagePlus className="h-4 w-4" aria-hidden="true" />
                                Penyesuaian stok
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white text-[#111D13] border border-[#8FB996]/35">
                            <DialogHeader>
                                <DialogTitle className="text-[#111D13]">Penyesuaian stok manual</DialogTitle>
                                <DialogDescription className="text-[#709775]">Catat stok masuk, keluar, atau koreksi per grade.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={submitAdjust} className="space-y-4">
                                {Object.keys(form.errors).length > 0 && (
                                    <div role="alert" className="rounded-lg border border-red-300 bg-red-500/20 px-3 py-2 text-sm text-red-700">
                                        Periksa kembali isian formulir.
                                    </div>
                                )}
                                <StockFormFields form={form} idPrefix="dialog-adjust" />
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="ghost" onClick={() => setOpenAdjust(false)} disabled={form.processing} className="min-h-11 md:min-h-9 text-[#111D13]/70 hover:bg-[#F2F7F3]">
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={form.processing} className="min-h-11 bg-[#2f6848] text-white hover:bg-[#18352a] font-semibold md:min-h-9">
                                        Simpan
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </>
            }
        >
            <Head title="Stok Gudang & Mutasi" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 text-[#18352a]">

                {/* 1. INFO STOK BELUM DIALOKASI (PALING ATAS - DESAIN DISESUAIKAN DENGAN RUTE PENGIRIMAN) */}
                {unallocatedStocks && unallocatedStocks.length > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#2f6848]/30 bg-[#2f6848]/10 p-3.5 px-5 text-[#18352a] shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2f6848]/20 text-[#2f6848]">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[#18352a]">
                                    Peringatan: Stok Masuk Belum Dialokasikan
                                </p>
                                <p className="text-xs text-[#18352a]/70">
                                    Rincian stok belum dialokasikan: <strong className="font-semibold text-[#18352a]">{unallocatedStocks.map((s) => `${s.grade}: ${s.unallocated_kg.toLocaleString('id-ID')} kg`).join(' | ')}</strong>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <span className="hidden sm:inline-block rounded-full bg-[#18352a]/10 px-3 py-1 text-xs font-mono font-bold text-[#18352a]">
                                Total: {unallocatedStocks.reduce((acc, s) => acc + s.unallocated_kg, 0).toLocaleString('id-ID')} kg
                            </span>
                            <Button asChild className="h-9 rounded-xl bg-[#18352a] px-4 text-xs font-bold text-white hover:bg-[#2f6848] transition-all shrink-0">
                                <Link href="/allocation">Alokasikan Sekarang</Link>
                            </Button>
                        </div>
                    </div>
                )}

                {/* 2. GUDANG & DEPO OPERASIONAL (KEDUA) */}
                <section aria-labelledby="warehouses-heading" className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#18352a]/10 pb-2">
                        <div>
                            <h2 id="warehouses-heading" className="text-base font-semibold text-[#111D13]">
                                Gudang & Depo Operasional Yogyakarta
                            </h2>
                            <p className="text-xs text-[#709775]">
                                Titik penampungan fisik & penimbangan limbah sebelum distribusi ke mitra. Total Kapasitas: {totalCapacityKg.toLocaleString('id-ID')} kg
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                        {warehouses.map((w) => (
                            <div
                                key={w.id}
                                className="overflow-hidden rounded-2xl border border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)] flex flex-col justify-between"
                            >
                                <div className="flex items-center justify-between gap-3 border-b border-[#8FB996]/25 bg-[#F2F7F3] px-5 py-3.5">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded bg-[#18352a]/10 px-2 py-0.5 text-xs font-mono font-semibold text-[#18352a]">
                                            {w.code}
                                        </span>
                                        <h3 className="text-base font-semibold text-[#111D13]">{w.name}</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${w.is_default ? 'bg-[#2f6848]/10 text-[#2f6848]' : 'bg-[#18352a]/10 text-[#18352a]'}`}>
                                            {w.is_default ? 'Depo Utama' : 'Gudang Hub'}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedWarehouse(w)}
                                            className="h-7 text-xs border-[#8FB996]/50 text-[#18352a] hover:bg-[#2f6848] hover:text-white transition-colors shrink-0"
                                        >
                                            Detail
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-5 space-y-3.5 text-xs text-[#18352a] flex-1 flex flex-col justify-between">
                                    <div>
                                        <p className="text-[#18352a]/80 font-medium line-clamp-2">{w.address}</p>
                                    </div>

                                    {/* Warehouse Capacity Occupancy Bar */}
                                    <div className="space-y-1.5 pt-2 border-t border-[#8FB996]/20">
                                        <div className="flex items-center justify-between text-xs font-bold text-[#18352a]">
                                            <span>Keterisian Gudang:</span>
                                            <span className="tabular-nums">
                                                {Number(w.occupied_kg ?? 0).toLocaleString('id-ID')} / {Number(w.capacity_kg).toLocaleString('id-ID')} kg ({w.occupancy_rate ?? 0}% terisi)
                                            </span>
                                        </div>
                                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#18352a]/10">
                                            <div
                                                className="h-full bg-[#2f6848] transition-all"
                                                style={{ width: `${Math.min(100, w.occupancy_rate ?? 0)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Per Grade Stock Breakdown (Integrated 3-part section like Dashboard) */}
                                    {w.grade_stocks && (
                                        <div className="-mx-5 border-y border-[#8FB996]/25 bg-[#F2F7F3]">
                                            <div className="grid grid-cols-3 divide-x divide-[#18352a]/10">
                                                {Object.entries(w.grade_stocks).map(([grade, kg]) => (
                                                    <div key={grade} className="py-3 px-2 text-center">
                                                        <span className="block text-[11px] font-bold text-[#2f6848]">{grade}</span>
                                                        <span className="text-sm font-extrabold text-[#111D13] tabular-nums mt-0.5 block">{Number(kg).toLocaleString('id-ID')} kg</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-1 flex items-center justify-between text-xs font-medium text-[#18352a]/80">
                                        <span>Koordinat: <strong className="font-mono text-[#2f6848]">{Number(w.latitude).toFixed(4)}, {Number(w.longitude).toFixed(4)}</strong></span>
                                        <span className="text-[#2f6848] font-bold">Kapasitas: {Number(w.capacity_kg).toLocaleString('id-ID')} kg</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 3. POSISI STOK & BATAS AMAN HOLDING (DIBUAT 1 CARD UTAMA DIBAGI 3 SEPERTI STATUS ALOKASI DI DASBOR) */}
                <section aria-labelledby="stock-perishability-heading" className="overflow-hidden rounded-2xl border border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#8FB996]/25 bg-[#F2F7F3] px-5 py-3.5">
                        <div>
                            <h2 id="stock-perishability-heading" className="text-base font-semibold text-[#111D13]">
                                Posisi Stok & Batas Aman Holding (Per Grade Sayur)
                            </h2>
                            <p className="text-xs text-[#709775]">
                                Penjumlahan stok ideal dari total sampah sayuran & batas aman simpan gudang sebelum distribusi.
                            </p>
                        </div>
                    </div>
                    <div className="p-0">
                        <div className="grid grid-cols-1 divide-y divide-[#18352a]/10 sm:grid-cols-3 sm:divide-y-0 sm:divide-x sm:divide-[#18352a]/10">
                            {stock.map((s) => {
                                const limit = safeHoldingLimits[s.grade] ?? {
                                    max_days: s.grade === 'Layak' ? 2 : s.grade === 'Kurang Layak' ? 3 : 5,
                                    target: s.grade === 'Layak' ? 'Pakan Ternak Segar' : s.grade === 'Kurang Layak' ? 'Maggot BSF' : 'Kompos Organik',
                                    risk: s.grade === 'Layak' ? 'Pembusukan & tekstur lembek jika > 48 jam' : s.grade === 'Kurang Layak' ? 'Fermentasi asam berlebih jika > 72 jam' : 'Bau menyengat & gas metana jika > 120 jam',
                                    badge: `${s.grade === 'Layak' ? 2 : s.grade === 'Kurang Layak' ? 3 : 5} Hari (${s.grade === 'Layak' ? 48 : s.grade === 'Kurang Layak' ? 72 : 120} Jam)`,
                                };

                                const idealKg = idealDemands[s.grade] ?? s.total_kg;
                                const occupancyPercentage = idealKg > 0 ? Math.round((s.total_kg / idealKg) * 100) : 100;

                                return (
                                    <div key={s.grade} className="p-5 sm:p-6 space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <GradeBadge grade={s.grade} />
                                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200/80">
                                                Max {limit.badge}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-[11px] font-bold text-[#18352a]/60 block uppercase tracking-wider">Total Stok Tersedia</span>
                                            <div className="flex items-baseline justify-between mt-0.5">
                                                <p className="text-2xl sm:text-3xl font-extrabold text-[#111D13] tabular-nums">
                                                    {s.total_kg.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{' '}
                                                    <span className="text-sm font-semibold text-[#111D13]/70">kg</span>
                                                </p>
                                                <span className="rounded-full bg-[#2f6848]/10 px-2.5 py-0.5 text-xs font-bold text-[#2f6848]">
                                                    {occupancyPercentage}% Terisi
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[#18352a]/60 mt-1 font-medium">
                                                Kebutuhan Ideal Mitra: {idealKg.toLocaleString('id-ID')} kg
                                            </p>
                                        </div>

                                        <div className="space-y-1 text-xs pt-3 border-t border-[#8FB996]/20">
                                            <p className="text-[#2f6848] font-bold">
                                                Tujuan: <span className="text-[#18352a] font-medium">{limit.target}</span>
                                            </p>
                                            <p className="text-rose-700 font-bold">
                                                Risiko: <span className="text-[#18352a]/80 font-normal">{limit.risk}</span>
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* 4. RIWAYAT LEDGER MUTASI GUDANG (KEEMPAT) */}
                <section aria-labelledby="log-heading" className="overflow-hidden rounded-2xl border border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                    <div className="flex items-baseline justify-between gap-3 border-b border-[#8FB996]/25 bg-[#F2F7F3] px-5 py-3.5">
                        <h2 id="log-heading" className="text-base font-semibold text-[#111D13]">
                            Riwayat Ledger Mutasi Gudang
                        </h2>
                        <span className="text-xs text-[#709775]">Catatan Otomatis Penimbangan & Penerimaan</span>
                    </div>
                    <div className="p-5">
                        <StockTable entries={entries} />
                    </div>
                </section>
            </div>

            {/* Warehouse Detail Modal */}
            {selectedWarehouse && (
                <Dialog open={!!selectedWarehouse} onOpenChange={() => setSelectedWarehouse(null)}>
                    <DialogContent className="bg-white text-[#111D13] border border-[#8FB996]/35 max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-[#18352a] flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-[#2f6848]" />
                                {selectedWarehouse.name}
                            </DialogTitle>
                            <DialogDescription className="text-[#709775]">
                                Detail lokasi, kapasitas keterisian, dan rincian jenis stok sampah.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 py-2 text-sm text-[#18352a]">
                            <div className="flex justify-between py-1 border-b border-[#8FB996]/20">
                                <span className="text-[#18352a]/70">Kode Gudang:</span>
                                <span className="font-mono font-bold">{selectedWarehouse.code}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#8FB996]/20">
                                <span className="text-[#18352a]/70">Status Depo:</span>
                                <span>{selectedWarehouse.is_default ? 'Depo Utama (Default Routing)' : 'Gudang Hub Cabang'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#8FB996]/20">
                                <span className="text-[#18352a]/70">Total Terisi:</span>
                                <span className="font-bold">{Number(selectedWarehouse.occupied_kg ?? 0).toLocaleString('id-ID')} / {Number(selectedWarehouse.capacity_kg).toLocaleString('id-ID')} kg ({selectedWarehouse.occupancy_rate ?? 0}%)</span>
                            </div>

                            {selectedWarehouse.grade_stocks && (
                                <div className="py-2 border-b border-[#8FB996]/20 space-y-1.5">
                                    <span className="text-[#18352a]/70 text-xs font-semibold block">Rincian Jenis Sampah Terisi:</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(selectedWarehouse.grade_stocks).map(([grade, kg]) => (
                                            <div key={grade} className="rounded-lg bg-[#F2F7F3] p-2 text-center border border-[#8FB996]/30">
                                                <span className="block text-[10px] font-bold text-[#415D43]">{grade}</span>
                                                <span className="text-xs font-bold text-[#111D13] tabular-nums">{Number(kg).toLocaleString('id-ID')} kg</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="py-1 border-b border-[#8FB996]/20">
                                <span className="text-[#18352a]/70 block mb-0.5">Alamat Gudang:</span>
                                <p className="font-medium">{selectedWarehouse.address}</p>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#8FB996]/20">
                                <span className="text-[#18352a]/70">Koordinat GPS:</span>
                                <a
                                    href={`https://www.openstreetmap.org/?mlat=${selectedWarehouse.latitude}&mlon=${selectedWarehouse.longitude}#map=15/${selectedWarehouse.latitude}/${selectedWarehouse.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#2f6848] underline font-mono flex items-center gap-1 hover:text-[#e88c12]"
                                >
                                    <MapPin className="h-3.5 w-3.5" />
                                    {selectedWarehouse.latitude}, {selectedWarehouse.longitude}
                                </a>
                            </div>
                            {selectedWarehouse.notes && (
                                <div className="py-1">
                                    <span className="text-[#18352a]/70 block mb-0.5">Catatan:</span>
                                    <p className="text-xs bg-[#F2F7F3] p-2 rounded border border-[#8FB996]/30">{selectedWarehouse.notes}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button variant="outline" onClick={() => setSelectedWarehouse(null)}>
                                Tutup
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </AppLayout>
    );
}
