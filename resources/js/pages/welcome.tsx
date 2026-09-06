import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Check, CircleDot, Leaf, Menu, ShieldCheck, Truck } from 'lucide-react';
import Waves from '@/components/Waves';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type Destination = { label: string; kg: number };

type ImpactStats = {
    processedKg: number;
    partnerCount: number;
    reportCount: number;
    destinations: Destination[];
};

type WelcomeProps = { impactStats?: ImpactStats };

const steps = [
    ['01', 'Sumber', 'Pasar dan kebun melaporkan sisa sayuran yang tidak layak konsumsi.'],
    ['02', 'Penjemputan', 'Tim SayCle menjemput sesuai detail lokasi dan waktu yang dikirim.'],
    ['03', 'Grade', 'Petugas meninjau, memilah, lalu mengarahkan material ke tujuan yang tepat.'],
];

const nav = [
    ['#alur', 'Alur'],
    ['#tujuan', 'Tujuan'],
    ['#operasi', 'Operasi'],
];

const number = new Intl.NumberFormat('id-ID');

function formatKg(value: number) {
    return `${number.format(value)} kg`;
}

export default function Welcome({ impactStats }: WelcomeProps) {
    const stats = impactStats ?? { processedKg: 0, partnerCount: 0, reportCount: 0, destinations: [] };

    return (
        <>
            <Head title="SayCle — Pemanfaatan sisa sayuran" />
            <main className="min-h-screen overflow-hidden bg-white text-[#18352a]">
                <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-10" aria-label="Navigasi utama">
                    <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:ring-offset-4">
                        <span className="grid size-8 place-items-center rounded-full bg-[#18352a] text-[#f6a51d]" aria-hidden="true"><Leaf size={17} /></span>
                        saycle<span className="text-[#e88c12]">.</span>
                    </Link>
                    <div className="hidden items-center gap-8 text-sm font-medium md:flex">
                        {nav.map(([href, label]) => <a key={href} href={href} className="transition-colors hover:text-[#e88c12] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e88c12]">{label}</a>)}
                        <Link href={route('tracking.create')} className="transition-colors hover:text-[#e88c12] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e88c12]">Lacak laporan</Link>
                        <Link href={route('login')} className="transition-colors hover:text-[#e88c12] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e88c12]">Masuk</Link>
                    </div>
                    <Sheet>
                        <SheetTrigger asChild><button className="grid size-11 place-items-center rounded-full border border-[#8fb996] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e88c12] md:hidden" aria-label="Buka menu"><Menu size={20} /></button></SheetTrigger>
                        <SheetContent className="bg-white text-[#18352a]">
                            <SheetTitle>Navigasi SayCle</SheetTitle>
                            <div className="mt-8 grid gap-2">
                                {nav.map(([href, label]) => <SheetClose asChild key={href}><a className="flex min-h-11 items-center" href={href}>{label}</a></SheetClose>)}
                                <SheetClose asChild><Link className="flex min-h-11 items-center" href={route('tracking.create')}>Lacak laporan</Link></SheetClose>
                                <SheetClose asChild><Link className="flex min-h-11 items-center" href={route('login')}>Masuk</Link></SheetClose>
                                <SheetClose asChild><Link className="mt-2 flex min-h-11 items-center justify-center rounded-full bg-[#e88c12] px-5 font-semibold text-[#18352a]" href="/lapor">Lapor sisa sayur</Link></SheetClose>
                            </div>
                        </SheetContent>
                    </Sheet>
                </nav>

                <section className="relative mx-3 min-h-[610px] overflow-hidden rounded-[2rem] bg-[#2f6848] px-6 py-16 text-[#f4f3ed] sm:px-10 lg:px-20 lg:py-24" aria-labelledby="hero-title">
                    <Waves className="welcome-waves pointer-events-none opacity-25 motion-reduce:opacity-10" lineColor="#d7e6c9" waveAmpX={24} waveAmpY={12} />
                    <div className="relative z-10 max-w-3xl">
                        <p className="mb-8 text-xs font-bold uppercase tracking-[.24em] text-[#c9dfb5]">Saycle</p>
                        <h1 id="hero-title" className="max-w-3xl text-5xl leading-[.98] font-bold tracking-[-.045em] sm:text-7xl">Sisa sayur,<br /><span className="text-[#c9dfb5]">punya alur berikutnya.</span></h1>
                        <p className="mt-8 max-w-xl text-base leading-7 text-[#e4eedf] sm:text-lg">SayCle menghubungkan sumber sisa sayuran, penjemputan, dan tujuan pemanfaatan dalam satu alur yang bisa dilacak.</p>
                        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                            <Link href="/lapor" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#e88c12] px-6 font-bold text-[#18352a] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2f6848]">Lapor sisa sayur <ArrowRight size={18} /></Link>
                            <a href="#alur" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#b9d3b2] px-6 font-semibold transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Lihat alurnya</a>
                        </div>
                    </div>
                    <div className="absolute right-8 bottom-8 hidden max-w-xs rounded-2xl border border-white/20 bg-[#18352a]/40 p-5 backdrop-blur-sm lg:block">
                        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#c9dfb5]">Yang kami terima</p>
                        <p className="mt-2 text-sm leading-6 text-[#f4f3ed]">Sisa sayuran pasar atau kebun yang tidak layak konsumsi manusia.</p>
                    </div>
                </section>

                <section className="mx-auto grid max-w-7xl gap-px px-5 py-16 sm:grid-cols-3 lg:px-10" aria-labelledby="impact-title">
                    <div className="sm:col-span-3 mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#709775]">Catatan operasi</p><h2 id="impact-title" className="mt-2 text-3xl font-bold tracking-tight">Dampak yang tercatat.</h2></div><p className="max-w-sm text-sm leading-6 text-[#709775]">Angka berikut berasal dari aktivitas SayCle saat ini.</p></div>
                    {[[formatKg(stats.processedKg), 'Material diterima'], [number.format(stats.partnerCount), 'Mitra terdaftar'], [number.format(stats.reportCount), 'Laporan masuk']].map(([value, label]) => <div key={label} className="border-t border-[#cfe1d0] py-6 sm:px-5 first:sm:pl-0"><p className="text-3xl font-bold tracking-tight text-[#2f6848]">{value}</p><p className="mt-2 text-sm text-[#709775]">{label}</p></div>)}
                </section>

                <section id="alur" className="bg-[#f2f7f3] px-5 py-20 lg:px-10" aria-labelledby="flow-title">
                    <div className="mx-auto max-w-7xl"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#709775]">Dari sumber ke tujuan</p><h2 id="flow-title" className="mt-3 text-4xl font-bold tracking-tight">Satu alur. Lebih mudah dipahami.</h2></div><div className="mt-14 grid gap-8 md:grid-cols-3">{steps.map(([index, title, copy]) => <article key={index} className="relative border-t-2 border-[#8fb996] pt-5"><span className="text-sm font-bold text-[#e88c12]">{index}</span><h3 className="mt-8 text-xl font-bold">{title}</h3><p className="mt-3 max-w-sm text-sm leading-6 text-[#709775]">{copy}</p></article>)}</div></div>
                </section>

                <section id="tujuan" className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[.8fr_1.2fr] lg:px-10" aria-labelledby="destination-title">
                    <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#709775]">Tujuan pemanfaatan</p><h2 id="destination-title" className="mt-3 text-4xl font-bold tracking-tight">Material diarahkan sesuai hasil peninjauan.</h2><p className="mt-5 max-w-md leading-7 text-[#709775]">Setiap laporan ditinjau petugas sebelum diarahkan ke tujuan yang tersedia. Data kosong tetap berarti belum ada aktivitas tercatat.</p></div>
                    <div className="rounded-[1.5rem] bg-[#18352a] p-6 text-[#f4f3ed] sm:p-8">{stats.destinations.length ? <div className="grid gap-6">{stats.destinations.map((destination) => <div key={destination.label}><div className="flex items-baseline justify-between gap-4"><h3 className="font-semibold">{destination.label}</h3><span className="text-sm text-[#c9dfb5]">{formatKg(destination.kg)}</span></div><div className="mt-3 h-2 rounded-full bg-white/15"><div className="h-2 rounded-full bg-[#c9dfb5]" style={{ width: `${Math.min(100, stats.processedKg ? destination.kg / stats.processedKg * 100 : 0)}%` }} aria-hidden="true" /></div></div>)}</div> : <div className="py-8 text-center"><CircleDot className="mx-auto text-[#c9dfb5]" aria-hidden="true" /><p className="mt-4 font-semibold">Belum ada tujuan tercatat</p><p className="mt-2 text-sm text-[#b9d3b2]">Data tujuan akan muncul setelah aktivitas diproses.</p></div>}</div>
                </section>

                <section id="operasi" className="mx-3 mb-3 rounded-[2rem] bg-[#d7e6c9] px-6 py-16 sm:px-10 lg:px-20" aria-labelledby="operation-title"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#709775]">Operasi yang jelas</p><h2 id="operation-title" className="mt-3 text-4xl font-bold tracking-tight">Berangkat dari laporan yang lengkap.</h2><ul className="mt-8 grid gap-4 text-sm leading-6 sm:grid-cols-2"><li className="flex gap-3"><Check className="mt-1 shrink-0 text-[#2f6848]" size={18} aria-hidden="true" />Lokasi dan waktu penjemputan dikirim sejak awal.</li><li className="flex gap-3"><ShieldCheck className="mt-1 shrink-0 text-[#2f6848]" size={18} aria-hidden="true" />Petugas meninjau dan menetapkan grade material.</li><li className="flex gap-3"><Truck className="mt-1 shrink-0 text-[#2f6848]" size={18} aria-hidden="true" />Status laporan dapat dilacak setelah dikirim.</li></ul><Link href="/lapor" className="mt-10 inline-flex min-h-12 items-center gap-3 rounded-full bg-[#18352a] px-6 font-bold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18352a] focus-visible:ring-offset-2">Mulai dari sini <ArrowRight size={18} /></Link></div></section>
                <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 text-sm text-[#709775] sm:flex-row sm:items-center sm:justify-between lg:px-10"><span className="font-bold text-[#18352a]">saycle<span className="text-[#e88c12]">.</span></span><span>Sisa sayur, alur berikutnya.</span><Link href={route('login')} className="font-semibold text-[#18352a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e88c12]">Masuk</Link></footer>
            </main>
        </>
    );
}
