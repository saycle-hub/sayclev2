import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

import InputError from '@/components/input-error';

interface LoginForm {
    email: string;
    password: string;
    remember: boolean;
    [key: string]: string | boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <>
            <Head title="Masuk - SayCle">
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
            </Head>
            <main className="relative flex min-h-screen w-full items-center justify-center bg-[#f8faf5] font-[Inter] text-[16px] font-normal leading-[1.5] text-[#191c1a] antialiased lg:h-screen lg:min-h-0 lg:overflow-hidden">
                <Link href={route('home')} className="absolute left-6 top-6 z-20 inline-flex items-center gap-2 rounded-[12px] border border-[#c2c8be] bg-[#f8faf5] px-4 py-3 text-[13px] font-semibold text-[#07240c] transition-colors hover:bg-[#f2f4f0]">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Kembali ke halaman utama
                </Link>
                <div className="flex min-h-screen w-full lg:h-full lg:min-h-0">
                    <section className="relative hidden items-center justify-center overflow-hidden bg-[#f2f4f0] p-10 lg:flex lg:h-full lg:w-1/2">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-[#c9ecc6] to-transparent opacity-20" />
                        <div className="absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/3 rounded-full bg-[#cdebc5]/30 blur-3xl" />
                        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/4 translate-y-1/3 rounded-full bg-[#adcfab]/40 blur-3xl" />
                        <div className="relative z-10 w-full max-w-[30rem] text-center">
                            <h1 className="mb-4 font-['Space_Grotesk'] text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#07240c]">Siklus Pangan Berkelanjutan.</h1>
                            <p className="mx-auto max-w-md font-[Inter] text-[17px] font-normal leading-[1.55] text-[#424841]">Platform logistik pintar untuk mengurangi sisa makanan dan mengoptimalkan distribusi menuju ekonomi sirkular.</p>
                        </div>
                    </section>

                    <section className="flex w-full items-center justify-center bg-[#f8faf5] p-6 sm:p-10 lg:w-1/2 lg:p-8">
                        <div className="w-full max-w-md">
                            <Link href={route('home')} className="mb-5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#07240c] [font-size:32px] [font-variation-settings:'FILL'_1]">eco</span>
                                <span className="font-['Space_Grotesk'] text-[24px] font-bold leading-[1.3] tracking-tight text-[#07240c]">SayCle</span>
                            </Link>

                            <div className="mb-5">
                                <h2 className="mb-2 font-['Space_Grotesk'] text-[32px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#191c1a]">Selamat Datang Kembali</h2>
                                <p className="text-[#424841]">Silakan masuk ke akun Anda untuk melanjutkan.</p>
                            </div>

                            <div className="rounded-[12px] border border-[#c2c8be] bg-white p-5 [box-shadow:0_8px_24px_rgba(29,58,32,0.06)] sm:p-6">
                                <form className="space-y-4" onSubmit={submit}>
                                    <div>
                                        <label className="mb-2 block font-[Inter] text-[13px] font-semibold uppercase leading-none tracking-[0.05em] text-[#424841]" htmlFor="email">Email atau Username</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                                                <span className="material-symbols-outlined text-[#737970]">mail</span>
                                            </span>
                                            <input className="w-full rounded-[12px] border border-[#c2c8be] bg-white py-4 pl-16 pr-4 text-[#191c1a] transition-colors placeholder:text-[#737970] focus:border-[#07240c] focus:outline-none focus:ring-2 focus:ring-[#07240c]/10 focus:[box-shadow:0_0_0_2px_rgba(194,200,190,0.1)]" id="email" name="email" placeholder="Masukkan email Anda" required type="email" autoComplete="email" autoFocus value={data.email} onChange={(event) => setData('email', event.target.value)} />
                                        </div>
                                        <InputError message={errors.email} className="mt-2" />
                                    </div>

                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <label className="block font-[Inter] text-[13px] font-semibold uppercase leading-none tracking-[0.05em] text-[#424841]" htmlFor="password">Kata Sandi</label>
                                            {canResetPassword && <Link className="font-[Inter] text-[13px] font-semibold uppercase leading-none tracking-[0.05em] text-[#07240c] transition-colors hover:text-[#1d3a20]" href={route('password.request')}>Lupa Sandi?</Link>}
                                        </div>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                                                <span className="material-symbols-outlined text-[#737970]">lock</span>
                                            </span>
                                            <input className="w-full rounded-[12px] border border-[#c2c8be] bg-white py-4 pl-16 pr-16 text-[#191c1a] transition-colors placeholder:text-[#737970] focus:border-[#07240c] focus:outline-none focus:ring-2 focus:ring-[#07240c]/10 focus:[box-shadow:0_0_0_2px_rgba(194,200,190,0.1)]" id="password" name="password" placeholder="Masukkan kata sandi" required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={data.password} onChange={(event) => setData('password', event.target.value)} />
                                            <button className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#737970] transition-colors hover:text-[#424841]" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
                                                <span className="material-symbols-outlined">{showPassword ? 'visibility' : 'visibility_off'}</span>
                                            </button>
                                        </div>
                                        <InputError message={errors.password} className="mt-2" />
                                    </div>

                                    <label className="flex items-center gap-3 text-sm text-[#424841]">
                                        <input
                                            type="checkbox"
                                            checked={data.remember}
                                            onChange={(event) => setData('remember', event.target.checked)}
                                            className="size-4 rounded border-[#c2c8be] text-[#07240c] focus:ring-[#07240c]"
                                        />
                                        <span>Ingat saya</span>
                                    </label>
                                    <div className="pt-2">
                                        <button className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#07240c] px-6 py-4 font-[Inter] text-[13px] font-semibold uppercase leading-none tracking-[0.05em] text-white transition-colors hover:bg-[#1d3a20] disabled:opacity-60" type="submit" disabled={processing}>
                                            <span>{processing ? 'Memproses' : 'Masuk'}</span>
                                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {status && <p className="mt-6 text-center font-[Inter] text-[13px] font-semibold uppercase leading-none tracking-[0.05em] text-[#4b6547]">{status}</p>}
                            <p className="mt-6 text-center font-[Inter] text-[13px] font-normal leading-none tracking-[0.03em] text-[#737970]">
                                Belum memiliki akun? <Link className="font-semibold text-[#1d3a20] underline-offset-4 hover:underline" href={route('register')}>Daftar sekarang</Link>
                            </p>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
