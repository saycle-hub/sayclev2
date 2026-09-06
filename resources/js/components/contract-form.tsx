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
    monthly_day: string;
    receiving_days: string[];
    buy_price: string;
    sell_price: string;
    start_date: string;
    end_date: string;
    [key: string]: string | string[];
}

export const emptyContractForm: ContractFormData = {
    name: '',
    status: 'active',
    grade: '',
    min_capacity_kg: '',
    ideal_capacity_kg: '',
    max_capacity_kg: '',
    frequency: '',
    monthly_day: '',
    receiving_days: [],
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
const DAYS = [
    ['monday', 'Senin'],
    ['tuesday', 'Selasa'],
    ['wednesday', 'Rabu'],
    ['thursday', 'Kamis'],
    ['friday', 'Jumat'],
    ['saturday', 'Sabtu'],
    ['sunday', 'Minggu'],
] as const;

interface SystemPrice {
    grade: string;
    buy_price: string | number;
    sell_price: string | number;
}

interface ContractFormProps {
    form: ReturnType<typeof useForm<ContractFormData>>;
    idPrefix: string;
    showStatus?: boolean;
    systemPrices?: Record<string, SystemPrice>;
}

/**
 * Shared add/edit contract fields: grade, capacities, frequency, negotiated prices, dates.
 */
export function ContractForm({ form, idPrefix, showStatus = false, systemPrices }: ContractFormProps) {
    const set = (key: keyof ContractFormData) => (e: React.ChangeEvent<HTMLInputElement>) => form.setData(key, e.target.value);

    const selectedGrade = form.data.grade;
    const stdPrice = selectedGrade && systemPrices ? systemPrices[selectedGrade] : null;

    const fillStandardPrice = () => {
        if (stdPrice) {
            form.setData('buy_price', String(stdPrice.buy_price));
            form.setData('sell_price', String(stdPrice.sell_price));
        }
    };

    const receivingDays = form.data.receiving_days || [];
    const selectedDay = receivingDays[0] || 'monday';

    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-name`}>Nama Kontrak (Opsional)</Label>
                <Input
                    id={`${idPrefix}-name`}
                    value={form.data.name}
                    onChange={set('name')}
                    placeholder="Contoh: Kontrak Kerjasama Pakan Maggot Q3"
                    className="min-h-11 focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                />
                <InputError message={form.errors.name} />
            </div>

            <div className={showStatus ? 'grid grid-cols-2 gap-3' : undefined}>
                <div className="space-y-1.5">
                    <Label htmlFor={`${idPrefix}-grade`}>Grade Limbah / Sampah Kontrak</Label>
                    <GradeSelect
                        value={form.data.grade}
                        onChange={(v) => {
                            form.setData('grade', v);
                            if (systemPrices && systemPrices[v] && !form.data.sell_price) {
                                form.setData('buy_price', String(systemPrices[v].buy_price));
                                form.setData('sell_price', String(systemPrices[v].sell_price));
                            }
                        }}
                        id={`${idPrefix}-grade`}
                    />
                    <InputError message={form.errors.grade} />
                </div>
                {showStatus && (
                    <div className="space-y-1.5">
                        <Label htmlFor={`${idPrefix}-status`}>Status Kontrak</Label>
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

            <fieldset className="space-y-1.5 rounded-xl border border-[#2f6848]/15 bg-white p-4">
                <legend className="px-1 text-xs font-bold text-[#18352a]">Target Kapasitas Kontrak (kg/minggu) — min ≤ ideal ≤ maks</legend>
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
                <Label htmlFor={`${idPrefix}-frequency`}>Frekuensi Penerimaan Kontrak</Label>
                <Select
                    value={form.data.frequency}
                    onValueChange={(v) => {
                        form.setData('frequency', v);
                        if (v === 'mingguan' && receivingDays.length === 0) {
                            form.setData('receiving_days', ['monday']);
                        }
                    }}
                >
                    <SelectTrigger id={`${idPrefix}-frequency`} className="min-h-11 focus:border-[#e88c12] focus:ring-[#e88c12]/30">
                        <SelectValue placeholder="Pilih frekuensi penerimaan" />
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

            <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-[#18352a]">Hari Penerimaan Dalam Seminggu</legend>
                {form.data.frequency === 'harian' ? (
                    <p className="text-xs text-[#18352a]/70 bg-emerald-50/60 p-3 rounded-xl">Penerimaan disebar setiap hari secara konsisten (Senin – Minggu).</p>
                ) : form.data.frequency === 'bulanan' ? (
                    <p className="text-xs text-[#18352a]/70 bg-emerald-50/60 p-3 rounded-xl">Penerimaan dilakukan 1x setiap bulan.</p>
                ) : (
                    <div>
                        <p className="text-[11px] text-[#18352a]/70 mb-2">Pilih 1 hari penerimaan dalam seminggu:</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
                            {DAYS.map(([value, label]) => {
                                const isSelected = selectedDay === value;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => form.setData('receiving_days', [value])}
                                        className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                                            isSelected
                                                ? 'border-[#2f6848] bg-[#2f6848] text-white shadow-sm ring-2 ring-[#2f6848]/30'
                                                : 'border-[#2f6848]/20 bg-white text-[#18352a] hover:bg-emerald-50/50'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                <InputError message={form.errors.receiving_days} />
            </fieldset>

            {/* Section: Harga Kesepakatan / Nego */}
            <div className="space-y-3 rounded-2xl border border-[#2f6848]/20 bg-emerald-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2f6848]/10 pb-2">
                    <div>
                        <h4 className="text-xs font-bold text-[#18352a]">Harga Kesepakatan Kontrak (Harga Nego Jual)</h4>
                        <p className="text-[11px] text-[#18352a]/70">
                            Atur harga nego penawaran jual ke mitra berkontrak ini.
                        </p>
                    </div>
                    {stdPrice && (
                        <button
                            type="button"
                            onClick={fillStandardPrice}
                            className="text-[11px] font-semibold text-[#2f6848] underline hover:text-[#18352a]"
                        >
                            Gunakan Harga Standar Sistem (Rp {Number(stdPrice.sell_price).toLocaleString('id-ID')}/kg)
                        </button>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor={`${idPrefix}-sell-price`} className="text-xs font-bold text-[#18352a]">
                        Harga Nego Jual Mitra (Rp/kg)
                    </Label>
                    <div className="relative">
                        <Input
                            id={`${idPrefix}-sell-price`}
                            type="number"
                            min="0"
                            step="1"
                            inputMode="decimal"
                            value={form.data.sell_price}
                            onChange={set('sell_price')}
                            placeholder="Contoh: 2500"
                            className="min-h-11 rounded-xl border-[#18352a]/20 bg-white font-bold text-[#2f6848] text-base focus:border-[#2f6848] focus:ring-2 focus:ring-[#2f6848]/20 pr-16"
                            required
                        />
                        <span className="absolute right-3 top-3 text-xs font-bold text-[#2f6848]">Rp/kg</span>
                    </div>
                    <InputError message={form.errors.sell_price} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label htmlFor={`${idPrefix}-start-date`} className="text-xs">Tanggal Mulai Berlaku (Opsional)</Label>
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
                    <Label htmlFor={`${idPrefix}-end-date`} className="text-xs">Tanggal Berakhir (Opsional)</Label>
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
        </div>
    );
}
