import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ExternalLink, Inbox, CheckCircle2, Truck, MapPin, Calendar } from 'lucide-react';
import { useState } from 'react';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { Badge } from '@/components/ui/badge';
import { RouteMap } from '@/components/route-map';

type Report = {
    id: number;
    public_id: string;
    contact: string;
    phone?: string;
    estimated_kg: number;
    status: string;
    pickup_driver?: string | null;
    pickup_vehicle?: string | null;
    pickup_status?: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
    updated_at: string;
    photo_url: string | null;
};

interface Props {
    reports: Report[];
    activeTab: 'masuk' | 'diterima' | 'dijemput';
    counts: {
        masuk: number;
        diterima: number;
        dijemput: number;
    };
    selectedDate?: string;
}

const labels: Record<string, string> = {
    submitted: 'Pesanan Masuk',
    under_review: 'Sedang Ditinjau',
    'Pending review': 'Sedang Ditinjau',
    accepted: 'Pesanan Diterima',
    pickup_scheduled: 'Pickup Dijadwalkan',
    in_progress: 'Sedang Dijemput Driver',
    picked_up: 'Sudah Dijemput',
    closed: 'Selesai',
    rejected: 'Ditolak',
    supplier_rejected: 'Dibatalkan Pemasok',
};

function Status({ value, driver }: { value: string; driver?: string | null }) {
    let colorClass = 'border-[#2f6848]/20 bg-[#2f6848]/10 text-[#2f6848]';
    if (value === 'rejected' || value === 'supplier_rejected') {
        colorClass = 'border-red-200 bg-red-50 text-red-700';
    } else if (value === 'submitted' || value === 'under_review') {
        colorClass = 'border-amber-300 bg-amber-50 text-amber-800';
    } else if (value === 'accepted') {
        colorClass = 'border-blue-200 bg-blue-50 text-blue-800';
    } else if (value === 'pickup_scheduled') {
        colorClass = driver
            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-bold'
            : 'border-blue-300 bg-blue-50 text-blue-800 font-medium';
    } else if (value === 'in_progress') {
        colorClass = 'border-emerald-300 bg-emerald-50 text-emerald-800 font-bold';
    }

    let text = labels[value] ?? value;
    if (value === 'pickup_scheduled') {
        text = driver ? `Sedang Dijemput (Driver: ${driver})` : 'Dijadwalkan (Belum Ditugaskan Driver)';
    } else if (value === 'in_progress' && driver) {
        text = `Sedang Dijemput (Driver: ${driver})`;
    }

    return (
        <Badge variant="outline" className={colorClass}>
            {text}
        </Badge>
    );
}

