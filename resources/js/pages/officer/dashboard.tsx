import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Camera, LocateFixed, MapPin } from 'lucide-react';
import { FlashBanner } from '@/components/flash-banner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Task {
    id: number;
    stop_order: number;
    status: string;
    contact_name: string;
    phone: string;
    address: string | null;
    latitude: number;
    longitude: number;
    estimated_kg: number;
    actual_kg: number | null;
    grade: string | null;
    vehicle_name: string | null;
    checked_in_at: string | null;
}

interface Props {
    /** Legacy pickup tasks only. Canonical route tasks are supplied separately below. */
    legacyTasks?: Task[];
    pickups: RouteItem[];
    deliveries: RouteItem[];
}

interface RouteItem {
    id: number;
    task_type: 'pickup' | 'delivery';
    stop_order: number | null;
    status: string;
    scheduled_for: string | null;
    service_date: string | null;
    supplier: { name: string; phone: string; address: string | null } | null;
    destination: { name: string; address: string | null } | null;
    planned_kg: number;
    vehicle: { name: string } | null;
    latitude: number | null;
    longitude: number | null;
}

function RouteSection({ title, items, empty, onCheckin }: { title: string; items: RouteItem[]; empty: string; onCheckin?: (item: RouteItem) => void }) {
    return (
        <section className="mb-7" aria-labelledby={`${title.toLowerCase()}-heading`}>
            <div className="mb-3 flex items-baseline justify-between">
                <h2 id={`${title.toLowerCase()}-heading`} className="text-lg font-semibold text-[#18352a]">{title}</h2>
                <span className="text-xs font-medium uppercase tracking-widest text-[#18352a]/50">{items.length} {items.length === 1 ? 'stop' : 'stops'}</span>
            </div>
            {items.length === 0 ? (
                <Card className="p-5 text-sm text-[#18352a]/60">{empty}</Card>
            ) : (
                <div className="space-y-3">
                    {items.map((item) => {
                        const place = item.task_type === 'pickup' ? item.supplier : item.destination;
                        const date = item.service_date ?? item.scheduled_for;
                        return (
                            <Card key={`${item.task_type}-${item.id}`} className="overflow-hidden border-[#18352a]/10 p-4 shadow-sm">
                                <div className="flex gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2f6848] text-sm font-semibold text-[#f4f3ed]">
                                        {item.stop_order ?? '—'}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wider text-[#e88c12]">{item.task_type}</p>
                                                <h3 className="font-medium text-[#18352a]">{place?.name ?? 'Lokasi tidak tersedia'}</h3>
                                            </div>
                                            <span className="rounded-full bg-[#2f6848]/10 px-2.5 py-1 text-xs font-medium text-[#2f6848]">{item.status.replace('_', ' ')}</span>
                                        </div>
                                        <p className="mt-2 flex items-start gap-1.5 text-sm text-[#18352a]/70">
                                            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />{place?.address ?? 'Alamat tidak tersedia'}
                                        </p>
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#18352a]/65 sm:grid-cols-3">
                                            <span><strong className="block text-[#18352a]">Tanggal</strong>{date ? new Date(date).toLocaleDateString('id-ID') : '—'}</span>
                                            <span><strong className="block text-[#18352a]">Kendaraan</strong>{item.vehicle?.name ?? 'Belum ada'}</span>
                                            <span><strong className="block text-[#18352a]">Rencana</strong>{item.planned_kg.toLocaleString('id-ID')} kg</span>
                                        </div>
                                        {onCheckin && ['assigned', 'in_progress'].includes(item.status) && (
                                            <Button onClick={() => onCheckin(item)} className="mt-4 min-h-11 bg-[#e88c12] text-[#f4f3ed] hover:bg-[#d17a0a]">
                                                <Camera className="h-4 w-4" /> Check-in pickup
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default function OfficerDashboard({ legacyTasks = [], pickups, deliveries }: Props) {
    // Canonical pickup check-in is distinct from legacy pickup tasks.
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedPickup, setSelectedPickup] = useState<RouteItem | null>(null);
    const pickupForm = useForm({ photo: null as File | null, rejection_photo: null as File | null, actual_total_kg: '0', supplier_rejected: false, checkin_lat: '', checkin_lng: '', layak_kg: '', kurang_layak_kg: '', tidak_layak_kg: '', refusal_reason: '' });
    const [pickupError, setPickupError] = useState('');
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [gpsLoading, setGpsLoading] = useState(false);

    const checkinForm = useForm({
        actual_kg: '',
        grade: '',
        photo: null as File | null,
        checkin_lat: '',
        checkin_lng: '',
    });

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setGpsError('GPS tidak didukung di browser Anda.');
            return;
        }

        setGpsLoading(true);
        setGpsError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                checkinForm.setData({
                    ...checkinForm.data,
                    checkin_lat: position.coords.latitude.toFixed(7),
                    checkin_lng: position.coords.longitude.toFixed(7),
                });
                setGpsLoading(false);
            },
            (error) => {
                setGpsError(
                    error.code === 1
                        ? 'Izin lokasi ditolak. Aktifkan GPS dan izinkan akses lokasi.'
                        : 'Gagal mendapatkan lokasi. Pastikan GPS aktif.'
                );
                setGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            checkinForm.setData('photo', file);
        }
    };

    const handleCheckin = () => {
        if (!selectedTask) return;

        checkinForm.post(route('officer.tasks.checkin', selectedTask.id), {
            onSuccess: () => {
                setSelectedTask(null);
                checkinForm.reset();
            },
        });
    };

    const submitPickupCheckin = () => {
        if (!selectedPickup) return;
        const amounts = ['layak_kg', 'kurang_layak_kg', 'tidak_layak_kg'].map((key) => Number(pickupForm.data[key as 'layak_kg' | 'kurang_layak_kg' | 'tidak_layak_kg'] || 0));
        if (amounts.some((value) => !Number.isFinite(value) || value < 0)) return setPickupError('Semua berat harus angka nol atau lebih.');
        const total = Number(amounts.reduce((sum, value) => sum + value, 0).toFixed(2));
        const supplierRejected = total === 0;
        if (supplierRejected && !pickupForm.data.refusal_reason.trim()) return setPickupError('Alasan wajib diisi jika total pengambilan 0 kg.');
        if (supplierRejected && !pickupForm.data.rejection_photo) return setPickupError('Foto kondisi penolakan wajib diunggah.');
        if (!pickupForm.data.photo) return setPickupError('Foto pickup wajib diunggah.');
        if (!pickupForm.data.checkin_lat || !pickupForm.data.checkin_lng) return setPickupError('Izinkan dan ambil lokasi sebelum check-in.');

        const grades = [
            { grade: 'Layak', kg: amounts[0] },
            { grade: 'Kurang Layak', kg: amounts[1] },
            { grade: 'Tidak Layak', kg: amounts[2] },
        ].filter((row) => row.kg > 0);

        pickupForm.clearErrors();
        pickupForm.transform((data) => ({
            photo: data.photo,
            rejection_photo: supplierRejected ? data.rejection_photo : null,
            actual_total_kg: String(total),
            supplier_rejected: supplierRejected ? '1' : '0',
            refusal_reason: supplierRejected ? data.refusal_reason : null,
            checkin_lat: data.checkin_lat,
            checkin_lng: data.checkin_lng,
            grades,
        }));
        pickupForm.post(route('officer.pickups.checkin', selectedPickup.id), {
            forceFormData: true,
            onSuccess: () => { setSelectedPickup(null); pickupForm.reset(); pickupForm.transform((data) => data); setPickupError(''); },
        });
    };

    const pending = legacyTasks.filter((t) => t.status === 'assigned' || t.status === 'in_progress');
    const done = legacyTasks.filter((t) => t.status === 'done');

    return (
        <>
            <Head title="Dashboard Officer" />
            <div className="min-h-screen bg-[#f4f3ed] p-4">
                <FlashBanner />

                <div className="mx-auto max-w-2xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Tugas Hari Ini</h1>
                        <p className="mt-1 text-sm text-[#18352a]/70">
                            {pickups.length + deliveries.length} pemberhentian terjadwal
                        </p>
                    </div>

                    {pickups.length === 0 && deliveries.length === 0 && pending.length === 0 && done.length === 0 && (
                        <Card className="p-8 text-center">
                            <p className="text-sm text-[#18352a]/70">Tidak ada tugas hari ini.</p>
                        </Card>
                    )}

                    <RouteSection title="Pickup" items={pickups} empty="Tidak ada pickup terjadwal." onCheckin={(item) => { setSelectedPickup(item); setPickupError(''); }} />
                    <RouteSection title="Delivery" items={deliveries} empty="Tidak ada delivery terjadwal." />

                    {/* Legacy pickup check-in controls. Canonical route cards stay read-only. */}
                    {pending.length > 0 && (
                        <div className="space-y-3">
                            {pending.map((task) => (
                                <Card key={task.id} className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2f6848] text-xs font-semibold text-[#f4f3ed]">
                                                    {task.stop_order}
                                                </span>
                                                <h3 className="font-medium text-[#18352a]">{task.contact_name}</h3>
                                            </div>
                                            <p className="mt-1 text-sm text-[#18352a]/70">{task.phone}</p>
                                            {task.address && <p className="mt-0.5 text-xs text-[#18352a]/70">{task.address}</p>}
                                            <p className="mt-2 text-sm text-[#18352a]/70">
                                                Estimasi: {task.estimated_kg.toLocaleString('id-ID')} kg
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => setSelectedTask(task)}
                                            className="min-h-11 bg-[#e88c12] text-[#f4f3ed] hover:bg-[#d17a0a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e88c12]"
                                        >
                                            Check-in
                                        </Button>
                                    </div>
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#2f6848] underline-offset-4 hover:underline"
                                    >
                                        <MapPin className="h-4 w-4" />
                                        Navigasi ke lokasi
                                    </a>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Done tasks */}
                    {done.length > 0 && (
                        <div className="mt-6">
                            <h2 className="mb-3 text-lg font-semibold text-[#18352a]">Selesai</h2>
                            <div className="space-y-2">
                                {done.map((task) => (
                                    <Card key={task.id} className="p-3 opacity-60">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2f6848]/20 text-xs font-semibold text-[#2f6848]">
                                                {task.stop_order}
                                            </span>
                                            <span className="text-sm font-medium text-[#18352a]">{task.contact_name}</span>
                                            <span className="ml-auto text-xs text-[#18352a]/70">
                                                {task.actual_kg?.toLocaleString('id-ID')} kg · {task.grade}
                                            </span>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {selectedPickup && (
                    <div className="fixed inset-0 z-50 flex items-end bg-[#18352a]/50 sm:items-center sm:justify-center">
                        <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-6 sm:rounded-2xl">
                            <h2 className="mb-2 text-lg font-semibold text-[#18352a]">Check-in pickup: {selectedPickup.supplier?.name ?? 'Lokasi pickup'}</h2>
                            <p className="mb-4 text-sm text-[#18352a]/70">Izinkan lokasi, unggah foto, lalu masukkan berat per grade. Total grade harus sama dengan hasil pengambilan.</p>
                            <div className="space-y-4">
                                <button type="button" onClick={() => navigator.geolocation?.getCurrentPosition((p) => pickupForm.setData({ ...pickupForm.data, checkin_lat: p.coords.latitude.toFixed(7), checkin_lng: p.coords.longitude.toFixed(7) }), () => setPickupError('Lokasi gagal diambil. Coba lagi.'), { enableHighAccuracy: true, timeout: 10000 })} className="flex min-h-11 items-center gap-2 rounded-full border border-[#2f6848]/25 px-4 text-sm font-semibold"><LocateFixed size={16} />Ambil lokasi</button>
                                <p className="text-xs text-[#18352a]/60">Lokasi membantu officer membuktikan titik penjemputan tanpa mengubah alamat.</p>
                                <div><Label htmlFor="pickup-photo">Foto pickup *</Label><Input id="pickup-photo" required type="file" accept="image/jpeg,image/png" className="mt-1 min-h-11" onChange={(e) => pickupForm.setData('photo', e.target.files?.[0] ?? null)} />{pickupForm.errors.photo && <p className="mt-1 text-sm text-red-600">{pickupForm.errors.photo}</p>}</div>
                                <div className="grid gap-3 rounded-xl bg-[#f4f3ed] p-3">
                                    {[
                                        ['layak_kg', 'Layak', 'Untuk pakan ternak'],
                                        ['kurang_layak_kg', 'Kurang Layak', 'Untuk maggot'],
                                        ['tidak_layak_kg', 'Tidak Layak', 'Untuk kompos'],
                                    ].map(([key, label, guidance]) => <label key={key} className="text-sm font-semibold">{label}<span className="mb-1 block text-xs font-normal text-[#18352a]/60">{guidance}</span><Input required type="number" min="0" step="0.01" value={String(pickupForm.data[key as 'layak_kg' | 'kurang_layak_kg' | 'tidak_layak_kg'])} onChange={(e) => pickupForm.setData(key as 'layak_kg', e.target.value)} placeholder="0.00" />{pickupForm.errors[key as 'layak_kg'] && <p className="mt-1 text-sm text-red-600">{pickupForm.errors[key as 'layak_kg']}</p>}</label>)}
                                    <p className="text-sm">Total: <strong>{(['layak_kg','kurang_layak_kg','tidak_layak_kg'] as const).reduce((sum, key) => sum + Number(pickupForm.data[key] || 0), 0).toLocaleString('id-ID')} kg</strong></p>
                                </div>
                                <div><Label htmlFor="refusal_reason">Alasan jika total 0 kg</Label><textarea id="refusal_reason" value={pickupForm.data.refusal_reason} onChange={(e) => pickupForm.setData('refusal_reason', e.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-[#18352a]/15 bg-white px-3 py-2" placeholder="Contoh: material sudah diambil pihak lain" />{pickupForm.errors.refusal_reason && <p className="mt-1 text-sm text-red-600">{pickupForm.errors.refusal_reason}</p>}</div>
                                <div><Label htmlFor="rejection-photo">Foto kondisi jika total 0 kg</Label><Input id="rejection-photo" type="file" accept="image/jpeg,image/jpg,image/png" className="mt-1 min-h-11" onChange={(e) => pickupForm.setData('rejection_photo', e.target.files?.[0] ?? null)} />{pickupForm.errors.rejection_photo && <p className="mt-1 text-sm text-red-600">{pickupForm.errors.rejection_photo}</p>}</div>
                                {pickupError && <p role="alert" className="text-sm text-red-600">{pickupError}</p>}
                                <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setSelectedPickup(null)} disabled={pickupForm.processing}>Batal</Button><Button type="button" onClick={submitPickupCheckin} disabled={pickupForm.processing} className="bg-[#2f6848] text-white">{pickupForm.processing ? 'Menyimpan…' : 'Simpan check-in'}</Button></div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Check-in modal */}
                {selectedTask && (
                    <div className="fixed inset-0 z-50 flex items-end bg-[#18352a]/50 sm:items-center sm:justify-center">
                        <Card className="w-full max-w-lg rounded-t-2xl p-6 sm:rounded-2xl">
                            <h2 className="mb-4 text-lg font-semibold text-[#18352a]">
                                Check-in: {selectedTask.contact_name}
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="actual_kg">Berat Aktual (kg) *</Label>
                                    <Input
                                        id="actual_kg"
                                        type="number"
                                        step="0.01"
                                        value={checkinForm.data.actual_kg}
                                        onChange={(e) => checkinForm.setData('actual_kg', e.target.value)}
                                        className="min-h-11"
                                    />
                                    {checkinForm.errors.actual_kg && (
                                        <p className="mt-1 text-sm text-red-600">{checkinForm.errors.actual_kg}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="grade">Grade *</Label>
                                    <Select value={checkinForm.data.grade} onValueChange={(v) => checkinForm.setData('grade', v)}>
                                        <SelectTrigger id="grade" className="min-h-11">
                                            <SelectValue placeholder="Pilih grade…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="layak">Layak (Pakan Ternak)</SelectItem>
                                            <SelectItem value="kurang_layak">Kurang Layak (Maggot)</SelectItem>
                                            <SelectItem value="tidak_layak">Tidak Layak (Kompos)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {checkinForm.errors.grade && (
                                        <p className="mt-1 text-sm text-red-600">{checkinForm.errors.grade}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="photo">Foto *</Label>
                                    <Input
                                        id="photo"
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png"
                                        onChange={handlePhotoChange}
                                        className="min-h-11"
                                    />
                                    {checkinForm.errors.photo && (
                                        <p className="mt-1 text-sm text-red-600">{checkinForm.errors.photo}</p>
                                    )}
                                </div>

                                <div>
                                    <Label>Lokasi GPS *</Label>
                                    <Button
                                        type="button"
                                        onClick={handleGetLocation}
                                        disabled={gpsLoading}
                                        className="mt-2 min-h-11 w-full bg-[#2f6848] text-[#f4f3ed] hover:bg-[#18352a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e88c12]"
                                    >
                                        {gpsLoading ? 'Mendapatkan lokasi…' : 'Ambil Lokasi Saya'}
                                    </Button>
                                    {checkinForm.data.checkin_lat && (
                                        <p className="mt-1 text-xs text-[#18352a]/70">
                                            Lat: {checkinForm.data.checkin_lat}, Lng: {checkinForm.data.checkin_lng}
                                        </p>
                                    )}
                                    {gpsError && <p className="mt-1 text-sm text-red-600">{gpsError}</p>}
                                    {checkinForm.errors.checkin_lat && (
                                        <p className="mt-1 text-sm text-red-600">{checkinForm.errors.checkin_lat}</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <Button
                                    onClick={() => {
                                        setSelectedTask(null);
                                        checkinForm.reset();
                                        setGpsError(null);
                                    }}
                                    variant="outline"
                                    className="min-h-11 flex-1"
                                >
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleCheckin}
                                    disabled={
                                        checkinForm.processing ||
                                        !checkinForm.data.actual_kg ||
                                        !checkinForm.data.grade ||
                                        !checkinForm.data.photo ||
                                        !checkinForm.data.checkin_lat
                                    }
                                    className="min-h-11 flex-1 bg-[#e88c12] text-[#f4f3ed] hover:bg-[#d17a0a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e88c12]"
                                >
                                    {checkinForm.processing ? 'Menyimpan…' : 'Konfirmasi Check-in'}
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </>
    );
}
