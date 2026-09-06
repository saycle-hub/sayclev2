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
import { ArrowRight, Building2, MapPin, PackagePlus, Plus, ShieldCheck, Warehouse as WarehouseIcon } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Stok Gudang', href: '/stock' },
];

interface GradeStock {
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
}

interface StockIndexProps {
    stock: GradeStock[];
    entries: StockEntry[];
    warehouses?: Warehouse[];
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
                    <SelectTrigger id={`${idPrefix}-grade`} className="min-h-11 focus:border-[#e88c12] focus:ring-[#e88c12]/30">
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
                    <SelectTrigger id={`${idPrefix}-type`} className="min-h-11 focus:border-[#e88c12] focus:ring-[#e88c12]/30">
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
                    className="min-h-11 focus:border-[#e88c12] focus:ring-[#e88c12]/30"
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
                    className="focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                    rows={3}
                />
                <InputError message={form.errors.description} />
            </div>
        </>
    );
}

export default function StockIndex({ stock, entries, warehouses = [] }: StockIndexProps) {
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
    const totalStockKg = stock.reduce((acc, s) => acc + s.total_kg, 0);

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
                                    <Button type="submit" disabled={form.processing} className="min-h-11 bg-[#415D43] text-white hover:bg-[#344B36] font-semibold md:min-h-9">
                                        Simpan
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </>
            }
        >
            <Head title="Stok Gudang" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Real Physical Warehouses Section */}
                <section aria-labelledby="warehouses-heading" className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h2 id="warehouses-heading" className="text-lg font-bold text-[#18352a] flex items-center gap-2">
                                <WarehouseIcon className="h-5 w-5 text-[#2f6848]" />
                                Gudang & Depo Operasional
                            </h2>
                            <p className="text-xs text-[#18352a]/70">
                                Titik asal rute penjemputan supplier & pengiriman mitra di Daerah Istimewa Yogyakarta. Total Kapasitas: {totalCapacityKg.toLocaleString('id-ID')} kg
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                        {warehouses.map((w) => (
                            <div
                                key={w.id}
                                className="group relative rounded-2xl border border-[#8FB996]/40 bg-white p-5 shadow-sm hover:shadow-md transition-all space-y-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="rounded bg-[#18352a]/10 px-2 py-0.5 text-xs font-mono font-semibold text-[#18352a]">
                                                {w.code}
                                            </span>
                                            {w.is_default && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#2f6848]/10 px-2.5 py-0.5 text-xs font-medium text-[#2f6848]">
                                                    <ShieldCheck className="h-3 w-3" /> Depo Utama
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="mt-1 text-base font-bold text-[#18352a] group-hover:text-[#2f6848] transition-colors">
                                            {w.name}
                                        </h3>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedWarehouse(w)}
                                        className="text-xs border-[#8FB996]/50 text-[#18352a] hover:bg-[#F2F7F3]"
                                    >
                                        Detail
                                    </Button>
                                </div>

                                <div className="flex items-start gap-1.5 text-xs text-[#18352a]/75">
                                    <MapPin className="h-3.5 w-3.5 text-[#e88c12] shrink-0 mt-0.5" />
                                    <span className="line-clamp-2">{w.address}</span>
                                </div>

                                {/* Per-Warehouse Stock Breakdown per Grade */}
                                <div className="space-y-2 pt-2 border-t border-[#8FB996]/20">
                                    <div className="flex items-center justify-between text-xs font-semibold text-[#18352a]">
                                        <span>Keterisian Gudang:</span>
                                        <span className="tabular-nums">
                                            {Number(w.occupied_kg ?? 0).toLocaleString('id-ID')} / {Number(w.capacity_kg).toLocaleString('id-ID')} kg ({w.occupancy_rate ?? 0}%)
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#18352a]/10">
                                        <div
                                            className="h-full bg-[#415D43] transition-all"
                                            style={{ width: `${Math.min(100, w.occupancy_rate ?? 0)}%` }}
                                        />
                                    </div>

                                    {w.grade_stocks && (
                                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                                            {Object.entries(w.grade_stocks).map(([grade, kg]) => (
                                                <div key={grade} className="rounded-lg bg-[#F2F7F3] p-1.5 text-center border border-[#8FB996]/25">
                                                    <span className="block text-[10px] font-semibold text-[#709775]">{grade}</span>
                                                    <span className="text-xs font-bold text-[#111D13] tabular-nums">{Number(kg).toLocaleString('id-ID')} kg</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 border-t border-[#8FB996]/20 flex items-center justify-between text-xs font-medium text-[#18352a]/80">
                                    <span>Status Depo: <strong className="text-[#18352a]">{w.is_default ? 'Depo Utama' : 'Gudang Hub'}</strong></span>
                                    <span className="text-[#2f6848]">
                                        {w.latitude.toFixed(4)}, {w.longitude.toFixed(4)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Stock per Grade Summary */}
                <section aria-labelledby="stock-summary-heading" className="space-y-3">
                    <h2 id="stock-summary-heading" className="text-base font-bold text-[#18352a]">
                        Posisi Stok Komulatif Per Grade ({totalStockKg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg)
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {stock.map((s) => (
                            <div key={s.grade} className="rounded-2xl border border-[#8FB996]/35 bg-white p-5 shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                                <div className="flex items-center justify-between gap-3">
                                    <GradeBadge grade={s.grade} />
                                    <p className="text-2xl font-semibold text-[#111D13] tabular-nums">
                                        {s.total_kg.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                                        <span className="ml-1 text-sm font-medium text-[#111D13]/70">kg</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Ledger Mutation Table */}
                <section aria-labelledby="log-heading" className="overflow-hidden rounded-2xl border border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                    <div className="border-b border-[#8FB996]/25 bg-[#F2F7F3] px-5 py-3.5">
                        <h2 id="log-heading" className="text-base font-semibold text-[#111D13]">
                            Riwayat Mutasi Ledger Gudang
                        </h2>
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
