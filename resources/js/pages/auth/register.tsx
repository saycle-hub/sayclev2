import { Head, Link, useForm } from '@inertiajs/react';
import { LoaderCircle, LocateFixed } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import { CapacityInput } from '@/components/capacity-input';
import { GradeSelect } from '@/components/grade-select';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface RegisterForm {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    address: string;
    min_capacity_kg: string;
    ideal_capacity_kg: string;
    max_capacity_kg: string;
    frequency: string;
    grade_preference: string;
    receiving_days: string[];
    monthly_receiving_day: string;
    latitude: string;
    longitude: string;
    overcapacity_terms_accepted: boolean;
    [key: string]: string | string[] | boolean;
}

type CapacityKey = 'min_capacity_kg' | 'ideal_capacity_kg' | 'max_capacity_kg';
type CapacityErrors = Partial<Record<CapacityKey, string>>;

function validateCapacity(values: Pick<RegisterForm, CapacityKey>) {
    const errors: CapacityErrors = {};
    const labels: Record<CapacityKey, string> = {
        min_capacity_kg: 'Minimum',
        ideal_capacity_kg: 'Ideal',
        max_capacity_kg: 'Maksimum',
    };
    const numbers = {} as Record<CapacityKey, number>;

    (Object.keys(labels) as CapacityKey[]).forEach((key) => {
        const value = values[key].trim();
        if (!value) errors[key] = `${labels[key]} wajib diisi.`;
        else if (!Number.isFinite(Number(value))) errors[key] = `${labels[key]} harus berupa angka.`;
        else if (Number(value) < 0) errors[key] = `${labels[key]} tidak boleh kurang dari 0.`;
        else numbers[key] = Number(value);
    });

    if (!errors.min_capacity_kg && !errors.ideal_capacity_kg && numbers.min_capacity_kg > numbers.ideal_capacity_kg) {
        errors.min_capacity_kg = 'Minimum tidak boleh lebih besar dari ideal.';
        errors.ideal_capacity_kg = 'Ideal tidak boleh lebih kecil dari minimum.';
    }
    if (!errors.ideal_capacity_kg && !errors.max_capacity_kg && numbers.ideal_capacity_kg > numbers.max_capacity_kg) {
        errors.ideal_capacity_kg = 'Ideal tidak boleh lebih besar dari maksimum.';
        errors.max_capacity_kg = 'Maksimum tidak boleh lebih kecil dari ideal.';
    }

    return errors;
}

