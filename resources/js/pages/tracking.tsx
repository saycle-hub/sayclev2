import { GradeBadge } from '@/components/grade-badge';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Clock, Copy, KeyRound, MapPin, RefreshCw, Scale, Search, Truck, User } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Lot = { grade: string; kg: number };

type PickupInfo = {
    status: string;
    vehicle_name?: string | null;
    officer_name?: string | null;
    actual_total_kg?: number | null;
    completed_at?: string | null;
    lots?: Lot[];
};

type Sale = {
    public_id: string;
    contact_name?: string | null;
    address?: string | null;
    status: string;
    estimate_kg: number | null;
    created_at?: string | null;
    pickup?: PickupInfo | null;
};

const STATUS_CONFIG: Record<string, { label: string; text: string; color: string; step: number }> = {
    submitted: {
        label: 'Laporan Terkirim',
        text: 'Laporan Anda telah berhasil terkirim dan menunggu peninjauan oleh tim admin Saycle.',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        step: 1,
    },
    under_review: {
        label: 'Sedang Ditinjau Admin',
        text: 'Laporan Anda sedang dalam proses peninjauan data dan kelayakan titik lokasi.',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        step: 1,
    },
    accepted: {
        label: 'Diterima Admin',
        text: 'Laporan Anda telah disetujui admin dan siap dimasukkan ke dalam rute penjemputan armada.',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        step: 2,
    },
    pickup_scheduled: {
        label: 'Pickup Dijadwalkan',
        text: 'Rute telah dioptimasi. Armada dan petugas driver telah ditugaskan menuju lokasi Anda.',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        step: 3,
    },
    picked_up: {
        label: 'Sudah Dijemput & Ditimbang',
        text: 'Limbah telah dijemput dan ditimbang langsung oleh petugas kami di lokasi.',
        color: 'bg-[#18352a]/10 text-[#18352a] border-[#18352a]/30',
        step: 4,
    },
    closed: {
        label: 'Selesai',
        text: 'Proses penjemputan, penimbangan, dan pencatatan ledger telah selesai sepenuhnya.',
        color: 'bg-green-100 text-green-800 border-green-300',
        step: 5,
    },
    supplier_rejected: {
        label: 'Dibatalkan / Ditolak Pemasok',
        text: 'Proses penjemputan dibatalkan atau ditolak di lokasi penjemputan.',
        color: 'bg-red-50 text-red-700 border-red-200',
        step: 0,
    },
    rejected: {
        label: 'Ditolak Admin',
        text: 'Mohon maaf, laporan Anda belum dapat diproses oleh admin Saycle saat ini.',
        color: 'bg-red-50 text-red-700 border-red-200',
        step: 0,
    },
};

const STEPS = [
    { title: 'Terkirim', key: 'submitted' },
    { title: 'Diterima Admin', key: 'accepted' },
    { title: 'Pickup Dijadwalkan', key: 'pickup_scheduled' },
    { title: 'Sudah Dijemput', key: 'picked_up' },
    { title: 'Selesai', key: 'closed' },
];

