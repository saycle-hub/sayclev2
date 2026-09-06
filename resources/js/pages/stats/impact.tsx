import { ImpactDonut } from '@/components/stats/ImpactDonut';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Recycle } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: '/dashboard' },
    { title: 'Statistik', href: '/stats' },
    { title: 'Dampak', href: '/stats/impact' },
];

export interface ImpactRow {
    grade: string;
    tujuan: string;
    kg: number;
}

interface Props {
    impact: ImpactRow[];
    totalKg: number;
}

function formatKg(value: number): string {
    return value.toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

export default function StatsImpact({ impact, totalKg }: Props) {
    const hasData = impact.some((i) => i.kg > 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dampak" />
            <div className="flex h-full flex-1 flex-col gap-6 bg-white p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Dampak</h1>
                    <p className="mt-1 text-sm text-[#18352a]/70">
                        Sampah terolah per grade dan tujuan pengolahannya.
                    </p>
                </div>

                <ImpactDonut data={impact} totalKg={totalKg} />

                {/* Per-grade detail cards: grade → tujuan pengolahan. */}
                <section aria-label="Rincian dampak" className="grid gap-4 sm:grid-cols-3">
                    {impact.map((row) => (
                        <Card key={row.grade} className="rounded-2xl border-[#2f6848]/15 bg-white shadow-none">
                            <CardContent className="p-5">
                                <p className="flex items-center gap-2 text-sm font-medium text-[#18352a]/70">
                                    <Recycle className="h-4 w-4 text-[#2f6848]" aria-hidden="true" />
                                    {row.grade} → {row.tujuan}
                                </p>
                                <p className="mt-2 text-2xl font-semibold tracking-tight text-[#18352a] tabular-nums">
                                    {formatKg(row.kg)} kg
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </section>

                {!hasData && (
                    <Card className="rounded-2xl border-dashed border-[#2f6848]/30 bg-transparent shadow-none">
                        <CardContent className="p-8 text-center text-sm text-[#18352a]/70">
                            Belum ada data pengolahan. Angka muncul setelah petugas menyelesaikan penimbangan.
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
