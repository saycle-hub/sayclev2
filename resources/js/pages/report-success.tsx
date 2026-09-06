import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Check, CheckCircle2, Copy, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

type Props = {
    sale: {
        public_id: string;
        pin: string;
    };
};

const copyToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fallback if clipboard API throws permission error
        }
    }

    // Robust fallback for HTTP / non-secure contexts / mobile webviews
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
    } catch {
        return false;
    }
};

export default function ReportSuccess({ sale }: Props) {
    const [copiedKey, setCopiedKey] = useState<string>('');

    const handleCopy = async (value: string, key: string) => {
        const success = await copyToClipboard(value);
        if (success) {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(''), 2500);
        }
    };

    const handleCopyAll = async () => {
        const allText = `Sale ID: ${sale.public_id}\nPIN: ${sale.pin}`;
        const success = await copyToClipboard(allText);
        if (success) {
            setCopiedKey('all');
            setTimeout(() => setCopiedKey(''), 2500);
        }
    };

    const trackingUrl = `/tracking/show?public_id=${encodeURIComponent(sale.public_id)}&pin=${encodeURIComponent(sale.pin)}`;

    return (
        <>
            <Head title="Laporan Tersimpan — SayCle" />
            <main className="grid min-h-screen place-items-center bg-[#F2F7F3] px-4 py-8 text-[#18352a]">
                <section className="w-full max-w-lg rounded-3xl bg-white p-7 md:p-10 shadow-xl border border-[#8FB996]/30">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-[#2f6848]/10 text-[#2f6848] mb-6">
                        <CheckCircle2 size={32} />
                    </div>

                    <p className="text-xs font-bold uppercase tracking-[.2em] text-[#e88c12]">Laporan Tersimpan</p>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#18352a]">Simpan Akses Pickup.</h1>
                    <p className="mt-3 text-sm leading-relaxed text-[#18352a]/75">
                        Simpan Sale ID dan PIN sekarang. Keduanya diperlukan untuk melacak status laporan Anda; PIN ini hanya ditampilkan sekali.
                    </p>

                    {/* Access Details Card */}
                    <div className="mt-7 space-y-4 rounded-2xl bg-[#F2F7F3] p-5 border border-[#8FB996]/30">
                        {/* Sale ID Row */}
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#18352a]/60">SALE ID</span>
                            <div className="mt-1 flex items-center justify-between gap-3">
                                <strong className="break-all font-mono text-lg md:text-xl font-bold text-[#18352a]">
                                    {sale.public_id}
                                </strong>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(sale.public_id, 'id')}
                                    className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-all border ${
                                        copiedKey === 'id'
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'border-[#18352a]/20 bg-white text-[#18352a] hover:bg-[#2f6848] hover:text-white'
                                    }`}
                                >
                                    {copiedKey === 'id' ? <Check size={14} /> : <Copy size={14} />}
                                    {copiedKey === 'id' ? 'Tersalin' : 'Salin'}
                                </button>
                            </div>
                        </div>

                        {/* PIN Row */}
                        <div className="pt-3 border-t border-[#8FB996]/20">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#18352a]/60">PIN RAHASIA</span>
                            <div className="mt-1 flex items-center justify-between gap-3">
                                <strong className="font-mono text-2xl tracking-[.25em] font-extrabold text-[#18352a]">
                                    {sale.pin}
                                </strong>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(sale.pin, 'pin')}
                                    className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-all border ${
                                        copiedKey === 'pin'
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'border-[#18352a]/20 bg-white text-[#18352a] hover:bg-[#2f6848] hover:text-white'
                                    }`}
                                >
                                    {copiedKey === 'pin' ? <Check size={14} /> : <Copy size={14} />}
                                    {copiedKey === 'pin' ? 'Tersalin' : 'Salin'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Copy All Shortcut */}
                    <div className="mt-3 flex justify-end">
                        <button
                            type="button"
                            onClick={handleCopyAll}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2f6848] hover:underline"
                        >
                            {copiedKey === 'all' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            {copiedKey === 'all' ? 'Tersalin Semua!' : 'Salin ID & PIN Sekaligus'}
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-7 flex flex-col sm:flex-row gap-3">
                        <Link
                            href={trackingUrl}
                            className="flex-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e88c12] px-6 text-sm font-bold text-white shadow-md hover:bg-[#d47e0f] transition-all"
                        >
                            Lacak Laporan Sekarang
                            <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#18352a]/60">
                        <ShieldCheck size={14} className="text-[#2f6848]" />
                        <span>Data tersimpan aman di server Saycle</span>
                    </div>
                </section>
            </main>
        </>
    );
}
