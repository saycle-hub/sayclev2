import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
type CapacityKey = 'min_capacity_kg' | 'ideal_capacity_kg' | 'max_capacity_kg';
type CapacityValues = Record<CapacityKey, string>;

export function CapacityInput({ values, onChange, error, fieldErrors = {} }: { values: CapacityValues; onChange: (key: CapacityKey, value: string) => void; error?: string; fieldErrors?: Partial<Record<CapacityKey, string>> }) {
    const fields: [CapacityKey, string][] = [['min_capacity_kg', 'Minimum'], ['ideal_capacity_kg', 'Ideal'], ['max_capacity_kg', 'Maksimum']];
    return <div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {fields.map(([key, label]) => <div key={key}>
                <Label htmlFor={key}>{label} (kg/minggu)</Label>
                <Input id={key} type="number" inputMode="decimal" value={values[key]} aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key] ? `${key}-error` : undefined} onChange={e => onChange(key, e.target.value)} className="h-12 rounded-lg border-[#c2c8be] bg-white text-[#191c1c] shadow-none focus:border-[#1d3a20] focus:bg-white focus:ring-[#1d3a20]/20" />
                {fieldErrors[key] && <p id={`${key}-error`} className="text-sm text-red-700">{fieldErrors[key]}</p>}
            </div>)}
        </div>
        {error && <p id="capacity-error" tabIndex={-1} role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>;
}
