import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { MapPin } from 'lucide-react';
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

function RouteSection({ title, items, empty }: { title: string; items: RouteItem[]; empty: string }) {
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
    // Canonical pickup/delivery route props are read-only; legacy check-in remains isolated to explicit tasks.
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
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

                    <RouteSection title="Pickup" items={pickups} empty="Tidak ada pickup terjadwal." />
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
