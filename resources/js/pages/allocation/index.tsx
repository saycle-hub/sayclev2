import { AllocationBar } from '@/components/allocation-bar';
import { GradeBadge } from '@/components/grade-badge';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Layers, Play } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Alokasi', href: '/allocation' },
];

interface OverviewRow {
    grade: string;
    stock_kg: number;
    demand_kg: number;
    ideal_kg: number;
    maximum_kg: number;
    allocated_kg: number;
    held_kg: number;
    status: string;
}

const statusStyles: Record<string, string> = {
    Defisit: 'border-transparent bg-[#6b4f2e]/10 text-[#6b4f2e]',
    Normal: 'border-transparent bg-[#2f6848]/10 text-[#2f6848]',
    Surplus: 'border-transparent bg-[#e88c12]/15 text-[#18352a]',
    'Surplus ditahan': 'border-transparent bg-[#e88c12]/15 text-[#18352a]',
    'Belum dijalankan': 'border-transparent bg-[#18352a]/10 text-[#18352a]',
    'Tanpa kontrak': 'border-transparent bg-[#18352a]/10 text-[#18352a]',
};

function formatKg(value: number): string {
    return `${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg`;
}

export default function AllocationIndex({ hasRun, overview, heldGrades = 0 }: { weekStart?: string; hasRun: boolean; overview: OverviewRow[]; heldGrades?: number }) {
    const form = useForm({});

    const run = () => {
        form.post(route('allocation.run'), { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Alokasi mingguan" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-[#f4f3ed] p-4 md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Alokasi mingguan</h1>
                        <p className="mt-1 text-sm text-[#18352a]/70">
                            Distribusi stok gudang ke mitra sesuai kontrak: minimum, ideal, lalu surplus.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={run}
                        disabled={form.processing}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#e88c12] px-5 font-semibold text-[#18352a] hover:bg-[#f6b33c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88c12] disabled:opacity-60"
                    >
                        <Play size={16} aria-hidden="true" />
                        {form.processing ? 'Menjalankan…' : 'Jalankan alokasi'}
                    </button>
                </div>

                {heldGrades > 0 && (
                    <div role="status" className="rounded-xl border border-[#e88c12]/40 bg-[#e88c12]/10 p-4 text-sm text-[#18352a]">
                        Ada surplus melebihi kapasitas semua mitra dan ditahan di gudang (tetap tercatat per grade, menunggu arahan tujuan).
                    </div>
                )}

                {hasRun ? (
                    <div className="grid gap-4 lg:grid-cols-3">
                        {overview.map((row) => (
                            <Link
                                key={row.grade}
                                href={route('allocation.show', row.grade)}
                                className="rounded-2xl border border-[#2f6848]/15 bg-white p-5 transition hover:border-[#2f6848]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88c12]"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <GradeBadge grade={row.grade} />
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[row.status] ?? statusStyles['Belum dijalankan']}`}>
                                        {row.status}
                                    </span>
                                </div>
                                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <dt className="text-[#18352a]/70">Stok gudang</dt>
                                        <dd className="font-semibold text-[#18352a] tabular-nums">{formatKg(row.stock_kg)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[#18352a]/70">Total minimum</dt>
                                        <dd className="font-semibold text-[#18352a] tabular-nums">{formatKg(row.demand_kg)}</dd>
                                    </div>
                                    {row.held_kg > 0 && (
                                        <div className="col-span-2 rounded-lg bg-[#e88c12]/10 px-3 py-2">
                                            <dt className="text-[#18352a]/70">Ditahan di gudang</dt>
                                            <dd className="font-semibold text-[#18352a] tabular-nums">{formatKg(row.held_kg)}</dd>
                                        </div>
                                    )}
                                </dl>
                                <div className="mt-4">
                                    {/* Aggregate contract scale: min/ideal/max across active contracts of this grade. */}
                                    <AllocationBar
                                        allocated={row.allocated_kg}
                                        minimum={row.demand_kg}
                                        ideal={row.ideal_kg}
                                        maximum={row.maximum_kg}
                                    />
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2f6848]/25 bg-white py-16 text-center">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#d7e6c9]">
                            <Layers size={20} />
                        </div>
                        <h2 className="mt-4 text-lg font-semibold text-[#18352a]">Belum ada alokasi minggu ini</h2>
                        <p className="mt-1 max-w-md text-sm text-[#18352a]/70">
                            Jalankan alokasi untuk membagi stok gudang ke mitra berdasarkan kontrak aktif.
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
