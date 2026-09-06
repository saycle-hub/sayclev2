import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RouteMap } from '@/components/route-map';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Camera, LocateFixed, MapPin, MessageCircle, Navigation, Truck, User } from 'lucide-react';
import { useState } from 'react';

interface StopDetailProps {
    stop: {
        id: number;
        task_type: 'pickup' | 'delivery';
        stop_order: number | null;
        status: string;
        scheduled_for: string | null;
        name: string;
        phone: string;
        address: string | null;
        latitude: number;
        longitude: number;
        planned_kg: number;
        vehicle: { id: number; name: string } | null;
        wa_enroute_url: string;
        checkin_route?: string;
        complete_route?: string;
    };
    depot: {
        lat: number;
        lng: number;
    };
}

export default function OfficerStopDetail({ stop, depot }: StopDetailProps) {
    const isPickup = stop.task_type === 'pickup';

    // Form states
    const pickupForm = useForm({
        photo: null as File | null,
        rejection_photo: null as File | null,
        actual_total_kg: '0',
        supplier_rejected: false,
        checkin_lat: String(stop.latitude),
        checkin_lng: String(stop.longitude),
        layak_kg: '',
        kurang_layak_kg: '',
        tidak_layak_kg: '',
        refusal_reason: '',
    });

    const deliveryForm = useForm({
        photo: null as File | null,
        received_by: '',
    });

    const [formError, setFormError] = useState('');
    const [gpsFetched, setGpsFetched] = useState(false);

    const getGpsLocation = () => {
        if (!navigator.geolocation) {
            setFormError('Browser tidak mendukung geolokasi.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                pickupForm.setData({
                    ...pickupForm.data,
                    checkin_lat: position.coords.latitude.toFixed(7),
                    checkin_lng: position.coords.longitude.toFixed(7),
                });
                setGpsFetched(true);
                setFormError('');
            },
            () => {
                setFormError('Gagal mengambil posisi GPS. Pastikan izin lokasi aktif.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const submitPickup = (e: React.FormEvent) => {
        e.preventDefault();
        const amounts = ['layak_kg', 'kurang_layak_kg', 'tidak_layak_kg'].map((key) =>
            Number(pickupForm.data[key as 'layak_kg' | 'kurang_layak_kg' | 'tidak_layak_kg'] || 0)
        );
        if (amounts.some((val) => !Number.isFinite(val) || val < 0)) {
            return setFormError('Semua berat harus angka 0 atau lebih.');
        }
        const total = Number(amounts.reduce((sum, v) => sum + v, 0).toFixed(2));
        const supplierRejected = total === 0;

        if (supplierRejected && !pickupForm.data.refusal_reason.trim()) {
            return setFormError('Alasan penolakan wajib diisi jika total berat 0 kg.');
        }
        if (supplierRejected && !pickupForm.data.rejection_photo) {
            return setFormError('Foto kondisi penolakan wajib diunggah.');
        }
        if (!pickupForm.data.photo) {
            return setFormError('Foto bukti pickup wajib diunggah.');
        }

        pickupForm.clearErrors();
        pickupForm.transform((data) => ({
            photo: data.photo,
            rejection_photo: supplierRejected ? data.rejection_photo : null,
            actual_total_kg: String(total),
            supplier_rejected: supplierRejected ? '1' : '0',
            refusal_reason: supplierRejected ? data.refusal_reason : null,
            checkin_lat: data.checkin_lat,
            checkin_lng: data.checkin_lng,
            grades: [
                { grade: 'Layak', kg: amounts[0] },
                { grade: 'Kurang Layak', kg: amounts[1] },
                { grade: 'Tidak Layak', kg: amounts[2] },
            ].filter((r) => r.kg > 0),
        }));

        pickupForm.post(stop.checkin_route ?? route('officer.pickups.checkin', stop.id), {
            forceFormData: true,
            onError: (errs) => {
                const msg = Object.values(errs)[0];
                if (msg) setFormError(String(msg));
            },
        });
    };

    const submitDelivery = (e: React.FormEvent) => {
        e.preventDefault();
        if (!deliveryForm.data.received_by.trim()) {
            return setFormError('Nama penerima wajib diisi.');
        }
        if (!deliveryForm.data.photo) {
            return setFormError('Foto serah-terima wajib diunggah.');
        }

        deliveryForm.clearErrors();
        deliveryForm.post(stop.complete_route ?? route('officer.deliveries.complete', stop.id), {
            forceFormData: true,
            onError: (errs) => {
                const msg = Object.values(errs)[0];
                if (msg) setFormError(String(msg));
            },
        });
    };

    const destinationQuery = stop.address
        ? stop.address
        : `${stop.latitude},${stop.longitude}`;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationQuery)}`;

    const stopsForMap = [
        {
            lat: stop.latitude,
            lng: stop.longitude,
            order: stop.stop_order ?? 1,
            label: stop.name,
            color: isPickup ? '#e88c12' : '#2f6848',
        },
    ];

    const linesForMap = [
        {
            color: isPickup ? '#e88c12' : '#2f6848',
            points: [
                [depot.lat, depot.lng] as [number, number],
                [stop.latitude, stop.longitude] as [number, number],
            ],
        },
    ];

    return (
        <>
            <Head title={`Stop #${stop.stop_order ?? 1} - ${stop.name}`} />
            <div className="min-h-screen bg-[#f9fafb] pb-12">
                {/* Top Sticky App Bar */}
                <header className="sticky top-0 z-40 border-b border-[#18352a]/20 bg-[#18352a] text-white shadow-md">
                    <div className="mx-auto max-w-2xl px-4 py-3">
                        {/* Top row: Back button & Status Badge */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                            <Link
                                href={route('officer.dashboard')}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20 active:bg-white/30"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Kembali</span>
                            </Link>
                            <span className="inline-flex items-center rounded-full bg-[#2f6848] px-3 py-1 text-xs font-semibold text-emerald-100 border border-emerald-400/30 uppercase tracking-wide">
                                {stop.status.replace('_', ' ')}
                            </span>
                        </div>

                        {/* Bottom row: Stop Order & Name */}
                        <div className="mt-2.5">
                            <div className="inline-flex items-center gap-2">
                                <span className="rounded-md bg-[#e88c12] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                                    Stop #{stop.stop_order ?? 1}
                                </span>
                                <span className="text-xs font-medium uppercase tracking-wider text-emerald-200">
                                    • {isPickup ? 'Penjemputan (Pickup)' : 'Pengiriman (Delivery)'}
                                </span>
                            </div>
                            <h1 className="mt-1 text-lg font-bold text-white leading-tight">
                                {stop.name}
                            </h1>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-2xl space-y-5 p-4">
                    {/* Customer & Location Card */}
                    <Card className="overflow-hidden border-[#18352a]/10 p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <span className="inline-block rounded-md bg-[#18352a]/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-[#18352a]">
                                    {isPickup ? 'Titik Penjemputan' : 'Titik Pengiriman'}
                                </span>
                                <h2 className="mt-1 text-xl font-bold text-[#18352a]">{stop.name}</h2>
                                <p className="mt-1.5 flex items-start gap-1.5 text-sm text-[#18352a]/75">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#e88c12]" />
                                    {stop.address ?? 'Alamat tidak tersedia'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#18352a]/10 pt-3 text-xs text-[#18352a]/70 sm:grid-cols-3">
                            <div>
                                <strong className="block text-[#18352a]">Kontak / HP</strong>
                                {stop.phone}
                            </div>
                            <div>
                                <strong className="block text-[#18352a]">Rencana Berat</strong>
                                {stop.planned_kg.toLocaleString('id-ID')} kg
                            </div>
                            <div>
                                <strong className="block text-[#18352a]">Armada Vehicle</strong>
                                {stop.vehicle?.name ?? 'Armada Saycle'}
                            </div>
                        </div>

                        {/* Action Buttons: Navigasi & WA OTW */}
                        <div className="mt-5 flex items-center gap-2">
                            <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 flex-1 whitespace-nowrap items-center justify-center gap-1.5 rounded-xl bg-[#18352a] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#0f231b]"
                            >
                                <Navigation className="h-4 w-4 shrink-0 text-[#e88c12]" />
                                <span>Navigasi Maps</span>
                            </a>
                            {stop.wa_enroute_url && (
                                <a
                                    href={stop.wa_enroute_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex min-h-11 flex-1 whitespace-nowrap items-center justify-center gap-1.5 rounded-xl border-0 bg-[#25D366] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#20bd5a] active:bg-[#1da850]"
                                >
                                    <MessageCircle className="h-4 w-4 shrink-0" />
                                    <span>WA OTW</span>
                                </a>
                            )}
                        </div>
                    </Card>

                    {/* Interactive Route Map */}
                    <Card className="overflow-hidden border-[#18352a]/10 shadow-sm">
                        <div className="flex items-center justify-between border-b border-[#18352a]/10 bg-white px-4 py-3">
                            <h3 className="text-sm font-semibold text-[#18352a]">Peta Rute Navigasi</h3>
                            <span className="text-xs text-[#18352a]/60">Gudang &rarr; Stop #{stop.stop_order ?? 1}</span>
                        </div>
                        <RouteMap depot={depot} stops={stopsForMap} lines={linesForMap} className="h-64 w-full" />
                    </Card>

                    {/* Form Input Section Below Map */}
                    <Card className="border-[#18352a]/10 p-5 shadow-sm">
                        <h3 className="mb-1 text-lg font-bold text-[#18352a]">
                            {isPickup ? 'Form Check-in Pickup' : 'Form Serah-Terima Delivery'}
                        </h3>
                        <p className="mb-4 text-xs text-[#18352a]/65">
                            {isPickup
                                ? 'Ambil koordinat lokasi, foto hasil penjemputan, lalu catat rincian berat per grade.'
                                : 'Unggah foto bukti serah-terima dan isi nama penerima barang di lokasi.'}
                        </p>

                        {isPickup ? (
                            <form onSubmit={submitPickup} className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="gps-btn">Lokasi GPS Saat Ini *</Label>
                                        {gpsFetched && <span className="text-xs font-semibold text-green-700">✓ GPS Terambil</span>}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={getGpsLocation}
                                        className="mt-1 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#2f6848]/30 bg-white text-sm font-semibold text-[#18352a] hover:bg-gray-50"
                                    >
                                        <LocateFixed className="h-4 w-4 text-[#e88c12]" />
                                        <span>{gpsFetched ? 'Perbarui Lokasi GPS' : 'Ambil Lokasi Saya'}</span>
                                    </button>
                                    <p className="mt-1 text-xs text-[#18352a]/60">
                                        Koordinat: {pickupForm.data.checkin_lat}, {pickupForm.data.checkin_lng}
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="pickup-photo">Foto Bukti Pickup *</Label>
                                    <Input
                                        id="pickup-photo"
                                        required
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png"
                                        className="mt-1 min-h-11"
                                        onChange={(e) => pickupForm.setData('photo', e.target.files?.[0] ?? null)}
                                    />
                                    {pickupForm.errors.photo && <p className="mt-1 text-xs text-red-600">{pickupForm.errors.photo}</p>}
                                </div>

                                <div className="space-y-3 rounded-2xl border border-[#18352a]/10 bg-white p-4">
                                    <h4 className="text-sm font-bold text-[#18352a]">Rincian Berat Per Grade (Kg)</h4>
                                    {[
                                        ['layak_kg', 'Grade Layak', 'Untuk pakan ternak'],
                                        ['kurang_layak_kg', 'Grade Kurang Layak', 'Untuk budidaya maggot'],
                                        ['tidak_layak_kg', 'Grade Tidak Layak', 'Untuk pupuk kompos'],
                                    ].map(([key, label, desc]) => (
                                        <div key={key}>
                                            <label htmlFor={key} className="block text-xs font-semibold text-[#18352a]">
                                                {label} <span className="font-normal text-[#18352a]/60">({desc})</span>
                                            </label>
                                            <Input
                                                id={key}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={String(pickupForm.data[key as 'layak_kg' | 'kurang_layak_kg' | 'tidak_layak_kg'])}
                                                onChange={(e) => pickupForm.setData(key as 'layak_kg', e.target.value)}
                                                placeholder="0.00"
                                                className="mt-1 min-h-11"
                                            />
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between border-t border-[#18352a]/10 pt-3 text-sm font-semibold text-[#18352a]">
                                        <span>Total Hasil Pengambilan:</span>
                                        <span className="text-base font-bold text-[#e88c12]">
                                            {(
                                                ['layak_kg', 'kurang_layak_kg', 'tidak_layak_kg'] as const
                                            ).reduce((sum, k) => sum + Number(pickupForm.data[k] || 0), 0).toLocaleString('id-ID')}{' '}
                                            kg
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="refusal_reason">Alasan jika Total 0 kg (Penolakan)</Label>
                                    <textarea
                                        id="refusal_reason"
                                        value={pickupForm.data.refusal_reason}
                                        onChange={(e) => pickupForm.setData('refusal_reason', e.target.value)}
                                        className="mt-1 min-h-20 w-full rounded-xl border border-[#18352a]/15 bg-white px-3 py-2 text-sm text-[#18352a]"
                                        placeholder="Contoh: material sudah tidak tersedia"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="rejection-photo">Foto Kondisi Penolakan (jika 0 kg)</Label>
                                    <Input
                                        id="rejection-photo"
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png"
                                        className="mt-1 min-h-11"
                                        onChange={(e) => pickupForm.setData('rejection_photo', e.target.files?.[0] ?? null)}
                                    />
                                </div>

                                {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}

                                <Button
                                    type="submit"
                                    disabled={pickupForm.processing}
                                    className="min-h-12 w-full rounded-xl bg-[#2f6848] text-base font-bold text-white shadow-md hover:bg-[#235137]"
                                >
                                    <Camera className="mr-2 h-5 w-5" />
                                    {pickupForm.processing ? 'Menyimpan & Menyelesaikan...' : 'Simpan & Selesaikan Pickup'}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={submitDelivery} className="space-y-4">
                                <div>
                                    <Label htmlFor="received_by">Nama Penerima Barang *</Label>
                                    <Input
                                        id="received_by"
                                        required
                                        value={deliveryForm.data.received_by}
                                        onChange={(e) => deliveryForm.setData('received_by', e.target.value)}
                                        placeholder="Contoh: Bapak Susanto (Pengelola Mitra)"
                                        className="mt-1 min-h-11"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="delivery-photo">Foto Serah-Terima Barang *</Label>
                                    <Input
                                        id="delivery-photo"
                                        required
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png"
                                        className="mt-1 min-h-11"
                                        onChange={(e) => deliveryForm.setData('photo', e.target.files?.[0] ?? null)}
                                    />
                                </div>

                                {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}

                                <Button
                                    type="submit"
                                    disabled={deliveryForm.processing}
                                    className="min-h-12 w-full rounded-xl bg-[#2f6848] text-base font-bold text-white shadow-md hover:bg-[#235137]"
                                >
                                    <Camera className="mr-2 h-5 w-5" />
                                    {deliveryForm.processing ? 'Menyimpan & Menyelesaikan...' : 'Simpan & Konfirmasi Delivery'}
                                </Button>
                            </form>
                        )}
                    </Card>
                </main>
            </div>
        </>
    );
}