function FieldShell({ children, label }: { children: React.ReactNode; label: string }) {
    return (
        <div className="group relative rounded-xl border border-[#c2c8be] bg-white p-4 shadow-sm transition-shadow focus-within:shadow-md">
            <Label className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-[#424841]">{label}</Label>
            {children}
        </div>
    );
}

export default function Register() {
    const [step, setStep] = useState<1 | 2>(1);
    const [capacityError, setCapacityError] = useState('');
    const [capacityFieldErrors, setCapacityFieldErrors] = useState<CapacityErrors>({});
    const [locationError, setLocationError] = useState('');
    const [locationState, setLocationState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const { data, setData, post, processing, errors, reset } = useForm<RegisterForm>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        address: '',
        min_capacity_kg: '',
        ideal_capacity_kg: '',
        max_capacity_kg: '',
        frequency: '',
        grade_preference: '',
        receiving_days: [],
        monthly_receiving_day: '',
        latitude: '',
        longitude: '',
        overcapacity_terms_accepted: false,
    });

    const captureLocation = () => {
        if (!navigator.geolocation) { setLocationState('error'); setLocationError('Browser tidak mendukung lokasi. Isi koordinat secara manual.'); return; }
        setLocationState('loading'); setLocationError('');
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => { setData((current) => ({ ...current, latitude: coords.latitude.toFixed(7), longitude: coords.longitude.toFixed(7) })); setLocationState('success'); },
            () => { setLocationState('error'); setLocationError('Lokasi tidak dapat diambil. Izinkan akses lokasi atau isi koordinat manual.'); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const fieldErrors = validateCapacity(data);
        const firstInvalid = (Object.keys(fieldErrors) as CapacityKey[])[0];
        if (firstInvalid) {
            setCapacityFieldErrors(fieldErrors);
            setCapacityError('Periksa kembali kapasitas penerimaan.');
            requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
            return;
        }
        setCapacityError('');
        setCapacityFieldErrors({});
        const latitude = Number(data.latitude), longitude = Number(data.longitude);
        if (!data.latitude.trim() || !data.longitude.trim() || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            setLocationError('Latitude harus -90 sampai 90 dan longitude harus -180 sampai 180.');
            return;
        }
        setLocationError('');
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Head title="Partner Registration - Step 1: Identity Information">
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
            </Head>

            <main className="flex min-h-screen flex-col bg-[#f9f9f8] font-[Inter] text-[#191c1c] antialiased md:flex-row">
                <aside className="relative hidden w-1/3 min-w-[320px] max-w-[480px] overflow-hidden bg-[#1d3a20] text-white md:flex md:flex-col md:justify-between">
                    <div className="absolute inset-0 z-0 bg-[#1d3a20]/80" />
                    <div className="relative z-10 flex h-full flex-col p-12">
                        <div>
                            <Link href={route('home')} className="mb-12 block text-[32px] font-semibold leading-[1.2] tracking-[-0.01em] text-white">
                                SayCle
                            </Link>
                            <h2 className="mb-6 text-[24px] font-semibold leading-[1.3] text-[#adcfab]">Informasi Identitas</h2>
                            <p className="text-[16px] leading-[1.5] text-[#e7e8e7]/90">
                                Lengkapi profil organisasi Anda untuk memulai kolaborasi dalam ekosistem pangan sirkular. Data ini membantu kami memverifikasi dan menghubungkan Anda dengan mitra yang tepat.
                            </p>
                        </div>
                        <div className="mt-auto flex items-center gap-2 text-[12px] font-semibold text-[#adcfab]">
                            <span className="material-symbols-outlined text-xl [font-variation-settings:'FILL'_1]">security</span>
                            <span>Secure Registration Process</span>
                        </div>
                    </div>
                </aside>

                <section className="flex flex-1 flex-col overflow-y-auto p-4 md:p-6 lg:overflow-hidden lg:px-12 lg:py-6">
                    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
                        <Link href={route('home')} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#07240c] md:hidden">
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Back
                        </Link>

                        <div className="mb-6">
                            <div className="relative h-16">
                                <div className="absolute left-4 right-4 top-4 h-1 rounded-full bg-[#e1e3e2]" />
                                <div className={`absolute left-4 top-4 h-1 rounded-full bg-[#1d3a20] transition-all duration-500 ${step === 1 ? 'w-0' : 'right-4'}`} />
                                <div className="relative z-10 flex h-full items-start justify-between">
                                    {[
                                        { step: '1', label: 'Profile', active: step >= 1 },
                                        { step: '2', label: 'Operations', active: step >= 2 },
                                    ].map(({ step: itemStep, label, active }) => (
                                        <button key={itemStep} type="button" onClick={() => itemStep === '1' && setStep(1)} className="flex w-24 flex-col items-center gap-2 text-center">
                                            <span
                                                className={`grid h-8 w-8 place-items-center rounded-full text-[12px] font-semibold ${
                                                    active ? 'bg-[#1d3a20] text-white ring-4 ring-[#1d3a20]/20 shadow-md' : 'bg-[#e1e3e2] text-[#424841]'
                                                }`}
                                            >
                                                {itemStep}
                                            </span>
                                            <span className={`text-[12px] font-semibold ${active ? 'font-bold text-[#07240c]' : 'text-[#424841]'}`}>{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1">
                            <h1 className="mb-2 text-[24px] font-semibold leading-[1.3] text-[#191c1c]">{step === 1 ? 'Informasi Identitas' : 'Informasi Operasional'}</h1>
                            <p className="mb-5 text-[15px] leading-[1.5] text-[#424841]">
                                {step === 1 ? 'Silakan lengkapi detail identitas mitra untuk keperluan verifikasi dan administrasi sistem.' : 'Isi kapasitas penerimaan untuk persiapan langkah berikutnya.'}
                            </p>

                            <form noValidate className="flex flex-col gap-3" onSubmit={submit}>
                                {step === 1 && <>
                                <FieldShell label="Nama Mitra (Partner Name)">
                                    <div className="relative">
                                        <Input
                                            id="name"
                                            type="text"
                                            required
                                            autoFocus
                                            tabIndex={1}
                                            autoComplete="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            disabled={processing}
                                            placeholder="Masukkan nama organisasi atau bisnis"
                                            className="h-auto rounded-none border-0 border-b-2 border-[#c2c8be] bg-transparent px-0 py-2 text-[18px] leading-[1.6] text-[#191c1c] shadow-none focus-visible:ring-0 focus-visible:border-[#1d3a20]"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 h-0.5 origin-center scale-x-0 bg-[#1d3a20] transition-transform group-focus-within:scale-x-100" />
                                    </div>
                                    <InputError message={errors.name} className="mt-2" />
                                </FieldShell>

                                <FieldShell label="Alamat email">
                                    <div className="relative">
                                        <Input
                                            id="email"
                                            type="email"
                                            required
                                            tabIndex={2}
                                            autoComplete="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            disabled={processing}
                                            placeholder="nama@contoh.com"
                                            className="h-auto rounded-none border-0 border-b-2 border-[#c2c8be] bg-transparent px-0 py-2 text-[18px] leading-[1.6] text-[#191c1c] shadow-none focus-visible:ring-0 focus-visible:border-[#1d3a20]"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 h-0.5 origin-center scale-x-0 bg-[#1d3a20] transition-transform group-focus-within:scale-x-100" />
                                    </div>
                                    <InputError message={errors.email} className="mt-2" />
                                </FieldShell>

                                <FieldShell label="Kata sandi">
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type="password"
                                            required
                                            tabIndex={3}
                                            autoComplete="new-password"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            disabled={processing}
                                            placeholder="Kata sandi"
                                            className="h-auto rounded-none border-0 border-b-2 border-[#c2c8be] bg-transparent px-0 py-2 text-[18px] leading-[1.6] text-[#191c1c] shadow-none focus-visible:ring-0 focus-visible:border-[#1d3a20]"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 h-0.5 origin-center scale-x-0 bg-[#1d3a20] transition-transform group-focus-within:scale-x-100" />
                                    </div>
                                    <InputError message={errors.password} className="mt-2" />
                                </FieldShell>

                                <FieldShell label="Konfirmasi kata sandi">
                                    <div className="relative">
                                        <Input
                                            id="password_confirmation"
                                            type="password"
                                            required
                                            tabIndex={4}
                                            autoComplete="new-password"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            disabled={processing}
                                            placeholder="Ulangi kata sandi"
                                            className="h-auto rounded-none border-0 border-b-2 border-[#c2c8be] bg-transparent px-0 py-2 text-[18px] leading-[1.6] text-[#191c1c] shadow-none focus-visible:ring-0 focus-visible:border-[#1d3a20]"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 h-0.5 origin-center scale-x-0 bg-[#1d3a20] transition-transform group-focus-within:scale-x-100" />
                                    </div>
                                    <InputError message={errors.password_confirmation} className="mt-2" />
                                </FieldShell>

                                <div className="mt-3 flex items-center justify-between border-t border-[#e1e3e2] pt-5">
                                    <Link href={route('login')} className="inline-flex items-center gap-2 rounded-lg border border-[#c2c8be] px-6 py-3 text-[14px] font-medium tracking-[0.05em] text-[#191c1c] transition-colors hover:bg-[#e1e3e2]">
                                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                                        Back
                                    </Link>
                                    <button type="button" onClick={() => document.querySelector('form')?.reportValidity() && setStep(2)} className="inline-flex items-center gap-2 rounded-lg bg-[#1d3a20] px-8 py-3 text-[14px] font-medium tracking-[0.05em] text-white transition-colors hover:bg-[#00250a]">
                                        Continue
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </button>
                                </div>
                                </>}

                                {step === 2 && <>
                                <div className="pt-1">
                                    <div className="flex flex-col gap-3">
                                        <FieldShell label="Alamat Lengkap (Full Address)">
                                            <div className="relative">
                                                <Textarea
                                                    id="address"
                                                    rows={2}
                                                    value={data.address}
                                                    onChange={(e) => setData('address', e.target.value)}
                                                    required
                                                    placeholder="Masukkan alamat operasional lengkap"
                                                    className="min-h-0 resize-none rounded-none border-0 border-b-2 border-[#c2c8be] bg-transparent px-0 py-2 text-[18px] leading-[1.6] text-[#191c1c] shadow-none outline-none focus:border-[#1d3a20] focus:outline-none focus:ring-0 focus-visible:border-[#1d3a20] focus-visible:outline-none focus-visible:ring-0"
                                                />
                                                <div className="absolute inset-x-0 bottom-0 h-0.5 origin-center scale-x-0 bg-[#1d3a20] transition-transform group-focus-within:scale-x-100" />
                                            </div>
                                        </FieldShell>

                                        <div className="rounded-lg border border-[#c2c8be] bg-[#f3f4f3] p-3">
                                            <div className="flex items-start gap-3">
                                                <span className="material-symbols-outlined mt-0.5 text-[#424841]">info</span>
                                                <p className="text-[14px] font-medium leading-[1.2] tracking-[0.02em] text-[#424841]">
                                                    Pastikan alamat yang dimasukkan sesuai dengan lokasi fisik untuk memudahkan koordinasi logistik.
                                                </p>
                                            </div>
                                        </div>

                                        <FieldShell label="Kapasitas penerimaan">
                                            <CapacityInput
                                                values={data}
                                                error={capacityError}
                                                fieldErrors={capacityFieldErrors}
                                                onChange={(key, value) => {
                                                    setData(key, value);
                                                    setCapacityError('');
                                                    setCapacityFieldErrors({});
                                                }}
                                            />
                                        </FieldShell>

                                        <FieldShell label="Frekuensi penerimaan">
                                            <Select value={data.frequency} onValueChange={(value) => setData('frequency', value)}>
                                                <SelectTrigger id="frequency" className="h-auto rounded-none border-0 border-b-2 border-[#c2c8be] bg-transparent px-0 py-2 text-[18px] leading-[1.6] text-[#191c1c] shadow-none focus:ring-0 focus:ring-offset-0">
                                                    <SelectValue placeholder="Pilih frekuensi" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[
                                                        ['harian', 'Harian'],
                                                        ['mingguan', 'Mingguan'],
                                                        ['bulanan', 'Bulanan'],
                                                    ].map(([value, label]) => (
                                                        <SelectItem key={value} value={value}>
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FieldShell>

                                        <FieldShell label="Pin lokasi (GPS)"><p className="mb-3 text-sm font-normal leading-6">Lokasi membantu verifikasi alamat dan koordinasi penjemputan. Kami hanya menerima koordinat perangkat ini, tanpa mencari alamat otomatis.</p><button type="button" onClick={captureLocation} disabled={locationState === 'loading'} className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1d3a20] px-4 text-sm font-semibold text-white disabled:opacity-60"><LocateFixed size={17} />{locationState === 'loading' ? 'Mengambil lokasi…' : 'Gunakan lokasi saya'}</button>{locationState === 'success' && <p className="mb-3 text-sm text-[#1d3a20]">Lokasi berhasil diambil. Anda masih dapat mengubah koordinat.</p>}<div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="latitude" className="text-xs normal-case tracking-normal">Latitude (-90 sampai 90)</Label><Input id="latitude" type="number" step="any" min="-90" max="90" required value={data.latitude} onChange={(e) => { setData('latitude', e.target.value); setLocationError(''); }} placeholder="-6.200000" /><InputError message={errors.latitude} /></div><div><Label htmlFor="longitude" className="text-xs normal-case tracking-normal">Longitude (-180 sampai 180)</Label><Input id="longitude" type="number" step="any" min="-180" max="180" required value={data.longitude} onChange={(e) => { setData('longitude', e.target.value); setLocationError(''); }} placeholder="106.816666" /><InputError message={errors.longitude} /></div></div>{locationError && <p role="alert" className="mt-2 text-sm text-red-600">{locationError}</p>}</FieldShell>
                                        <FieldShell label="Preferensi grade">
                                            {data.frequency === 'bulanan' && <><Label htmlFor="monthly_receiving_day">Tanggal penerimaan setiap bulan (1–28)</Label><Input id="monthly_receiving_day" type="number" min="1" max="28" value={data.monthly_receiving_day} onChange={(e) => setData('monthly_receiving_day', e.target.value)} required /><InputError message={errors.monthly_receiving_day} /></>}
                                            <GradeSelect id="grade_preference" ariaLabelledBy="grade-label" value={data.grade_preference} onChange={(value) => setData('grade_preference', value)} />
                                        </FieldShell>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t border-[#e1e3e2] pt-5">
                                    <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-lg border border-[#c2c8be] px-6 py-3 text-[14px] font-medium tracking-[0.05em] text-[#191c1c] transition-colors hover:bg-[#e1e3e2]">
                                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                                        Back
                                    </button>
                                    <Button type="submit" className="h-auto rounded-lg bg-[#1d3a20] px-8 py-3 text-[14px] font-medium tracking-[0.05em] text-white hover:bg-[#00250a]" tabIndex={5} disabled={processing}>
                                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                        Buat akun
                                        <span className="material-symbols-outlined text-sm">check</span>
                                    </Button>
                                </div>
                                </>}

                                <div className="pt-1 text-center text-sm text-[#5d6757]">
                                    Sudah punya akun?{' '}
                                    <Link href={route('login')} tabIndex={6} className="font-semibold text-[#1d3a20] underline underline-offset-4">
                                        Masuk
                                    </Link>
                                </div>
                            </form>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}
