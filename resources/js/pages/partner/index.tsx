import { Head, Link } from '@inertiajs/react';
import { ArrowRight, CalendarDays, Info, Wallet } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';

const breadcrumbs = [{ title: 'Beranda', href: '/partner' }];

const grades = [
    { name: 'Layak', kg: 80, width: '44%', color: 'bg-[#306949]', destination: 'Pakan ternak' },
    { name: 'Kurang Layak', kg: 60, width: '33%', color: 'bg-[#f6a51d]', destination: 'Maggot' },
    { name: 'Tidak Layak', kg: 40, width: '22%', color: 'bg-[#ba1a1a]', destination: 'Kompos' },
];

export default function Partner() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Beranda Mitra - PilahPangan" />
            <main className="min-h-full bg-[#f8faf5] p-4 text-[#191c1a] md:p-6 lg:p-8">
                <div className="mx-auto max-w-[1280px]">
                    <header className="mb-6">
                        <h1 className="font-['Manrope'] text-[28px] font-semibold leading-9 tracking-tight text-[#022016]">Beranda Mitra</h1>
                        <p className="mt-1 text-sm text-[#424844]">Ringkasan aktivitas dan operasional Anda hari ini.</p>
                    </header>

                    <div className="mb-6 flex items-start gap-3 rounded-lg border border-[#f6a51d]/30 bg-[#f6a51d]/10 p-4">
                        <Info className="mt-0.5 size-5 shrink-0 text-[#dc8200]" />
                        <p className="text-sm font-semibold text-[#693c00]">Alokasi minggu ini belum mencapai kapasitas ideal.</p>
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                        <section className="col-span-12 flex flex-col justify-between rounded-xl border border-[#2f6848]/15 bg-white p-5 shadow-sm lg:col-span-8">
                            <div>
                                <div className="mb-5 flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="font-['Manrope'] text-lg font-semibold text-[#022016]">Kapasitas Terpakai</h2>
                                        <p className="mt-1 text-sm text-[#424844]">Minggu ini</p>
                                    </div>
                                    <span className="rounded-full bg-[#d7e6c9] px-3 py-1 text-xs font-semibold text-[#356e4d]">Menuju kapasitas ideal</span>
                                </div>
                                <div className="mb-4 flex items-baseline gap-2">
                                    <span className="font-['Manrope'] text-[32px] font-bold leading-10 text-[#022016]">180</span>
                                    <span className="text-base text-[#424844]">/ 250 kg</span>
                                </div>
                            </div>
                            <div className="relative pb-8 pt-2">
                                <div className="h-3 overflow-hidden rounded-full bg-[#e7e9e4]"><div className="h-full w-[72%] rounded-full bg-[#18352a]" /></div>
                                <div className="absolute inset-x-0 top-7 flex justify-between text-xs text-[#424844]">
                                    <span>Min 100</span><span className="font-semibold text-[#306949]">Ideal 200</span><span>Max 250</span>
                                </div>
                            </div>
                        </section>

                        <section className="col-span-12 flex flex-col justify-between rounded-xl border border-[#2f6848]/15 bg-white p-5 shadow-sm lg:col-span-4">
                            <div className="mb-5 flex items-start justify-between"><div className="grid size-11 place-items-center rounded-lg bg-[#ffdad6]/60 text-[#ba1a1a]"><Wallet className="size-5" /></div><span className="rounded-full bg-[#ffdad6] px-3 py-1 text-xs font-semibold text-[#93000a]">Belum lunas</span></div>
                            <div><h2 className="font-['Manrope'] text-lg font-semibold text-[#022016]">Tagihan Berjalan</h2><p className="mt-2 font-['Manrope'] text-[28px] font-bold text-[#022016]">Rp1.250.000</p></div>
                        </section>

                        <section className="col-span-12 rounded-xl border border-[#2f6848]/15 bg-white p-5 shadow-sm lg:col-span-4">
                            <h2 className="mb-5 font-['Manrope'] text-lg font-semibold text-[#022016]">Alokasi per Grade</h2>
                            <div className="space-y-5">{grades.map((grade) => <div key={grade.name}><div className="mb-2 flex justify-between text-sm"><span>{grade.name}</span><strong>{grade.kg} kg</strong></div><div className="h-2 overflow-hidden rounded-full bg-[#e7e9e4]"><div className={`h-full rounded-full ${grade.color}`} style={{ width: grade.width }} /></div><p className="mt-1 text-xs text-[#727974]">{grade.destination}</p></div>)}</div>
                        </section>

                        <section className="col-span-12 flex flex-col rounded-xl border border-[#2f6848]/15 bg-white p-5 shadow-sm lg:col-span-4">
                            <div className="mb-5 flex items-center justify-between gap-2"><h2 className="font-['Manrope'] text-lg font-semibold text-[#022016]">Pengiriman Berikutnya</h2><span className="rounded-full bg-[#b3f0c7] px-3 py-1 text-xs font-semibold text-[#155133]">Dijadwalkan</span></div>
                            <div className="flex-1 space-y-4"><div className="flex items-center gap-3 text-sm font-medium"><CalendarDays className="size-5 text-[#727974]" /> Kamis, 12 Sep 2026</div><div className="grid grid-cols-2 gap-4 border-t border-[#2f6848]/15 pt-4 text-sm"><div><p className="mb-1 text-xs text-[#727974]">ID Pengiriman</p><strong>DLV-2026-0912</strong></div><div><p className="mb-1 text-xs text-[#727974]">Estimasi</p><strong>40 kg</strong></div><div className="col-span-2"><p className="mb-1 text-xs text-[#727974]">Grade</p><span className="rounded bg-[#f2f4ef] px-2 py-1 text-xs">Tidak Layak</span></div></div></div>
                            <Link href="/partner/deliveries" className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#18352a] text-sm font-semibold text-[#18352a] transition-colors hover:bg-[#d7e6c9]">Lihat pengiriman <ArrowRight className="size-4" /></Link>
                        </section>

                        <section className="col-span-12 flex flex-col rounded-xl border border-[#2f6848]/15 bg-white p-5 shadow-sm lg:col-span-4">
                            <div className="mb-5 flex items-center justify-between gap-2"><h2 className="font-['Manrope'] text-lg font-semibold text-[#022016]">Ringkasan Kontrak</h2><span className="flex items-center gap-1 rounded-full bg-[#d7e6c9] px-3 py-1 text-xs font-semibold text-[#356e4d]"><span className="size-1.5 rounded-full bg-[#306949]" />Aktif</span></div>
                            <div className="flex-1 space-y-4 text-sm"><div><p className="mb-1 text-xs text-[#727974]">Kapasitas Ideal</p><strong className="font-['Manrope'] text-xl text-[#022016]">200 <span className="text-sm font-normal text-[#727974]">kg/minggu</span></strong></div><div className="grid grid-cols-2 gap-4 border-t border-[#2f6848]/15 pt-4"><div><p className="mb-1 text-xs text-[#727974]">Frekuensi</p><strong>Mingguan</strong></div><div><p className="mb-1 text-xs text-[#727974]">Preferensi</p><strong>Tidak Layak → Kompos</strong></div></div></div>
                            <Link href="/partner/contract" className="mt-5 flex min-h-11 items-center justify-center rounded-lg bg-[#022016] text-sm font-semibold text-white transition-colors hover:bg-[#18352a]">Lihat kontrak</Link>
                        </section>
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}
