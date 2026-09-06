import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { Plus, UserPlus, UserCog, ShieldCheck, UserCheck, Users, Trash2, Edit2 } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { PaginationBar } from '@/components/ui/pagination-bar';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Pengguna & Petugas', href: '/users' },
];

interface UserItem {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
}

interface Props {
    users: UserItem[];
    filters: { role: string };
}

const ROLES = [
    { value: 'officer', label: 'Petugas / Driver', color: 'bg-[#2f6848]/10 text-[#2f6848]' },
    { value: 'admin', label: 'Admin Logistik', color: 'bg-[#111D13] text-white' },
] as const;

export default function UsersIndex({ users, filters }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);

    const createForm = useForm({
        name: '',
        email: '',
        role: 'officer',
        password: '',
    });

    const editForm = useForm({
        name: '',
        email: '',
        role: 'officer',
        password: '',
    });

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('users.store'), {
            onSuccess: () => {
                setCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const openEdit = (u: UserItem) => {
        setEditingUser(u);
        editForm.setData({
            name: u.name,
            email: u.email,
            role: u.role,
            password: '',
        });
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        editForm.put(route('users.update', editingUser.id), {
            onSuccess: () => {
                setEditingUser(null);
                editForm.reset();
            },
        });
    };

    const deleteUser = (u: UserItem) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus akun ${u.name}?`)) {
            router.delete(route('users.destroy', u.id));
        }
    };

    const filterRole = (role: string) => {
        router.get(route('users.index'), role ? { role } : {}, { preserveState: true });
    };

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const totalPages = Math.ceil(users.length / itemsPerPage);
    const paginatedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="Kelola Pengguna & Petugas">
            <Head title="Pengguna & Petugas" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                
                {/* Header Action Card */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#8FB996]/35 bg-white p-5 shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                    <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-[#415D43]/10 text-[#415D43]">
                            <UserCog size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-[#111D13]">Kelola Pengguna & Petugas</h1>
                            <p className="text-sm text-[#111D13]/70">Daftar staf, petugas penjemputan (driver), dan administrator sistem SayCle.</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setCreateOpen(true)}
                        className="min-h-11 bg-[#415D43] font-semibold text-white hover:bg-[#344B36]"
                    >
                        <UserPlus size={16} className="mr-1.5" />
                        Tambah Petugas / User
                    </Button>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => { setCurrentPage(1); filterRole(''); }}
                        className={`min-h-9 rounded-full px-4 text-sm font-semibold transition-colors ${!filters.role ? 'bg-[#415D43] text-white' : 'border border-[#8FB996]/40 bg-white text-[#111D13]/70 hover:bg-[#F2F7F3]'}`}
                    >
                        Semua ({users.length})
                    </button>
                    {ROLES.map((r) => {
                        const count = users.filter((u) => u.role === r.value).length;
                        const active = filters.role === r.value;
                        return (
                            <button
                                key={r.value}
                                onClick={() => { setCurrentPage(1); filterRole(r.value); }}
                                className={`min-h-9 rounded-full px-4 text-sm font-semibold transition-colors ${active ? 'bg-[#415D43] text-white' : 'border border-[#8FB996]/40 bg-white text-[#111D13]/70 hover:bg-[#F2F7F3]'}`}
                            >
                                {r.label} ({count})
                            </button>
                        );
                    })}
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-[#8FB996]/25 bg-[#F2F7F3] hover:bg-[#F2F7F3] [&>th]:font-semibold [&>th]:text-[#111D13]">
                                <TableHead>Nama Pengguna</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-center">Peran (Role)</TableHead>
                                <TableHead className="text-right">Tanggal Dibuat</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-12 text-center text-sm text-[#111D13]/60">
                                        Tidak ada data pengguna ditemukan.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedUsers.map((u) => {
                                    const roleObj = ROLES.find((r) => r.value === u.role);
                                    return (
                                        <TableRow key={u.id} className="hover:bg-[#F2F7F3]/50">
                                            <TableCell className="font-semibold text-[#111D13]">{u.name}</TableCell>
                                            <TableCell className="text-[#111D13]/80">{u.email}</TableCell>
                                            <TableCell className="text-center">
                                                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${roleObj?.color ?? 'bg-gray-100 text-gray-700'}`}>
                                                    {roleObj?.label ?? u.role}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-[#111D13]/70">
                                                {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEdit(u)}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#415D43] hover:bg-[#415D43]/10"
                                                    >
                                                        <Edit2 size={14} /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteUser(u)}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 size={14} /> Hapus
                                                    </button>
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
                        totalItems={users.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </div>

                {/* Modal Tambah User */}
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent className="bg-white text-[#111D13] border border-[#8FB996]/35 sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-[#111D13]">Tambah Pengguna / Petugas Baru</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submitCreate} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="create-name">Nama Lengkap</Label>
                                <Input
                                    id="create-name"
                                    required
                                    value={createForm.data.name}
                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                    placeholder="Contoh: Budi Santoso"
                                />
                                <InputError message={createForm.errors.name} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="create-email">Alamat Email</Label>
                                <Input
                                    id="create-email"
                                    type="email"
                                    required
                                    value={createForm.data.email}
                                    onChange={(e) => createForm.setData('email', e.target.value)}
                                    placeholder="petugas@saycle.id"
                                />
                                <InputError message={createForm.errors.email} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="create-role">Peran (Role)</Label>
                                <Select value={createForm.data.role} onValueChange={(v) => createForm.setData('role', v)}>
                                    <SelectTrigger id="create-role">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLES.map((r) => (
                                            <SelectItem key={r.value} value={r.value}>
                                                {r.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={createForm.errors.role} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="create-password">Kata Sandi (Password)</Label>
                                <Input
                                    id="create-password"
                                    type="password"
                                    required
                                    value={createForm.data.password}
                                    onChange={(e) => createForm.setData('password', e.target.value)}
                                    placeholder="Minimal 8 karakter"
                                />
                                <InputError message={createForm.errors.password} />
                            </div>

                            <DialogFooter className="gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={createForm.processing}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={createForm.processing} className="bg-[#415D43] text-white hover:bg-[#344B36]">
                                    Simpan
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Modal Edit User */}
                <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
                    <DialogContent className="bg-white text-[#111D13] border border-[#8FB996]/35 sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-[#111D13]">Edit Pengguna: {editingUser?.name}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submitEdit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-name">Nama Lengkap</Label>
                                <Input
                                    id="edit-name"
                                    required
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                />
                                <InputError message={editForm.errors.name} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-email">Alamat Email</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    required
                                    value={editForm.data.email}
                                    onChange={(e) => editForm.setData('email', e.target.value)}
                                />
                                <InputError message={editForm.errors.email} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-role">Peran (Role)</Label>
                                <Select value={editForm.data.role} onValueChange={(v) => editForm.setData('role', v)}>
                                    <SelectTrigger id="edit-role">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLES.map((r) => (
                                            <SelectItem key={r.value} value={r.value}>
                                                {r.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={editForm.errors.role} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-password">Kata Sandi Baru (Opsional, kosongkan jika tidak diubah)</Label>
                                <Input
                                    id="edit-password"
                                    type="password"
                                    value={editForm.data.password}
                                    onChange={(e) => editForm.setData('password', e.target.value)}
                                    placeholder="Biarkan kosong jika tidak diganti"
                                />
                                <InputError message={editForm.errors.password} />
                            </div>

                            <DialogFooter className="gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setEditingUser(null)} disabled={editForm.processing}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={editForm.processing} className="bg-[#415D43] text-white hover:bg-[#344B36]">
                                    Simpan Perubahan
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

            </div>
        </AppLayout>
    );
}
