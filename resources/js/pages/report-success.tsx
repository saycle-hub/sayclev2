import { Head, Link } from '@inertiajs/react';
import { Check, CheckCircle2, Copy } from 'lucide-react';
import { useState } from 'react';

type Props = { sale: { public_id: string; pin: string } };

export default function ReportSuccess({ sale }: Props) {
    const [copied, setCopied] = useState<string | null>(null);
    const copy = async (label: string, value: string) => { try { await navigator.clipboard.writeText(value); setCopied(label); } catch { setCopied(`${label}: ${value}`); } };
    return <><Head title="Laporan tersimpan — SayCle" /><main className="grid min-h-screen place-items-center bg-[#f4f3ed] px-5 text-[#18352a]"><section className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-xl shadow-[#18352a]/10 sm:p-12"><CheckCircle2 className="mb-6 text-[#2f6848]" size={48} /><p className="text-xs font-bold uppercase tracking-[.2em] text-[#e88c12]">Laporan tersimpan</p><h1 className="mt-3 text-4xl font-semibold tracking-[-.04em]">Simpan akses pickup.</h1><p className="mt-4 leading-7 text-[#18352a]/65">PIN ini hanya ditampilkan sekali. Simpan sebelum meninggalkan halaman.</p><div className="mt-8 grid gap-3 rounded-2xl bg-[#e7e8dc] p-5"><span className="text-xs uppercase tracking-widest text-[#18352a]/60">Sale ID</span><strong className="break-all text-2xl">{sale.public_id}</strong><span className="mt-3 text-xs uppercase tracking-widest text-[#18352a]/60">PIN</span><strong className="text-3xl tracking-[.2em]">{sale.pin}</strong></div><Link href={route('tracking.create')} className="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#e88c12] px-6 font-semibold">Lacak laporan</Link></section></main></>;
}
