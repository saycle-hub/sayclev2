import { useState } from 'react';
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
    metric?: 'kg' | 'pendapatan';
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
 * Weekly trend area chart (recharts) with interactive metric switcher (Kg / Pendapatan Rp).
 */
export function TrendChart({ data, metric: initialMetric = 'kg', className }: TrendChartProps) {
    const [metric, setMetric] = useState<'kg' | 'pendapatan'>(initialMetric);

    return (
        <Card className={cn('rounded-2xl border border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]', className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold text-[#18352a]">
                    {metric === 'kg' ? 'Tren kg terolah' : 'Tren pendapatan'}
                </CardTitle>
                <div className="flex items-center gap-1 rounded-xl bg-[#F2F7F3] p-1 border border-[#8FB996]/25">
                    <button
                        type="button"
                        onClick={() => setMetric('kg')}
                        className={cn(
                            'rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer',
                            metric === 'kg'
                                ? 'bg-[#415D43] text-white shadow-xs'
                                : 'text-[#18352a]/70 hover:text-[#18352a]'
                        )}
                    >
                        Kg Terolah
                    </button>
                    <button
                        type="button"
                        onClick={() => setMetric('pendapatan')}
                        className={cn(
                            'rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer',
                            metric === 'pendapatan'
                                ? 'bg-[#415D43] text-white shadow-xs'
                                : 'text-[#18352a]/70 hover:text-[#18352a]'
                        )}
                    >
                        Pendapatan (Rp)
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-64 w-full" role="img" aria-label={metric === 'kg' ? 'Grafik tren kilogram terolah per hari' : 'Grafik tren pendapatan per hari'}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 20, right: 24, bottom: 12, left: 16 }}>
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
                                tickMargin={10}
                            />
                            <YAxis
                                tick={AXIS_STYLE}
                                axisLine={false}
                                tickLine={false}
                                width={metric === 'kg' ? 84 : 104}
                                tickMargin={10}
                                tickFormatter={(v: number) =>
                                    metric === 'kg'
                                        ? `${v.toLocaleString('id-ID')} kg`
                                        : `Rp ${Math.round(v / 1000).toLocaleString('id-ID')}rb`
                                }
                            />
                            <Tooltip
                                formatter={(value) => [formatValue(Number(value), metric), metric === 'kg' ? 'Kg terolah' : 'Pendapatan']}
                                labelFormatter={(label) => new Date(String(label) + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
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
