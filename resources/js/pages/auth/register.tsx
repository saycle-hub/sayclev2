import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CapacityInput } from '@/components/capacity-input';
import { GradeSelect } from '@/components/grade-select';
import AuthLayout from '@/layouts/auth-layout';

interface RegisterForm {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    address: string; min_capacity_kg: string; ideal_capacity_kg: string; max_capacity_kg: string; frequency: string;
    grade_preference: string;
    [key: string]: string;
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

export default function Register() {
    const [capacityError, setCapacityError] = useState('');
    const [capacityFieldErrors, setCapacityFieldErrors] = useState<CapacityErrors>({});
    const { data, setData, post, processing, errors, reset } = useForm<RegisterForm>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        address: '', min_capacity_kg: '', ideal_capacity_kg: '', max_capacity_kg: '', frequency: '', grade_preference: '',
    });

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
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout title="Buat akun" description="Daftarkan akun mitra SayCle">
            <Head title="Daftar" />
            <form noValidate className="flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="address">Alamat</Label><Textarea id="address" value={data.address} onChange={e => setData('address', e.target.value)} required className="focus:border-[#e88c12] focus:ring-[#e88c12]/30" />
                        <Label>Kapasitas penerimaan</Label><CapacityInput values={data} error={capacityError} fieldErrors={capacityFieldErrors} onChange={(key, value) => { setData(key, value); setCapacityError(''); setCapacityFieldErrors({}); }} />
                        <Label htmlFor="frequency">Frekuensi penerimaan</Label><Select value={data.frequency} onValueChange={value => setData('frequency', value)}><SelectTrigger id="frequency" className="focus:border-[#e88c12] focus:ring-[#e88c12]/30"><SelectValue placeholder="Pilih frekuensi" /></SelectTrigger><SelectContent>{[['harian','Harian'],['mingguan','Mingguan'],['bulanan','Bulanan']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
                        <Label id="grade-label" htmlFor="grade_preference">Preferensi grade</Label><GradeSelect id="grade_preference" ariaLabelledBy="grade-label" value={data.grade_preference} onChange={value => setData('grade_preference', value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nama</Label>
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
                            placeholder="Nama lengkap"
                            className="focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">Alamat email</Label>
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
                            className="focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Kata sandi</Label>
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
                            className="focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Konfirmasi kata sandi</Label>
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
                            className="focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                        />
                        <InputError message={errors.password_confirmation} />
                    </div>

                    <Button type="submit" className="mt-2 w-full focus-visible:border-[#e88c12] focus-visible:ring-[#e88c12]/30" tabIndex={5} disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Buat akun
                    </Button>
                </div>

                <div className="text-muted-foreground text-center text-sm">
                    Sudah punya akun?{' '}
                    <TextLink href={route('login')} tabIndex={6}>
                        Masuk
                    </TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}
