import { ContractSummary } from '@/components/partner/ContractSummary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, Clock, Layers, Wallet } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Beranda', href: '/partner' },
];

interface PartnerSummary {
    id: number;
    name: string;
    grade_preference: string | null;
    frequency: string;
}

interface Stats {
    pending: number;
    done: number;
    allocated_kg: number;
    billing: number;
}

interface OverviewContract {
    status: 'active' | 'paused' | 'cancelled';
    grade: string;
    min_capacity_kg: number;
    ideal_capacity_kg: number;
    max_capacity_kg: number;
    frequency: string;
    buy_price: number;
    receiving_days: string[];
}

interface Props {
    partner: PartnerSummary | null;
    stats: Stats | null;
    contract: OverviewContract | null;
    allocations?: AllocationRow[];
}

interface AllocationRow {
    grade: string;
    allocated_kg: number;
    allocation_type: string;
    status: string;
}

export default function PartnerOverview({ partner, stats, contract, allocations = [] }: Props) {
    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            title={partner ? `Selamat datang, ${partner.name}` : 'Dasbor Mitra'}
            description="Portal mitra SayCle — Ringkasan alokasi, pengiriman, dan tagihan."
        >
            <Head title="Dasbor Mitra" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">

                <section aria-label="Ringkasan" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatusCard icon={Clock} label="Pengiriman menunggu" value={stats?.pending ?? 0} />
                    <StatusCard icon={CheckCircle2} label="Pengiriman selesai" value={stats?.done ?? 0} />
                    <StatusCard icon={Layers} label="Alokasi minggu ini" value={stats?.allocated_kg ?? 0} unit="kg" />
                    <StatusCard icon={Wallet} label="Tagihan total" value={stats?.billing ?? 0} unit="IDR" isCurrency />
                </section>

                {allocations.length > 0 && (
                    <section aria-label="Alokasi minggu ini" className="grid gap-4 lg:grid-cols-2">
                        <Card className="rounded-2xl border-[#2f6848]/15 bg-white shadow-none">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold">Alokasi minggu ini</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="divide-y divide-[#18352a]/5 text-sm">
                                    {allocations.map((a, i) => (
                                        <li key={i} className="flex items-center justify-between py-2">
                                            <span className="font-medium text-[#18352a]">{a.grade}</span>
                                            <span className="text-[#18352a]/70">
                                                {a.allocated_kg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
                                                <span className="ml-2 text-xs uppercase tracking-wider text-[#18352a]/50">{a.allocation_type}</span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </section>
                )}

                <section aria-label="Kontrak aktif" className="grid gap-4 lg:grid-cols-2">
                    {contract ? (
                        <ContractSummary
                            status={contract.status}
                            grade={contract.grade}
                            minCapacityKg={contract.min_capacity_kg}
                            idealCapacityKg={contract.ideal_capacity_kg}
                            maxCapacityKg={contract.max_capacity_kg}
                            frequency={contract.frequency}
                            buyPrice={contract.buy_price}
                        />
                    ) : (
                        <Card className="rounded-2xl border-dashed border-[#2f6848]/30 bg-transparent shadow-none">
                            <CardContent className="p-6 text-sm text-[#18352a]/70">
                                Belum ada kontrak aktif. Hubungi admin SayCle untuk pengaturan kontrak.
                            </CardContent>
                        </Card>
                    )}

                    <Card className="rounded-2xl border-0 bg-[#415D43] text-white shadow-[0_2px_8px_rgba(17,29,19,0.08)]">
                        <CardHeader className="pb-2 border-b border-white/15 bg-black/10 rounded-t-2xl">
                            <CardTitle className="text-base font-semibold text-white">Aksi cepat</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 sm:flex-row lg:flex-col pt-4">
                            <Button asChild className="min-h-11 bg-white text-[#415D43] font-semibold hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none">
                                <Link href="/partner/deliveries">Lihat pengiriman</Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="min-h-11 border-white/40 bg-white/10 text-white hover:bg-white hover:text-[#415D43] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                            >
                                <Link href="/partner/billing">Cek tagihan</Link>
                            </Button>
                        </CardContent>
                        <p className="px-6 pb-6 text-sm text-[#A1CCA5]">
                            Tinjau status setoran terbaru dan rincian tagihan Anda.
                        </p>
                        {partner?.grade_preference && (
                            <Badge className="mx-6 mb-6 bg-white/15 text-white">{partner.grade_preference}</Badge>
                        )}
                    </Card>
                </section>
            </div>
        </AppLayout>
    );
}

function StatusCard({ icon: Icon, label, value, unit, isCurrency = false }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number;
    unit?: string;
    isCurrency?: boolean;
}) {
    const formatted = isCurrency
        ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
        : value.toLocaleString('id-ID', { maximumFractionDigits: 1 });

    return (
        <Card className="rounded-2xl border border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]">
            <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A1CCA5]/30 text-[#415D43]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#111D13]/70">{label}</p>
                    <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-[#111D13] tabular-nums">
                        {formatted}
                        {unit && !isCurrency ? ` ${unit}` : ''}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
