import { CapacityInput } from '@/components/capacity-input';
import { GradeSelect } from '@/components/grade-select';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from '@inertiajs/react';

export interface ContractFormData {
    name: string;
    status: string;
    grade: string;
    min_capacity_kg: string;
    ideal_capacity_kg: string;
    max_capacity_kg: string;
    frequency: string;
    buy_price: string;
    sell_price: string;
    start_date: string;
    end_date: string;
    [key: string]: string;
}

export const emptyContractForm: ContractFormData = {
    name: '',
    status: 'active',
    grade: '',
    min_capacity_kg: '',
    ideal_capacity_kg: '',
    max_capacity_kg: '',
    frequency: '',
    buy_price: '',
    sell_price: '',
    start_date: '',
    end_date: '',
};

export const CONTRACT_STATUSES = [
    { value: 'active', label: 'Aktif' },
    { value: 'paused', label: 'Dijeda' },
    { value: 'cancelled', label: 'Dibatalkan' },
] as const;

const FREQUENCIES = [
    { value: 'harian', label: 'Harian' },
    { value: 'mingguan', label: 'Mingguan' },
    { value: 'bulanan', label: 'Bulanan' },
] as const;

interface ContractFormProps {
    form: ReturnType<typeof useForm<ContractFormData>>;
    idPrefix: string;
    showStatus?: boolean;
}

/**
 * Shared add/edit contract fields: grade, capacities, frequency, prices, dates.
 */
export function ContractForm({ form, idPrefix, showStatus = false }: ContractFormProps) {
    const set = (key: keyof ContractFormData) => (e: React.ChangeEvent<HTMLInputElement>) => form.setData(key, e.target.value);

    return (
        <>
            <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-name`}>Nama kontrak (opsional)</Label>
                <Input
                    id={`${idPrefix}-name`}
                    value={form.data.name}
                    onChange={set('name')}
                    placeholder="Contoh: Kontrak maggot Q3"
                    className="min-h-11 focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                />
                <InputError message={form.errors.name} />
            </div>

            <div className={showStatus ? 'grid grid-cols-2 gap-3' : undefined}>
                <div className="space-y-1.5">
                    <Label htmlFor={`${idPrefix}-grade`}>Grade</Label>
                    <GradeSelect value={form.data.grade} onChange={(v) => form.setData('grade', v)} id={`${idPrefix}-grade`} />
                    <InputError message={form.errors.grade} />
                </div>
                {showStatus && (
                    <div className="space-y-1.5">
                        <Label htmlFor={`${idPrefix}-status`}>Status</Label>
                        <Select value={form.data.status} onValueChange={(v) => form.setData('status', v)}>
                            <SelectTrigger id={`${idPrefix}-status`} className="min-h-11 focus:border-[#e88c12] focus:ring-[#e88c12]/30">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CONTRACT_STATUSES.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.status} />
                    </div>
                )}
            </div>

            <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium text-[#18352a]">Kapasitas (kg/minggu) — min ≤ ideal ≤ maks</legend>
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

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label htmlFor={`${idPrefix}-buy-price`}>Harga beli (Rp/kg)</Label>
                    <Input
                        id={`${idPrefix}-buy-price`}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={form.data.buy_price}
                        onChange={set('buy_price')}
                        className="min-h-11 focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                        required
                    />
                    <InputError message={form.errors.buy_price} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor={`${idPrefix}-sell-price`}>Harga jual (Rp/kg)</Label>
                    <Input
                        id={`${idPrefix}-sell-price`}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={form.data.sell_price}
                        onChange={set('sell_price')}
                        className="min-h-11 focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                        required
                    />
                    <InputError message={form.errors.sell_price} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label htmlFor={`${idPrefix}-start-date`}>Tanggal mulai (opsional)</Label>
                    <Input
                        id={`${idPrefix}-start-date`}
                        type="date"
                        value={form.data.start_date}
                        onChange={set('start_date')}
                        className="min-h-11 focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                    />
                    <InputError message={form.errors.start_date} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor={`${idPrefix}-end-date`}>Tanggal berakhir (opsional)</Label>
                    <Input
                        id={`${idPrefix}-end-date`}
                        type="date"
                        value={form.data.end_date}
                        onChange={set('end_date')}
                        className="min-h-11 focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                    />
                    <InputError message={form.errors.end_date} />
                </div>
            </div>
        </>
    );
}
