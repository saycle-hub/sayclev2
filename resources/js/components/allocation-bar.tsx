const scaleSegments = [
    { key: 'allocated', label: 'Dialokasikan', color: 'bg-[#2f6848]' },
    { key: 'ideal-rest', label: 'Sisa ideal', color: 'bg-[#d7e6c9]' },
    { key: 'max-rest', label: 'Di luar ideal', color: 'bg-[#e88c12]/40' },
] as const;

interface AllocationBarProps {
    allocated: number;
    minimum: number;
    ideal: number;
    maximum: number;
    className?: string;
}

/**
 * Visualizes allocated kg against the contract scale (minimum → ideal → maximum).
 * Accessible via aria-label; numbers rendered as text for screen readers.
 */
export function AllocationBar({ allocated, minimum, ideal, maximum, className }: AllocationBarProps) {
    const max = Math.max(maximum, ideal, minimum, allocated, 1);
    const pct = (value: number) => Math.min(100, Math.max(0, (value / max) * 100));

    const allocatedPct = pct(allocated);
    const idealPct = pct(ideal);
    const minimumPct = pct(minimum);

    const description = `${allocated.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg dialokasikan dari target ideal ${ideal.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg`;

    return (
        <div className={className} role="img" aria-label={description}>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[#18352a]/10">
                {/* maximum headroom (beyond ideal) */}
                <div
                    className="absolute inset-y-0 left-0 bg-[#e88c12]/40"
                    style={{ left: `${idealPct}%`, width: `${Math.max(0, 100 - idealPct)}%` }}
                />
                {/* ideal zone up to allocated */}
                <div className="absolute inset-y-0 left-0 bg-[#d7e6c9]" style={{ width: `${idealPct}%` }} />
                {/* allocated */}
                <div className="absolute inset-y-0 left-0 bg-[#2f6848]" style={{ width: `${allocatedPct}%` }} />
                {/* minimum marker */}
                <div className="absolute inset-y-0 w-0.5 bg-[#18352a]" style={{ left: `${minimumPct}%` }} aria-hidden="true" title={`Batas minimum: ${minimum} kg`} />
            </div>
            <p className="mt-1 flex items-center justify-between text-xs text-[#18352a]/70 tabular-nums">
                <span>{allocated.toLocaleString('id-ID', { maximumFractionDigits: 1 })} / {ideal.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg</span>
                <span className="text-[11px] font-medium text-[#18352a]/60">Target ideal</span>
            </p>
            <span className="sr-only">{scaleSegments.map((s) => s.label).join(', ')}</span>
        </div>
    );
}
