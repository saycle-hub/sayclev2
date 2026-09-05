import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Check, LocateFixed, MapPin, Upload, X } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';

type Fields = {
    contact: string;
    estimate_kg: string;
    location_consent: boolean;
    manual_address: string;
    latitude?: number;
    longitude?: number;
    photo: File | null;
};

type GpsState = 'idle' | 'loading' | 'success' | 'failure';
const input = 'mt-2 min-h-12 w-full rounded-xl border border-[#18352a]/15 bg-[#f4f3ed] px-4 outline-none focus:border-[#e88c12] focus:ring-2 focus:ring-[#e88c12]/20';

export default function Report() {
    const form = useForm<Fields>({ contact: '', estimate_kg: '', location_consent: false, manual_address: '', photo: null });
    const summary = useRef<HTMLDivElement>(null);
    const [gpsState, setGpsState] = useState<GpsState>('idle');
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('report.store'), { forceFormData: true, onError: () => summary.current?.focus() });
    };

    const locate = () => {
        if (!form.data.location_consent || !navigator.geolocation) {
            setGpsState('failure');
            return;
        }
        setGpsState('loading');
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                form.setData((data) => ({ ...data, latitude: coords.latitude, longitude: coords.longitude }));
                setGpsState('success');
            },
            () => setGpsState('failure'),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
    };

    const handlePhoto = (file: File | null) => {
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        form.setData('photo', file);
        setPhotoPreview(file ? URL.createObjectURL(file) : null);
    };

    const errors = Object.values(form.errors).filter(Boolean);
    const hasCoordinates = form.data.latitude !== undefined && form.data.longitude !== undefined;
    const gpsMessage = gpsState === 'loading' ? 'Mencari lokasi…' : gpsState === 'success' ? 'Lokasi berhasil didapatkan.' : gpsState === 'failure' ? 'Lokasi tidak tersedia. Masukkan alamat manual di bawah.' : 'Lokasi hanya dipakai untuk membantu officer menemukan sumber.';

    return <><Head title="Lapor sisa sayur — SayCle" /><main className="min-h-screen bg-[#f4f3ed] px-5 py-10 text-[#18352a] sm:py-16"><div className="mx-auto max-w-2xl"><Link href="/" className="mb-10 inline-flex min-h-11 items-center text-sm font-semibold"><ArrowLeft size={17} className="mr-2" />Kembali</Link><p className="text-xs font-bold uppercase tracking-[.2em] text-[#e88c12]">SayCle · Laporan sumber</p><h1 className="mt-3 text-5xl font-semibold tracking-[-.05em]">Beri sisa sayur putaran baru.</h1><p className="mt-5 max-w-lg leading-7 text-[#18352a]/65">Kirim detail material. Officer akan meninjau sebelum pickup dijadwalkan.</p><form onSubmit={submit} className="mt-10 space-y-5 rounded-[2rem] bg-white p-6 shadow-xl shadow-[#18352a]/10 sm:p-10">{errors.length > 0 && <div ref={summary} tabIndex={-1} role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700"><strong>Periksa kembali formulir.</strong><ul className="mt-2 list-disc pl-5">{errors.map((error, i) => <li key={i}>{error}</li>)}</ul></div>}
                <Field label="Foto material" error={form.errors.photo}><div className="relative">{photoPreview ? <div className="overflow-hidden rounded-xl border border-[#18352a]/15"><img src={photoPreview} alt="Pratinjau foto material" className="h-52 w-full object-cover" /><button type="button" onClick={() => handlePhoto(null)} className="absolute right-3 top-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold shadow" aria-label="Hapus foto"><X size={16} />Hapus</button></div> : <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#18352a]/25 bg-[#f4f3ed] text-center text-[#18352a]/60"><Upload size={20} className="mb-2" />Ambil atau pilih foto<input required={!form.data.photo} type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" onChange={e => handlePhoto(e.target.files?.[0] ?? null)} /></label>}</div>{photoPreview && <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[#18352a]/20 px-4 text-sm font-semibold">Ganti foto<Upload size={16} /><input type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" onChange={e => handlePhoto(e.target.files?.[0] ?? null)} /></label>}<p className="mt-2 text-sm text-[#18352a]/60">JPG atau PNG, maksimal 10 MB.</p></Field>
                <Field label="Perkiraan berat (kg)" error={form.errors.estimate_kg}><input required type="text" inputMode="decimal" placeholder="contoh: 25 atau 5.5" className={input} value={form.data.estimate_kg} onChange={e => form.setData('estimate_kg', e.target.value)} /></Field>
                <Field label="Kontak (nama dan nomor yang bisa dihubungi)" error={form.errors.contact}><input required type="text" className={input} value={form.data.contact} onChange={e => form.setData('contact', e.target.value)} /></Field>
                <fieldset className="rounded-xl border border-[#18352a]/15 p-4"><legend className="px-1 text-sm font-bold">Lokasi sumber</legend><label className="mt-2 flex cursor-pointer items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#18352a]" checked={form.data.location_consent} onChange={e => { form.setData('location_consent', e.target.checked); if (e.target.checked) setGpsState('idle'); }} /><span>Saya mengizinkan SayCle menerima lokasi perangkat untuk membantu officer menemukan lokasi sumber.</span></label><button type="button" onClick={locate} disabled={!form.data.location_consent || gpsState === 'loading'} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-[#18352a]/20 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"><LocateFixed size={17} className="mr-2" />{gpsState === 'loading' ? 'Mencari lokasi…' : 'Gunakan lokasi saya'}</button><p className={`mt-3 flex items-center gap-2 text-sm ${gpsState === 'failure' ? 'text-red-700' : gpsState === 'success' ? 'text-[#2f6848]' : 'text-[#18352a]/60'}`}>{gpsState === 'success' ? <Check size={16} /> : gpsState === 'failure' ? <X size={16} /> : <MapPin size={16} />}{gpsMessage}</p>{hasCoordinates && <p className="mt-2 text-xs text-[#18352a]/55">Koordinat siap dikirim. Alamat manual tetap boleh diisi.</p>}<label className="mt-4 block text-sm font-semibold">Alamat manual {(!hasCoordinates || gpsState === 'failure') && <span className="font-normal text-[#e88c12]">(wajib jika GPS tidak dipakai)</span>}<textarea required={!hasCoordinates} value={form.data.manual_address} onChange={e => form.setData('manual_address', e.target.value)} rows={3} placeholder="Nama pasar, jalan, kecamatan, kota" className={`${input} py-3`} /></label>{form.errors.manual_address && <p className="mt-1 text-sm text-red-600">{form.errors.manual_address}</p>}</fieldset>
                <button disabled={form.processing} className="flex min-h-12 w-full items-center justify-center rounded-full bg-[#e88c12] font-bold text-[#18352a] disabled:opacity-60">{form.processing ? 'Mengirim…' : 'Kirim laporan'}</button>
            </form></div></main></>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold">{label}<span className="mt-2 block">{children}</span>{error && <span className="mt-1 block font-normal text-red-600" role="alert">{error}</span>}</label>; }
