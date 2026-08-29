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
            <Head title="Masuk - PilahPangan">
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
                            <div
                                className="mb-8 aspect-square w-full rounded-[24px] border border-[#e1e3df] bg-cover bg-center shadow-xl shadow-[#1d3a20]/5 [box-shadow:0_8px_24px_rgba(29,58,32,0.06)]"
                                style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC7dIkyLWhMPJuRvF6S-orGaHjm7YhMRpOPjNQDH4RZPhGUhLNuGxQQf9L7fIKU5xv1qVqw7M_ECT8w1p4CqVIpqr78fASkXLTBg-wS32l7RVM9unl5alwldGDMJzoaPTO4vhhdCTYCPjRagDYphMoiWYAzCYbPRcc-ZxXo3WAR0FivNev93dJB2Yl9u-t73M0nkJVNim9TAyTc1VLq3Z5JCJ084NXFxSiNRYGeI5-cZfOHPhixaKZn")' }}
                            />
                            <h1 className="mb-4 font-['Space_Grotesk'] text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#07240c]">Siklus Pangan Berkelanjutan.</h1>
                            <p className="mx-auto max-w-md font-[Inter] text-[17px] font-normal leading-[1.55] text-[#424841]">Platform logistik pintar untuk mengurangi sisa makanan dan mengoptimalkan distribusi menuju ekonomi sirkular.</p>
                        </div>
                    </section>

                    <section className="flex w-full items-center justify-center bg-[#f8faf5] p-6 sm:p-10 lg:w-1/2 lg:p-8">
                        <div className="w-full max-w-md">
                            <Link href={route('home')} className="mb-5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#07240c] [font-size:32px] [font-variation-settings:'FILL'_1]">eco</span>
                                <span className="font-['Space_Grotesk'] text-[24px] font-bold leading-[1.3] tracking-tight text-[#07240c]">PilahPangan.</span>
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

                                <div className="relative my-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-[#c2c8be]" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="bg-white px-4 font-[Inter] text-[13px] font-semibold uppercase leading-none tracking-[0.05em] text-[#424841]">Atau lanjutkan dengan</span>
                                    </div>
                                </div>

                                <button className="flex w-full items-center justify-center gap-4 rounded-[12px] border border-[#c2c8be] bg-transparent px-6 py-4 font-[Inter] text-[13px] font-semibold uppercase leading-none tracking-[0.05em] text-[#191c1a] transition-colors hover:bg-[#f2f4f0]" type="button">
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    <span>Google</span>
                                </button>
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