export default function Tracking({ sale }: { sale?: Sale }) {
    const form = useForm({ public_id: '', pin: '' });
    const [copied, setCopied] = useState(false);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.setData({
            public_id: form.data.public_id.trim(),
            pin: form.data.pin.trim(),
        });
        form.post(route('tracking.show'), {
            preserveScroll: true,
        });
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const config = sale ? (STATUS_CONFIG[sale.status] || {
        label: sale.status,
        text: 'Status laporan sedang diperbarui oleh sistem.',
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        step: 1,
    }) : null;

    return (
        <>
            <Head title="Lacak Pickup — SayCle" />
            <main className="grid min-h-screen place-items-center bg-[#F2F7F3] px-4 py-8 text-[#18352a]">
                <section className="w-full max-w-xl">
                    <div className="text-center mb-6">
                        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#e88c12]">SayCle · Tracking Aman</p>
                        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#18352a]">Lacak Laporan Limbah</h1>
                    </div>

                    {sale && config ? (
                        <div className="space-y-6 rounded-3xl bg-white p-6 md:p-8 shadow-xl border border-[#8FB996]/30">
                            {/* Header Status Badge */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#8FB996]/20 pb-5">
                                <div>
                                    <span className="text-xs font-semibold text-[#18352a]/60">Status Laporan</span>
                                    <div className={`mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.color}`}>
                                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                                        {config.label}
                                    </div>
                                </div>
                                {sale.created_at && (
                                    <div className="text-xs text-[#18352a]/70 flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        {new Date(sale.created_at).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </div>
                                )}
                            </div>

                            <p className="text-sm text-[#18352a]/80 bg-[#F2F7F3] p-4 rounded-2xl border border-[#8FB996]/20 leading-relaxed">
                                {config.text}
                            </p>

                            {/* Timeline Stepper */}
                            {config.step > 0 && (
                                <div className="py-2">
                                    <span className="text-xs font-bold text-[#18352a] block mb-3">Progress Laporan:</span>
                                    <div className="grid grid-cols-5 gap-1.5 text-center">
                                        {STEPS.map((s, idx) => {
                                            const stepNum = idx + 1;
                                            const isActive = config.step >= stepNum;
                                            return (
                                                <div key={s.key} className="space-y-1">
                                                    <div
                                                        className={`h-2 rounded-full transition-all ${
                                                            isActive ? 'bg-[#2f6848]' : 'bg-[#8FB996]/30'
                                                        }`}
                                                    />
                                                    <span className={`text-[10px] block line-clamp-1 ${isActive ? 'font-bold text-[#18352a]' : 'text-[#18352a]/50'}`}>
                                                        {s.title}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Details Grid */}
                            <dl className="grid gap-3 border-t border-[#8FB996]/20 pt-5 text-sm">
                                <div className="flex justify-between items-center py-1">
                                    <dt className="text-[#18352a]/70">Sale ID</dt>
                                    <dd className="flex items-center gap-1.5 font-mono font-bold text-[#18352a]">
                                        <span className="break-all text-xs bg-[#F2F7F3] px-2 py-0.5 rounded border border-[#8FB996]/30">{sale.public_id}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(sale.public_id)}
                                            className="text-[#2f6848] hover:text-[#e88c12] p-1"
                                            title="Salin Sale ID"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </dd>
                                </div>

                                {sale.contact_name && (
                                    <div className="flex justify-between py-1 border-t border-[#8FB996]/15">
                                        <dt className="text-[#18352a]/70">Nama Pemasok</dt>
                                        <dd className="font-semibold text-[#18352a]">{sale.contact_name}</dd>
                                    </div>
                                )}

                                {sale.address && (
                                    <div className="py-1 border-t border-[#8FB996]/15">
                                        <dt className="text-[#18352a]/70 flex items-center gap-1 mb-0.5">
                                            <MapPin className="h-3.5 w-3.5 text-[#e88c12]" /> Alamat Penjemputan
                                        </dt>
                                        <dd className="font-medium text-xs text-[#18352a]">{sale.address}</dd>
                                    </div>
                                )}

                                <div className="flex justify-between py-1 border-t border-[#8FB996]/15">
                                    <dt className="text-[#18352a]/70">Perkiraan Berat Laporan</dt>
                                    <dd className="font-bold text-[#18352a]">{sale.estimate_kg ?? '—'} kg</dd>
                                </div>

                                {/* Officer & Vehicle Info if assigned */}
                                {sale.pickup && (sale.pickup.officer_name || sale.pickup.vehicle_name) && (
                                    <div className="rounded-2xl bg-[#F2F7F3] p-4 border border-[#8FB996]/30 space-y-2 mt-2">
                                        <span className="text-xs font-bold text-[#18352a] block">Petugas Penjemputan:</span>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {sale.pickup.officer_name && (
                                                <div className="flex items-center gap-1.5 font-semibold text-[#18352a]">
                                                    <User className="h-4 w-4 text-[#2f6848]" />
                                                    <span>Driver: {sale.pickup.officer_name}</span>
                                                </div>
                                            )}
                                            {sale.pickup.vehicle_name && (
                                                <div className="flex items-center gap-1.5 font-semibold text-[#18352a]">
                                                    <Truck className="h-4 w-4 text-[#2f6848]" />
                                                    <span>Armada: {sale.pickup.vehicle_name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Actual Weight & Classification Lots if picked up */}
                                {sale.pickup && sale.pickup.actual_total_kg !== null && sale.pickup.actual_total_kg !== undefined && (
                                    <div className="rounded-2xl bg-[#2f6848]/10 p-4 border border-[#2f6848]/30 space-y-2 mt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-[#18352a] flex items-center gap-1.5">
                                                <Scale className="h-4 w-4 text-[#2f6848]" /> Hasil Penimbangan Aktual
                                            </span>
                                            <span className="text-lg font-extrabold text-[#2f6848]">
                                                {sale.pickup.actual_total_kg} kg
                                            </span>
                                        </div>

                                        {sale.pickup.lots && sale.pickup.lots.length > 0 && (
                                            <div className="pt-2 border-t border-[#8FB996]/30 space-y-1.5">
                                                <span className="text-[11px] font-semibold text-[#18352a]/70 block">Rincian Per Grade:</span>
                                                <div className="grid gap-1.5">
                                                    {sale.pickup.lots.map((lot, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-xs bg-white px-3 py-1.5 rounded-xl border border-[#8FB996]/20">
                                                            <GradeBadge grade={lot.grade} />
                                                            <span className="font-bold text-[#18352a]">{lot.kg} kg</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </dl>

                            {copied && (
                                <div role="status" className="text-center text-xs text-emerald-700 bg-emerald-50 py-1.5 rounded-xl">
                                    Sale ID berhasil disalin!
                                </div>
                            )}

                            <div className="pt-2 flex justify-center">
                                <Link
                                    href="/tracking"
                                    className="inline-flex items-center gap-2 text-xs font-bold text-[#2f6848] hover:underline"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Cari Laporan Lain
                                </Link>
                            </div>
                        </div>
                    ) : (
                        /* Input Form State */
                        <>
                            <p className="mt-2 text-center text-sm leading-relaxed text-[#18352a]/75">
                                Masukkan Sale ID dan PIN laporan Anda untuk mengecek progres penjemputan.
                            </p>

                            <form onSubmit={submit} className="mt-6 space-y-5 rounded-3xl bg-white p-7 shadow-xl shadow-[#18352a]/10 border border-[#8FB996]/30">
                                {(form.errors.public_id || form.errors.pin) && (
                                    <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-red-300 bg-red-50 p-4 text-xs text-red-700">
                                        <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold">Lacak Status Gagal</p>
                                            <p className="mt-0.5">{form.errors.public_id || form.errors.pin}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-[#18352a]">
                                        Sale ID Laporan
                                    </label>
                                    <input
                                        required
                                        placeholder="Contoh: CGIUSEaEVI5HxaFLcXTml96Pi8WvQ9rd"
                                        className="min-h-12 w-full rounded-2xl border border-[#8FB996]/40 bg-white px-4 text-xs font-mono text-[#18352a] focus:border-[#2f6848] focus:ring-[#2f6848]/20"
                                        value={form.data.public_id}
                                        onChange={(e) => form.setData('public_id', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-[#18352a] flex items-center gap-1.5">
                                        <KeyRound size={15} className="text-[#e88c12]" />
                                        PIN Rahasia
                                    </label>
                                    <input
                                        required
                                        inputMode="numeric"
                                        placeholder="6 angka PIN"
                                        maxLength={6}
                                        className="min-h-12 w-full rounded-2xl border border-[#8FB996]/40 bg-white px-4 text-sm font-mono tracking-[.25em] text-[#18352a] focus:border-[#2f6848] focus:ring-[#2f6848]/20"
                                        value={form.data.pin}
                                        onChange={(e) => form.setData('pin', e.target.value)}
                                    />
                                </div>

                                <button
                                    disabled={form.processing}
                                    type="submit"
                                    className="flex min-h-12 w-full items-center justify-center rounded-full bg-[#e88c12] font-bold text-white shadow-md hover:bg-[#d47e0f] transition-all disabled:opacity-60"
                                >
                                    {form.processing ? (
                                        'Memeriksa...'
                                    ) : (
                                        <>
                                            <Search size={18} className="mr-2" />
                                            Lihat status
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </section>
            </main>
        </>
    );
}