export default function SupplierReportsIndex({ reports = [], activeTab = 'masuk', counts = { masuk: 0, diterima: 0, dijemput: 0 }, selectedDate }: Props) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;
    const totalPages = Math.ceil(reports.length / itemsPerPage);
    const paginatedReports = reports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dasbor', href: '/dashboard' },
        { title: 'Laporan Pemasok', href: '/supplier-reports' },
    ];

    const todayStr = new Date().toLocaleDateString('sv-SE');
    const isToday = selectedDate === todayStr;

    const goToToday = () => {
        setCurrentPage(1);
        router.get(route('supplier-reports.index'), { tab: activeTab, date: todayStr }, { preserveState: false });
    };

    const located = reports.filter((r) => r.latitude !== null && r.longitude !== null);
    const depot = located[0]
        ? { lat: located[0].latitude!, lng: located[0].longitude! }
        : { lat: -7.7970, lng: 110.3705 };

    const stops = located.map((r, index) => ({
        lat: r.latitude!,
        lng: r.longitude!,
        order: index + 1,
        label: `${r.contact} — ${r.estimated_kg} kg — ${labels[r.status] ?? r.status}`,
        color: activeTab === 'masuk' ? '#e88c12' : activeTab === 'diterima' ? '#2563eb' : '#2f6848',
    }));

    const switchTab = (tab: 'masuk' | 'diterima' | 'dijemput') => {
        setCurrentPage(1);
        router.get(route('supplier-reports.index'), { tab, date: selectedDate ?? 'all' }, { preserveState: false });
    };

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            title="Laporan Pemasok"
            description="Kelola dan tinjau laporan pesanan masuk, diterima, dan dijemput."
        >
            <Head title="Laporan Pemasok" />
            <main className="min-h-full p-4 text-[#18352a] md:p-6 space-y-6">
                {/* Date Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#8FB996]/35 bg-gradient-to-r from-[#F2F7F3] via-white to-[#F2F7F3] p-4.5 shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
                    <div className="flex items-center gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2f6848] text-white shadow-sm">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-[#111D13]">Filter Kalender Laporan</h3>
                                {isToday && (
                                    <span className="rounded-full bg-[#2f6848]/15 px-2.5 py-0.5 text-[11px] font-extrabold text-[#2f6848]">
                                        Hari Ini
                                    </span>
                                )}
                            </div>
                            <p className="mt-0.5 text-xs text-[#709775]">
                                {selectedDate && selectedDate !== 'all'
                                    ? `Menampilkan laporan per hari: ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                    : 'Menampilkan seluruh histori laporan (semua tanggal)'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                        <input
                            type="date"
                            value={selectedDate === 'all' ? '' : (selectedDate ?? '')}
                            onChange={(e) => {
                                const val = e.target.value;
                                router.get(route('supplier-reports.index'), { tab: activeTab, date: val || 'all' }, { preserveState: false });
                            }}
                            className="h-10 rounded-xl border border-[#709775]/40 bg-white px-3.5 py-2 text-sm font-semibold text-[#111D13] shadow-xs hover:border-[#2f6848] focus:border-[#2f6848] focus:ring-2 focus:ring-[#2f6848]/20 focus:outline-none transition-all cursor-pointer"
                        />

                        <button
                            type="button"
                            onClick={goToToday}
                            className="flex h-10 items-center gap-2 rounded-xl bg-[#2f6848] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#18352a] active:scale-[0.98] transition-all"
                        >
                            <Calendar className="h-4 w-4" />
                            Hari Ini
                        </button>

                        {selectedDate !== 'all' && (
                            <button
                                type="button"
                                onClick={() => router.get(route('supplier-reports.index'), { tab: activeTab, date: 'all' }, { preserveState: false })}
                                className="flex h-10 items-center gap-1.5 rounded-xl border border-[#709775]/30 bg-white px-3 text-xs font-semibold text-[#18352a]/80 hover:bg-gray-50 transition-all"
                            >
                                Semua Tanggal
                            </button>
                        )}
                    </div>
                </div>

                {/* 3 Status Category Filter Buttons */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <button
                        type="button"
                        onClick={() => switchTab('masuk')}
                        className={`flex items-center justify-between rounded-2xl p-4 text-left transition-all border shadow-sm ${
                            activeTab === 'masuk'
                                ? 'border-[#e88c12] bg-[#e88c12] text-white shadow-md'
                                : 'border-[#18352a]/10 bg-white text-[#18352a] hover:bg-gray-50'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${activeTab === 'masuk' ? 'bg-white/20 text-white' : 'bg-[#e88c12]/15 text-[#e88c12]'}`}>
                                <Inbox className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider opacity-80">Tahap 1</p>
                                <h2 className="text-base font-bold">Pesanan Masuk</h2>
                            </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${activeTab === 'masuk' ? 'bg-white text-[#e88c12]' : 'bg-[#e88c12]/15 text-[#e88c12]'}`}>
                            {counts.masuk}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => switchTab('diterima')}
                        className={`flex items-center justify-between rounded-2xl p-4 text-left transition-all border shadow-sm ${
                            activeTab === 'diterima'
                                ? 'border-[#2563eb] bg-[#2563eb] text-white shadow-md'
                                : 'border-[#18352a]/10 bg-white text-[#18352a] hover:bg-gray-50'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${activeTab === 'diterima' ? 'bg-white/20 text-white' : 'bg-[#2563eb]/15 text-[#2563eb]'}`}>
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider opacity-80">Tahap 2</p>
                                <h2 className="text-base font-bold">Pesanan Diterima</h2>
                            </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${activeTab === 'diterima' ? 'bg-white text-[#2563eb]' : 'bg-[#2563eb]/15 text-[#2563eb]'}`}>
                            {counts.diterima}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => switchTab('dijemput')}
                        className={`flex items-center justify-between rounded-2xl p-4 text-left transition-all border shadow-sm ${
                            activeTab === 'dijemput'
                                ? 'border-[#2f6848] bg-[#2f6848] text-white shadow-md'
                                : 'border-[#18352a]/10 bg-white text-[#18352a] hover:bg-gray-50'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${activeTab === 'dijemput' ? 'bg-white/20 text-white' : 'bg-[#2f6848]/15 text-[#2f6848]'}`}>
                                <Truck className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider opacity-80">Tahap 3</p>
                                <h2 className="text-base font-bold">Pesanan Dijemput</h2>
                            </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${activeTab === 'dijemput' ? 'bg-white text-[#2f6848]' : 'bg-[#2f6848]/15 text-[#2f6848]'}`}>
                            {counts.dijemput}
                        </span>
                    </button>
                </div>

                {/* Interactive Route Map for Selected Category */}
                {located.length > 0 && (
                    <section className="overflow-hidden rounded-2xl border border-[#18352a]/10 bg-white shadow-sm">
                        <div className="border-b border-[#2f6848]/10 px-5 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-[#18352a]">Peta Lokasi Laporan</h2>
                                <p className="mt-0.5 text-xs text-[#18352a]/70">
                                    Pilih titik di peta untuk melihat kontak & berat; klik tombol &quot;Buka&quot; untuk review laporan.
                                </p>
                            </div>
                            <span className="rounded-full bg-[#18352a]/10 px-3 py-1 text-xs font-bold text-[#18352a]">
                                {located.length} Titik Lokasi
                            </span>
                        </div>
                        <RouteMap depot={depot} stops={stops} lines={[]} className="h-[360px] w-full sm:h-[420px]" />
                    </section>
                )}

                {/* Reports List */}
                <div className="overflow-hidden rounded-2xl border border-[#18352a]/10 bg-white shadow-sm">
                    <div className="divide-y divide-[#18352a]/10">
                        {reports.length === 0 ? (
                            <div className="p-10 text-center">
                                <Inbox className="mx-auto h-10 w-10 text-[#18352a]/30" />
                                <p className="mt-2 text-sm font-medium text-[#18352a]/70">
                                    Tidak ada laporan pada kategori ini.
                                </p>
                            </div>
                        ) : (
                            paginatedReports.map((report) => (
                                <article key={report.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between hover:bg-gray-50/50 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <Link
                                                href={`/supplier-reports/${report.id}`}
                                                className="font-bold text-base text-[#18352a] underline-offset-4 hover:underline"
                                            >
                                                {report.public_id}
                                            </Link>
                                            <Status value={report.status} driver={report.pickup_driver} />
                                        </div>
                                        <p className="mt-1 text-sm text-[#18352a]/80">
                                            <strong className="text-[#18352a]">{report.contact}</strong> · <span className="tabular-nums font-semibold">{report.estimated_kg.toLocaleString('id-ID')} kg</span>
                                        </p>
                                        <p className="mt-1 flex items-start gap-1 text-sm text-[#18352a]/70">
                                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#e88c12]" />
                                            <span>{report.address ?? 'Alamat tidak tersedia'}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <small className="text-xs font-medium text-[#18352a]/60">
                                            {new Date(report.created_at).toLocaleString('id-ID')}
                                        </small>
                                        {report.latitude !== null && report.longitude !== null && (
                                            <a
                                                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-[#2f6848] transition-colors hover:bg-gray-50"
                                                target="_blank"
                                                rel="noreferrer"
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                    `${report.latitude},${report.longitude}`
                                                )}`}
                                            >
                                                <MapPin className="h-4 w-4 text-[#e88c12]" />
                                                <span>Peta</span>
                                                <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                                            </a>
                                        )}
                                        <Link
                                            href={`/supplier-reports/${report.id}`}
                                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#e88c12] px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#d17a0a]"
                                        >
                                            Buka
                                        </Link>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                    <PaginationBar
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={reports.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </main>
        </AppLayout>
    );
}
