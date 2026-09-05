import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { LocateFixed, MapPin, Camera } from 'lucide-react';
import { FlashBanner } from '@/components/flash-banner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Props {
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

function RouteSection({ title, items, empty, onCheckin, checkinLabel = 'Check-in pickup' }: { title: string; items: RouteItem[]; empty: string; onCheckin?: (item: RouteItem) => void; checkinLabel?: string }) {
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
                                        {onCheckin && ['assigned', 'in_progress', 'planned'].includes(item.status) && (
                                            <Button onClick={() => onCheckin(item)} className="mt-4 min-h-11 bg-[#e88c12] text-[#f4f3ed] hover:bg-[#d17a0a]">
                                                <Camera className="h-4 w-4" /> {checkinLabel}
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

export default function OfficerDashboard({ pickups, deliveries }: Props) {
    const [selectedPickup, setSelectedPickup] = useState<RouteItem | null>(null);
    const [selectedDelivery, setSelectedDelivery] = useState<RouteItem | null>(null);
    const deliveryForm = useForm({ photo: null as File | null, received_by: '' });
    const [deliveryError, setDeliveryError] = useState('');
    const pickupForm = useForm({ photo: null as File | null, rejection_photo: null as File | null, actual_total_kg: '0', supplier_rejected: false, checkin_lat: '', checkin_lng: '', layak_kg: '', kurang_layak_kg: '', tidak_layak_kg: '', refusal_reason: '' });
    const [pickupError, setPickupError] = useState('');
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [gpsLoading, setGpsLoading] = useState(false);

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

    const submitDeliveryCompletion = () => {
        if (!selectedDelivery) return;
        if (!deliveryForm.data.photo) return setDeliveryError('Foto serah-terima wajib diunggah.');
        if (!deliveryForm.data.received_by.trim()) return setDeliveryError('Nama penerima wajib diisi.');
        deliveryForm.clearErrors();
        deliveryForm.post(route('officer.deliveries.complete', selectedDelivery.id), {
            forceFormData: true,
            onSuccess: () => { setSelectedDelivery(null); deliveryForm.reset(); setDeliveryError(''); },
        });
    };

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

                    {pickups.length === 0 && deliveries.length === 0 && (
                        <Card className="p-8 text-center">
                            <p className="text-sm text-[#18352a]/70">Tidak ada tugas hari ini.</p>
                        </Card>
                    )}

                    <RouteSection title="Pickup" items={pickups} empty="Tidak ada pickup terjadwal." onCheckin={(item) => { setSelectedPickup(item); setPickupError(''); }} />
                    <RouteSection title="Delivery" items={deliveries} empty="Tidak ada delivery terjadwal." onCheckin={(item) => { setSelectedDelivery(item); setDeliveryError(''); }} checkinLabel="Serah-terima" />
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

                {/* Delivery handover modal */}
                {selectedDelivery && (
                    <div className="fixed inset-0 z-50 flex items-end bg-[#18352a]/50 sm:items-center sm:justify-center">
                        <Card className="w-full max-w-lg rounded-t-2xl p-6 sm:rounded-2xl">
                            <h2 className="mb-4 text-lg font-semibold text-[#18352a]">
                                Serah-terima: {selectedDelivery.destination?.name ?? 'Mitra'}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="received_by">Nama penerima *</Label>
                                    <Input
                                        id="received_by"
                                        value={deliveryForm.data.received_by}
                                        onChange={(e) => deliveryForm.setData('received_by', e.target.value)}
                                        className="min-h-11"
                                        placeholder="Nama orang yang menerima barang"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="delivery-photo">Foto serah-terima *</Label>
                                    <Input
                                        id="delivery-photo"
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png"
                                        onChange={(e) => deliveryForm.setData('photo', e.target.files?.[0] ?? null)}
                                        className="min-h-11"
                                    />
                                </div>
                                {deliveryError && <p role="alert" className="text-sm text-red-600">{deliveryError}</p>}
                                {deliveryForm.errors.photo && <p className="text-sm text-red-600">{deliveryForm.errors.photo}</p>}
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="ghost" onClick={() => { setSelectedDelivery(null); setDeliveryError(''); }} disabled={deliveryForm.processing}>Batal</Button>
                                    <Button type="button" onClick={submitDeliveryCompletion} disabled={deliveryForm.processing} className="bg-[#2f6848] text-white">{deliveryForm.processing ? 'Menyimpan…' : 'Konfirmasi serah-terima'}</Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </>
    );
}
