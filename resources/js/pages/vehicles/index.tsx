import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Kendaraan', href: '/vehicles' },
];

interface Vehicle {
    id: number;
    name: string;
    capacity_kg: number;
    is_active: boolean;
    active_tasks: number;
}

export default function VehiclesIndex({ vehicles }: { vehicles: Vehicle[] }) {
    const [editing, setEditing] = useState<Vehicle | null>(null);

    const createForm = useForm({ name: '', capacity_kg: '' });
    const editForm = useForm<{ name: string; capacity_kg: string; is_active: boolean }>({ name: '', capacity_kg: '', is_active: true });

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('vehicles.store'), {
            preserveScroll: true,
            onSuccess: () => createForm.reset(),
        });
    };

    const openEdit = (v: Vehicle) => {
        setEditing(v);
        editForm.setData('name', v.name);
        editForm.setData('capacity_kg', String(v.capacity_kg));
        editForm.setData('is_active', v.is_active);
    };

    const submitEdit = () => {
        if (!editing) return;
        editForm.put(route('vehicles.update', editing.id), {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            title="Kendaraan"
            description="Kelola armada untuk pengambilan limbah sayur."
        >
            <Head title="Kendaraan" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">

                {/* Add form */}
                <form onSubmit={submitCreate} className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#8FB996]/35 bg-white p-5 shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                    <div className="flex-1">
                        <Label htmlFor="v-name">Nama kendaraan</Label>
                        <Input
                            id="v-name"
                            value={createForm.data.name}
                            onChange={(e) => createForm.setData('name', e.target.value)}
                            placeholder="Pickup L300"
                            className="mt-1 min-h-11 focus:border-[#709775] focus:ring-[#709775]/30"
                        />
                    </div>
                    <div className="w-40">
                        <Label htmlFor="v-cap">Kapasitas (kg)</Label>
                        <Input
                            id="v-cap"
                            type="number"
                            min={1}
                            step="0.01"
                            value={createForm.data.capacity_kg}
                            onChange={(e) => createForm.setData('capacity_kg', e.target.value)}
                            placeholder="500"
                            className="mt-1 min-h-11 focus:border-[#709775] focus:ring-[#709775]/30"
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={createForm.processing}
                        className="min-h-11 bg-[#415D43] text-white hover:bg-[#344B36]"
                    >
                        <Plus size={16} className="mr-1" aria-hidden />
                        Tambah
                    </Button>
                </form>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-[#8FB996]/25 bg-[#F2F7F3] hover:bg-[#F2F7F3] [&>th]:text-[#111D13] [&>th]:font-semibold">
                                <TableHead>Nama</TableHead>
                                <TableHead className="text-right">Kapasitas</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Tugas aktif</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vehicles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-sm text-[#18352a]/70">
                                        Belum ada kendaraan. Tambah kendaraan di atas.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                vehicles.map((v) => (
                                    <TableRow key={v.id}>
                                        <TableCell className="font-medium text-[#18352a]">{v.name}</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {v.capacity_kg.toLocaleString('id-ID')} kg
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span
                                                className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${v.is_active ? 'bg-[#2f6848]/10 text-[#2f6848]' : 'bg-[#18352a]/10 text-[#18352a]/70'}`}
                                            >
                                                {v.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{v.active_tasks}</TableCell>
                                        <TableCell className="text-right">
                                            <button
                                                onClick={() => openEdit(v)}
                                                className="min-h-11 text-sm font-medium text-[#2f6848] underline-offset-4 hover:underline md:min-h-9"
                                            >
                                                Edit
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Edit dialog */}
                <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Edit kendaraan</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="edit-name">Nama</Label>
                                <Input
                                    id="edit-name"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    className="mt-1 min-h-11"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-cap">Kapasitas (kg)</Label>
                                <Input
                                    id="edit-cap"
                                    type="number"
                                    min={1}
                                    step="0.01"
                                    value={editForm.data.capacity_kg}
                                    onChange={(e) => editForm.setData('capacity_kg', e.target.value)}
                                    className="mt-1 min-h-11"
                                />
                            </div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={editForm.data.is_active}
                                    onChange={(e) => editForm.setData('is_active', e.target.checked)}
                                    className="size-4 rounded border-[#2f6848]/40 text-[#2f6848] focus:ring-[#e88c12]"
                                />
                                <span className="text-sm text-[#18352a]">Aktif</span>
                            </label>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="ghost" onClick={() => setEditing(null)} disabled={editForm.processing}>
                                Batal
                            </Button>
                            <Button
                                onClick={submitEdit}
                                disabled={editForm.processing}
                                className="bg-[#2f6848] text-[#f4f3ed] hover:bg-[#18352a] focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none"
                            >
                                Simpan
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
