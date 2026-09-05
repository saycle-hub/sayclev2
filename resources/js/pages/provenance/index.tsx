import { Card } from '@/components/ui/card';
import { Head } from '@inertiajs/react';

type ProvenanceRow = {
    supplier_id: number;
    supplier: string | null;
    pickup_id: number;
    pickup_status: string;
    grade: string;
    intended_use: string;
    kg: number;
    officer: string | null;
    checked_in_at: string | null;
    evidence: string | null;
};

export default function ProvenanceIndex({ rows }: { rows: ProvenanceRow[] }) {
    const total = rows.reduce((sum, row) => sum + row.kg, 0);

    return (
        <>
            <Head title="Provenance Pasokan" />
            <div className="p-6">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold tracking-tight text-[#18352a]">Provenance Pasokan</h1>
                        <p className="mt-1 text-sm text-[#18352a]/70">Jejak kg per pemasok, grade, pickup, lot, officer, dan bukti.</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <Card className="p-4"><p className="text-xs uppercase tracking-wider text-[#18352a]/50">Total masuk</p><p className="mt-2 text-2xl font-semibold text-[#18352a]">{total.toLocaleString('id-ID')} kg</p></Card>
                        <Card className="p-4"><p className="text-xs uppercase tracking-wider text-[#18352a]/50">Baris lot</p><p className="mt-2 text-2xl font-semibold text-[#18352a]">{rows.length}</p></Card>
                        <Card className="p-4"><p className="text-xs uppercase tracking-wider text-[#18352a]/50">Sumber pickup</p><p className="mt-2 text-2xl font-semibold text-[#18352a]">{new Set(rows.map((row) => row.pickup_id)).size}</p></Card>
                    </div>

                    <Card className="mt-5 overflow-x-auto p-4">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#18352a]/10 text-left text-xs uppercase tracking-wider text-[#18352a]/50">
                                    <th className="py-3 pr-4">Pemasok</th>
                                    <th className="py-3 pr-4">Pickup</th>
                                    <th className="py-3 pr-4">Grade</th>
                                    <th className="py-3 pr-4">Kg</th>
                                    <th className="py-3 pr-4">Petugas</th>
                                    <th className="py-3 pr-4">Bukti</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr><td colSpan={6} className="py-8 text-center text-[#18352a]/60">Belum ada lot klasifikasi.</td></tr>
                                ) : rows.map((row, index) => (
                                    <tr key={`${row.pickup_id}-${row.grade}-${index}`} className="border-b border-[#18352a]/5 last:border-0">
                                        <td className="py-3 pr-4 font-medium text-[#18352a]">{row.supplier ?? `#${row.supplier_id}`}</td>
                                        <td className="py-3 pr-4">#{row.pickup_id}<span className="block text-xs text-[#18352a]/50">{row.pickup_status.replace('_', ' ')}</span></td>
                                        <td className="py-3 pr-4">{row.grade}<span className="block text-xs text-[#18352a]/50">{row.intended_use}</span></td>
                                        <td className="py-3 pr-4 font-semibold">{row.kg.toLocaleString('id-ID')}</td>
                                        <td className="py-3 pr-4">{row.officer ?? '—'}<span className="block text-xs text-[#18352a]/50">{row.checked_in_at ? new Date(row.checked_in_at).toLocaleString('id-ID') : '—'}</span></td>
                                        <td className="py-3 pr-4 text-xs break-all text-[#18352a]/60">
                                            {row.evidence ? (
                                                <a href={row.evidence} target="_blank" rel="noopener noreferrer" className="font-medium text-[#2f6848] underline underline-offset-2 hover:text-[#18352a]">Lihat foto</a>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
            </div>
        </>
    );
}
