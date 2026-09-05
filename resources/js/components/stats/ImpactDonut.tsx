import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ImpactSlice {
    grade: string;
    tujuan: string;
    kg: number;
}

interface ImpactDonutProps {
    data: ImpactSlice[];
    totalKg: number;
    className?: string;
}

/** Design-system series colors: green, orange, brown — matching GradeBadge. */
export const IMPACT_COLORS: Record<string, string> = {
    Layak: '#2f6848',
    'Kurang Layak': '#e88c12',
    'Tidak Layak': '#6b4f2e',
};

function formatKg(v: number): string {
    return v.toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

/**
 * Per-grade impact donut rendered as pure SVG (no chart lib needed for
 * a static breakdown). Center shows the total kg terolah.
 */
export function ImpactDonut({ data, totalKg, className }: ImpactDonutProps) {
    const total = data.reduce((sum, d) => sum + d.kg, 0);
    const radius = 70;
    const circumference = 2 * Math.PI * radius;

    let offset = 0;
    const arcs = data
        .filter((d) => d.kg > 0)
        .map((d) => {
            const fraction = total > 0 ? d.kg / total : 0;
            const arc = {
                ...d,
                color: IMPACT_COLORS[d.grade] ?? '#18352a',
                dash: fraction * circumference,
                offset,
                pct: Math.round(fraction * 100),
            };
            offset += fraction * circumference;
            return arc;
        });

    return (
        <Card className={cn('rounded-2xl border-[#2f6848]/15 bg-white shadow-none', className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-[#18352a]">Komposisi sampah terolah</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                <svg
                    viewBox="0 0 200 200"
                    className="h-44 w-44 shrink-0"
                    role="img"
                    aria-label="Diagram komposisi sampah terolah per grade"
                >
                    <circle cx="100" cy="100" r={radius} fill="none" stroke="#f4f3ed" strokeWidth="24" />
                    {arcs.map((a) => (
                        <circle
                            key={a.grade}
                            cx="100"
                            cy="100"
                            r={radius}
                            fill="none"
                            stroke={a.color}
                            strokeWidth="24"
                            strokeDasharray={`${a.dash} ${circumference - a.dash}`}
                            strokeDashoffset={-a.offset}
                            transform="rotate(-90 100 100)"
                        />
                    ))}
                    <text x="100" y="94" textAnchor="middle" className="fill-[#18352a]" fontSize="22" fontWeight="600">
                        {formatKg(totalKg)}
                    </text>
                    <text x="100" y="116" textAnchor="middle" fill="rgba(24, 53, 42, 0.7)" fontSize="11">
                        kg terolah
                    </text>
                </svg>

                <ul className="w-full space-y-2">
                    {data.map((d) => (
                        <li key={d.grade} className="flex items-center justify-between gap-3 text-sm">
                            <span className="flex min-w-0 items-center gap-2">
                                <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: IMPACT_COLORS[d.grade] ?? '#18352a' }}
                                    aria-hidden="true"
                                />
                                <span className="truncate font-medium text-[#18352a]">{d.grade}</span>
                                <span className="truncate text-xs text-[#18352a]/70">→ {d.tujuan}</span>
                            </span>
                            <span className="shrink-0 font-semibold text-[#18352a] tabular-nums">
                                {formatKg(d.kg)} kg
                            </span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
