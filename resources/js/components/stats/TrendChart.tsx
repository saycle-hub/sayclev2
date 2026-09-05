import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface TrendPoint {
    week_start: string;
    kg: number;
    pendapatan: number;
}

interface TrendChartProps {
    data: TrendPoint[];
    /** Which series to plot. */
    metric: 'kg' | 'pendapatan';
    className?: string;
}

const AXIS_STYLE = { fontSize: 11, fill: 'rgba(24, 53, 42, 0.7)' };

function weekLabel(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatValue(v: number, metric: 'kg' | 'pendapatan'): string {
    return metric === 'kg'
        ? `${v.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg`
        : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
}

/**
 * Weekly trend area chart (recharts) in design-system colors:
 * ink line, green fill. Minimal axes, no legend clutter.
 */
export function TrendChart({ data, metric, className }: TrendChartProps) {
    return (
        <Card className={cn('rounded-2xl border-[#2f6848]/15 bg-white shadow-none', className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-[#18352a]">
                    {metric === 'kg' ? 'Tren kg terolah' : 'Tren pendapatan'}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-64 w-full" role="img" aria-label={metric === 'kg' ? 'Grafik tren kilogram terolah per minggu' : 'Grafik tren pendapatan per minggu'}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#2f6848" stopOpacity={0.25} />
                                    <stop offset="100%" stopColor="#2f6848" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(24, 53, 42, 0.1)" vertical={false} />
                            <XAxis
                                dataKey="week_start"
                                tickFormatter={weekLabel}
                                tick={AXIS_STYLE}
                                axisLine={{ stroke: 'rgba(24, 53, 42, 0.15)' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={AXIS_STYLE}
                                axisLine={false}
                                tickLine={false}
                                width={metric === 'kg' ? 40 : 70}
                                tickFormatter={(v: number) =>
                                    metric === 'kg'
                                        ? `${v.toLocaleString('id-ID')}`
                                        : `${Math.round(v / 1000)}rb`
                                }
                            />
                            <Tooltip
                                formatter={(value) => [formatValue(Number(value), metric), metric === 'kg' ? 'Kg terolah' : 'Pendapatan']}
                                labelFormatter={(label) => `Minggu ${weekLabel(String(label))}`}
                                contentStyle={{
                                    borderRadius: 12,
                                    border: '1px solid rgba(47, 104, 72, 0.2)',
                                    background: '#ffffff',
                                    color: '#18352a',
                                    fontSize: 12,
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey={metric}
                                stroke="#18352a"
                                strokeWidth={2}
                                fill="url(#trendFill)"
                                activeDot={{ r: 4, fill: '#e88c12', stroke: 'none' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
