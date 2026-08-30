import { CapacityInput } from '@/components/capacity-input';
import { GradeSelect } from '@/components/grade-select';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';

export interface PartnerFormData {
    name: string;
    address: string;
    grade_preference: string;
    min_capacity_kg: string;
    ideal_capacity_kg: string;
    max_capacity_kg: string;
    frequency: string;
    [key: string]: string;
}

export const emptyPartnerForm: PartnerFormData = {
    name: '',
    address: '',
    grade_preference: '',
    min_capacity_kg: '',
    ideal_capacity_kg: '',
    max_capacity_kg: '',
    frequency: '',
};

const FREQUENCIES = [
    { value: 'harian', label: 'Harian' },
    { value: 'mingguan', label: 'Mingguan' },
    { value: 'bulanan', label: 'Bulanan' },
] as const;

/**
 * Shared create/edit partner fields with min ≤ ideal ≤ max validation hints.
 */
export function PartnerFormFields({ form, idPrefix }: { form: ReturnType<typeof useForm<PartnerFormData>>; idPrefix: string }) {
    return (
        <>
            <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-name`}>Nama mitra</Label>
                <Input
                    id={`${idPrefix}-name`}
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    className="min-h-11 focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                    required
                />
                <InputError message={form.errors.name} />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-address`}>Alamat</Label>
                <Textarea
                    id={`${idPrefix}-address`}
                    value={form.data.address}
                    onChange={(e) => form.setData('address', e.target.value)}
                    className="min-h-11 focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                    rows={3}
                    required
                />
                <InputError message={form.errors.address} />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-grade`}>Preferensi grade (opsional)</Label>
                <GradeSelect value={form.data.grade_preference} onChange={(v) => form.setData('grade_preference', v)} id={`${idPrefix}-grade`} />
                <InputError message={form.errors.grade_preference} />
            </div>

            <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium text-[#18352a]">Kapasitas (kg/minggu) — minimum ≤ ideal ≤ maksimum</legend>
                <CapacityInput
                    values={{
                        min_capacity_kg: form.data.min_capacity_kg,
                        ideal_capacity_kg: form.data.ideal_capacity_kg,
                        max_capacity_kg: form.data.max_capacity_kg,
                    }}
                    onChange={(key, value) => form.setData(key, value)}
                    fieldErrors={{
                        min_capacity_kg: form.errors.min_capacity_kg,
                        ideal_capacity_kg: form.errors.ideal_capacity_kg,
                        max_capacity_kg: form.errors.max_capacity_kg,
                    }}
                />
            </fieldset>

            <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-frequency`}>Frekuensi penerimaan</Label>
                <Select value={form.data.frequency} onValueChange={(v) => form.setData('frequency', v)}>
                    <SelectTrigger id={`${idPrefix}-frequency`} className="min-h-11 focus:border-[#e88c12] focus:ring-[#e88c12]/30">
                        <SelectValue placeholder="Pilih frekuensi" />
                    </SelectTrigger>
                    <SelectContent>
                        {FREQUENCIES.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                                {f.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={form.errors.frequency} />
            </div>
        </>
    );
}
