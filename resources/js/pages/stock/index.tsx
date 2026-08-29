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
import { ArrowRight, PackagePlus } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Stok', href: '/stock' },
];

interface GradeStock {
    grade: string;
    total_kg: number;
}

interface StockIndexProps {
    stock: GradeStock[];
    entries: StockEntry[];
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

export default function StockIndex({ stock, entries }: StockIndexProps) {
    const [open, setOpen] = useState(false);
    const form = useForm<StockFormData>({ grade: '', type: 'in', kg: '', description: '' });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/stock/adjust', {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                form.reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Stok" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-[#f4f3ed] p-4 md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Manajemen stok</h1>
                        <p className="mt-1 text-sm text-[#18352a]/70">Posisi per grade dan riwayat mutasi stok.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            asChild
                            variant="outline"
                            className="min-h-11 border-[#2f6848]/30 text-[#2f6848] hover:bg-[#2f6848]/5 hover:text-[#2f6848] md:min-h-9"
                        >
                            <Link href="/prices">
                                Harga grade
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        </Button>
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button className="min-h-11 bg-[#e88c12] text-[#18352a] hover:bg-[#e88c12]/90 md:min-h-9">
                                    <PackagePlus className="h-4 w-4" aria-hidden="true" />
                                    Penyesuaian stok
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white">
                                <DialogHeader>
                                    <DialogTitle className="text-[#18352a]">Penyesuaian stok manual</DialogTitle>
                                    <DialogDescription>Catat stok masuk, keluar, atau koreksi per grade.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={submit} className="space-y-4">
                                    {Object.keys(form.errors).length > 0 && (
                                        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                                            Periksa kembali isian formulir.
                                        </div>
                                    )}
                                    <StockFormFields form={form} idPrefix="dialog-adjust" />
                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={form.processing} className="min-h-11 md:min-h-9">
                                            Batal
                                        </Button>
                                        <Button type="submit" disabled={form.processing} className="min-h-11 bg-[#2f6848] text-[#f4f3ed] hover:bg-[#18352a] md:min-h-9">
                                            Simpan
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    {stock.map((s) => (
                        <div key={s.grade} className="rounded-2xl border border-[#2f6848]/15 bg-white p-5">
                            <div className="flex items-center justify-between gap-3">
                                <GradeBadge grade={s.grade} />
                                <p className="text-2xl font-semibold text-[#18352a] tabular-nums">
                                    {s.total_kg.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                                    <span className="ml-1 text-sm font-medium text-[#18352a]/70">kg</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <section aria-labelledby="log-heading" className="rounded-2xl border border-[#2f6848]/15 bg-white p-5">
                    <h2 id="log-heading" className="mb-4 text-base font-semibold text-[#18352a]">
                        Riwayat mutasi
                    </h2>
                    <StockTable entries={entries} />
                </section>
            </div>
        </AppLayout>
    );
}
