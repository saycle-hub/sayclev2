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
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({ email: '', password: '', remember: false });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <>
            <Head title="Masuk - PilahPangan">
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
            </Head>
            <main className="relative flex h-screen min-h-screen overflow-hidden bg-[#f8faf5] font-[Inter] text-[16px] leading-[1.5] text-[#191c1a] antialiased">
                <Link href={route('home')} className="absolute left-6 top-6 z-20 inline-flex items-center gap-2 rounded-xl border border-[#c2c8be] bg-[#f8faf5]/90 px-4 py-2.5 text-sm font-semibold text-[#07240c] shadow-sm backdrop-blur transition-colors hover:bg-[#f2f4f0]"><span className="material-symbols-outlined text-[18px] leading-none">arrow_back</span>Kembali</Link>
                <section className="relative hidden h-full w-1/2 items-center justify-center overflow-hidden bg-[#f2f4f0] p-10 lg:flex xl:p-12">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-[#c9ecc6] to-transparent opacity-20" />
                    <div className="absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/3 rounded-full bg-[#cdebc5]/30 blur-3xl" />
                    <div className="absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/4 translate-y-1/3 rounded-full bg-[#adcfab]/40 blur-3xl" />
                    <div className="relative z-10 flex h-full w-full max-w-lg flex-col items-center justify-center text-center">
                        <div className="mb-6 aspect-square max-h-[52vh] w-full max-w-[52vh] rounded-[24px] border border-[#e1e3df] bg-cover bg-center shadow-xl shadow-[#1d3a20]/5" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC7dIkyLWhMPJuRvF6S-orGaHjm7YhMRpOPjNQDH4RZPhGUhLNuGxQQf9L7fIKU5xv1qVqw7M_ECT8w1p4CqVIpqr78fASkXLTBg-wS32l7RVM9unl5alwldGDMJzoaPTO4vhhdCTYCPjRagDYphMoiWYAzCYbPRcc-ZxXo3WAR0FivNev93dJB2Yl9u-t73M0nkJVNim9TAyTc1VLq3Z5JCJ084NXFxSiNRYGeI5-cZfOHPhixaKZn')" }} />
                        <h1 className="mb-4 font-['Space_Grotesk'] text-[32px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#07240c]">Siklus Pangan Berkelanjutan.</h1>
                        <p className="mx-auto max-w-md text-[18px] leading-[1.6] text-[#424841]">Platform logistik pintar untuk mengurangi sisa makanan dan mengoptimalkan distribusi menuju ekonomi sirkular.</p>
                    </div>
                </section>

                <section className="flex h-full w-full items-center justify-center overflow-y-auto bg-[#f8faf5] p-6 sm:p-8 lg:w-1/2 lg:p-10">
                    <div className="w-full max-w-md py-4">
                        <Link href={route('home')} className="mb-6 flex items-center gap-2 text-[#07240c]"><span className="material-symbols-outlined [font-size:32px] [font-variation-settings:'FILL'_1]">eco</span><span className="font-['Space_Grotesk'] text-2xl font-bold tracking-tight">PilahPangan.</span></Link>
                        <div className="mb-6"><h2 className="mb-2 font-['Space_Grotesk'] text-[32px] font-semibold leading-[1.2] tracking-[-0.01em]">Selamat Datang Kembali</h2><p className="text-[#424841]">Silakan masuk ke akun Anda untuk melanjutkan.</p></div>
                        <div className="rounded-xl border border-[#c2c8be] bg-white p-5 shadow-[0_8px_24px_rgba(29,58,32,0.06)] sm:p-6">
                            <form className="space-y-4" onSubmit={submit}>
                                <div><label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.05em] text-[#424841]" htmlFor="email">Email atau Username</label><div className="relative"><span className="pointer-events-none absolute inset-y-0 left-0 grid w-14 place-items-center text-[#737970]"><span className="material-symbols-outlined text-[22px] leading-none">mail</span></span><input id="email" type="email" required autoFocus autoComplete="email" value={data.email} onChange={(event) => setData('email', event.target.value)} placeholder="Masukkan email Anda" className="w-full rounded-xl border border-[#c2c8be] bg-white py-4 pl-14 pr-4 text-[#191c1a] outline-none transition-colors placeholder:text-[#737970] focus:border-[#07240c] focus:ring-2 focus:ring-[#07240c]/10" /></div><InputError message={errors.email} className="mt-2" /></div>
                                <div><div className="mb-2 flex items-center justify-between"><label className="block text-[13px] font-semibold uppercase tracking-[0.05em] text-[#424841]" htmlFor="password">Kata Sandi</label>{canResetPassword && <Link className="text-[13px] font-semibold text-[#07240c] hover:text-[#1d3a20]" href={route('password.request')}>Lupa Sandi?</Link>}</div><div className="relative"><span className="pointer-events-none absolute inset-y-0 left-0 grid w-14 place-items-center text-[#737970]"><span className="material-symbols-outlined text-[22px] leading-none">lock</span></span><input id="password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={data.password} onChange={(event) => setData('password', event.target.value)} placeholder="Masukkan kata sandi" className="w-full rounded-xl border border-[#c2c8be] bg-white py-4 pl-14 pr-14 text-[#191c1a] outline-none transition-colors placeholder:text-[#737970] focus:border-[#07240c] focus:ring-2 focus:ring-[#07240c]/10" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} className="absolute inset-y-0 right-0 grid w-14 place-items-center text-[#737970] hover:text-[#424841]"><span className="material-symbols-outlined text-[22px] leading-none">{showPassword ? 'visibility' : 'visibility_off'}</span></button></div><InputError message={errors.password} className="mt-2" /></div>
                                <label className="flex items-center gap-3 text-sm text-[#424841]"><input type="checkbox" checked={data.remember} onChange={(event) => setData('remember', event.target.checked)} className="size-4 rounded border-[#c2c8be] text-[#07240c] focus:ring-[#07240c]" />Ingat saya</label>
                                <button type="submit" disabled={processing} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#07240c] px-6 py-4 text-[13px] font-semibold uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#1d3a20] disabled:opacity-60">{processing ? 'Memproses' : 'Masuk'}<span className="material-symbols-outlined text-[18px]">arrow_forward</span></button>
                            </form>
                            <div className="relative my-5"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#c2c8be]" /></div><div className="relative flex justify-center text-sm"><span className="bg-white px-3 text-[13px] font-semibold text-[#424841]">Atau lanjutkan dengan</span></div></div>
                            <button type="button" className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#c2c8be] bg-transparent px-6 py-4 text-[13px] font-semibold text-[#191c1a] transition-colors hover:bg-[#f2f4f0]"><span className="font-bold text-[#4285F4]">G</span>Google</button>
                        </div>
                        {status && <p className="mt-6 text-center text-[13px] font-semibold text-[#4b6547]">{status}</p>}
                        <p className="mt-6 text-center text-[13px] text-[#737970]">Belum memiliki akun? <Link className="font-semibold text-[#07240c] underline-offset-4 hover:underline" href={route('register')}>Daftar sekarang</Link></p>
                    </div>
                </section>
            </main>
        </>
    );
}
