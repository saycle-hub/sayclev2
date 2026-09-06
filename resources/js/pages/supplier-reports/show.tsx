import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, MapPin, MessageCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

type Report = {
    id: number;
    public_id: string;
    contact: string;
    estimated_kg: number;
    status: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
    updated_at: string;
    photo_url: string | null;
    wa_accepted_url?: string | null;
};

const labels: Record<string, string> = {
    submitted: 'Pesanan Masuk',
    under_review: 'Sedang Ditinjau',
    accepted: 'Pesanan Diterima',
    rejected: 'Ditolak',
    pickup_scheduled: 'Pickup Dijadwalkan',
    picked_up: 'Sudah Dijemput',
    closed: 'Selesai',
    'Pending review': 'Sedang Ditinjau',
};

export default function SupplierReportShow({ report }: { report: Report }) {
    const [processing, setProcessing] = useState(false);

    const action = (name: 'accept' | 'reject') => {
        const confirmText = name === 'accept' ? 'Terima laporan ini dan jadwalkan penjemputan?' : 'Tolak laporan ini?';
        if (window.confirm(confirmText)) {
            setProcessing(true);
            router.post(
                route(`supplier-reports.${name}`, report.id),
                {},
                {
                    onFinish: () => setProcessing(false),
                }
            );
        }
    };

    const coords = report.latitude !== null && report.longitude !== null;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dasbor', href: '/dashboard' },
        { title: 'Laporan Pemasok', href: '/supplier-reports' },
        { title: report.public_id, href: `/supplier-reports/${report.id}` },
    ];

    const canReview = ['submitted', 'under_review', 'Pending review'].includes(report.status);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Laporan ${report.public_id}`} />
            <main className="min-h-full bg-[#f9fafb] p-4 text-[#18352a] md:p-6">
                <Link
                    href="/supplier-reports"
                    className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#18352a] hover:underline"
                >
                    <ArrowLeft size={17} />
                    Kembali ke Laporan Pemasok
                </Link>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
                    <section className="rounded-2xl border border-[#18352a]/10 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-[#18352a]/60">
                                    ID Laporan Pemasok
                                </p>
                                <h1 className="mt-1 break-all text-2xl font-bold">{report.public_id}</h1>
                            </div>
                            <Badge variant="outline" className="border-[#2f6848]/20 bg-[#2f6848]/10 text-[#2f6848]">
                                {labels[report.status] ?? report.status}
                            </Badge>
                        </div>

                        {report.photo_url && (
                            <img
                                src={report.photo_url}
                                alt={`Foto material ${report.public_id}`}
                                className="mt-6 max-h-[28rem] w-full rounded-xl object-contain bg-gray-50 border border-gray-100 p-2"
                            />
                        )}

                        <dl className="mt-6 grid gap-4 border-t border-[#18352a]/10 pt-5 sm:grid-cols-2">
                            <Item label="Nama Kontak" value={report.contact} />
                            <Item label="Perkiraan Berat" value={`${report.estimated_kg.toLocaleString('id-ID')} kg`} />
                            <Item label="Tanggal Dibuat" value={new Date(report.created_at).toLocaleString('id-ID')} />
                            <Item label="Terakhir Diperbarui" value={new Date(report.updated_at).toLocaleString('id-ID')} />
                            <Item label="Alamat Pengiriman" value={report.address ?? 'Alamat tidak tersedia'} />
                        </dl>

                        {coords && (
                            <a
                                className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-[#2f6848] hover:underline"
                                target="_blank"
                                rel="noreferrer"
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                    `${report.latitude},${report.longitude}`
                                )}`}
                            >
                                <MapPin size={17} className="text-[#e88c12]" />
                                Buka Lokasi di Google Maps
                                <ExternalLink size={14} />
                            </a>
                        )}
                    </section>

                    <aside className="h-fit space-y-4 rounded-2xl border border-[#18352a]/10 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-[#18352a]">Tindakan Review Laporan</h2>
                        <p className="text-xs text-[#18352a]/70">
                            Periksa informasi foto dan berat material sebelum menyetujui penjemputan.
                        </p>

                        <div className="space-y-3 pt-2">
                            {canReview ? (
                                <>
                                    <button
                                        type="button"
                                        disabled={processing}
                                        onClick={() => action('accept')}
                                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2f6848] px-4 font-bold text-white shadow-sm transition-colors hover:bg-[#235137] disabled:opacity-50"
                                    >
                                        <CheckCircle2 size={18} />
                                        {processing ? 'Memproses...' : 'Terima Laporan'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={processing}
                                        onClick={() => action('reject')}
                                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <XCircle size={18} />
                                        {processing ? 'Memproses...' : 'Tolak Laporan'}
                                    </button>
                                </>
                            ) : (
                                <div className="rounded-xl bg-gray-50 p-3 text-center text-xs font-semibold text-[#18352a]/70 border border-gray-200">
                                    Status Laporan: <span className="text-[#2f6848]">{labels[report.status] ?? report.status}</span>
                                </div>
                            )}

                            {report.wa_accepted_url && (
                                <a
                                    href={report.wa_accepted_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-0 bg-[#25D366] px-4 font-semibold text-white shadow-sm transition-colors hover:bg-[#20bd5a]"
                                >
                                    <MessageCircle size={18} />
                                    Notifikasi WA Diterima
                                </a>
                            )}
                        </div>
                    </aside>
                </div>
            </main>
        </AppLayout>
    );
}

function Item({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-bold uppercase tracking-wider text-[#18352a]/55">{label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-[#18352a]">{value}</dd>
        </div>
    );
}
