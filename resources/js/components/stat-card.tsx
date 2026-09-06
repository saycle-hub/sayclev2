import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface StatCardProps {
    icon: LucideIcon;
    label: ReactNode;
    value: string;
    hint?: string;
    trend?: { direction: 'up' | 'down'; label: string };
    className?: string;
}

export function StatCard({ icon: Icon, label, value, hint, trend, className }: StatCardProps) {
    const TrendIcon = trend?.direction === 'down' ? ArrowDownRight : ArrowUpRight;

    return (
        <Card className={cn('rounded-2xl border border-[#8FB996]/35 bg-white shadow-[0_2px_8px_rgba(17,29,19,0.04)]', className)}>
            <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A1CCA5]/30 text-[#415D43]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#111D13]/70">{label}</div>
                    <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-[#111D13] tabular-nums">{value}</p>
                    {(trend || hint) && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-[#111D13]/60">
                            {trend && (
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-0.5 font-semibold',
                                        trend.direction === 'down' ? 'text-[#709775]' : 'text-[#415D43]',
                                    )}
                                >
                                    <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                    {trend.label}
                                </span>
                            )}
                            {hint && <span>{hint}</span>}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
