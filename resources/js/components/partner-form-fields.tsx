import { GradeSelect } from '@/components/grade-select';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { Building2, Calendar, Scale } from 'lucide-react';

export interface PartnerFormData {
    name: string;
    address: string;
    grade_preference: string;
    frequency: string;
    receiving_days: string[];
    kebutuhan_pokok_kg: string;
    ideal_capacity_kg: string;
    [key: string]: any;
}

export const emptyPartnerForm: PartnerFormData = {
    name: '',
    address: '',
    grade_preference: '',
    frequency: 'harian',
    receiving_days: [],
    kebutuhan_pokok_kg: '',
    ideal_capacity_kg: '',
};

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

/**
 * Shared create/edit partner fields with ordered workflow: Profile -> Preference & Frequency -> Days -> Capacity.
 */
export function PartnerFormFields({ form, idPrefix }: { form: ReturnType<typeof useForm<PartnerFormData>>; idPrefix: string }) {
    const freq = form.data.frequency || 'harian';
    const receivingDays = form.data.receiving_days || [];
    const selectedDay = receivingDays[0] || 'monday';

    const unitText = freq === 'harian' ? 'kg / hari' : freq === 'bulanan' ? 'kg / bulan' : 'kg / minggu';
    const labelText = freq === 'harian' ? 'Total Kebutuhan Pokok (kg/hari)' : freq === 'bulanan' ? 'Total Kebutuhan Pokok (kg/bulan)' : 'Total Kebutuhan Pokok (kg/minggu)';
    const helperText = freq === 'harian'
        ? 'Rata-rata total penyerapan sampah/limbah organik yang dibutuhkan mitra per hari.'
        : freq === 'bulanan'
        ? 'Rata-rata total penyerapan sampah/limbah organik yang dibutuhkan mitra per bulan.'
        : 'Rata-rata total penyerapan sampah/limbah organik yang dibutuhkan mitra per minggu.';

    return (
        <div className="space-y-6">
            {/* Section 1: Profil & Alamat */}
            <div className="space-y-4 rounded-2xl border border-[#2f6848]/10 bg-gray-50/50 p-4 sm:p-5">
                <div className="flex items-center gap-2 border-b border-[#2f6848]/10 pb-3 text-[#18352a]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2f6848]/10 text-[#2f6848]">
                        <Building2 className="h-4 w-4" />
                    </div>
                    <h2 className="font-bold text-sm text-[#18352a]">1. Informasi Profil & Alamat</h2>
                </div>

                <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}-name`} className="text-xs font-semibold text-[#18352a]">
                        Nama Mitra
                    </Label>
                    <Input
                        id={`${idPrefix}-name`}
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        placeholder="Contoh: Koperasi Tani Makmur Sleman"
                        className="min-h-11 rounded-xl border-[#18352a]/20 bg-white focus:border-[#2f6848] focus:ring-2 focus:ring-[#2f6848]/20"
                        required
                    />
                    <InputError message={form.errors.name} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}-address`} className="text-xs font-semibold text-[#18352a]">
                        Alamat Lengkap
                    </Label>
                    <Textarea
                        id={`${idPrefix}-address`}
                        value={form.data.address}
                        onChange={(e) => form.setData('address', e.target.value)}
                        placeholder="Contoh: Jl. Magelang KM 12, Tridadi, Sleman, D.I. Yogyakarta"
                        className="min-h-20 rounded-xl border-[#18352a]/20 bg-white focus:border-[#2f6848] focus:ring-2 focus:ring-[#2f6848]/20 resize-y"
                        rows={3}
                        required
                    />
                    <InputError message={form.errors.address} />
                </div>
            </div>

            {/* Section 2: Preferensi & Jadwal Hari */}
            <div className="space-y-4 rounded-2xl border border-[#2f6848]/10 bg-gray-50/50 p-4 sm:p-5">
                <div className="flex items-center gap-2 border-b border-[#2f6848]/10 pb-3 text-[#18352a]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e88c12]/15 text-[#e88c12]">
                        <Calendar className="h-4 w-4" />
                    </div>
                    <h2 className="font-bold text-sm text-[#18352a]">2. Preferensi & Frekuensi Penerimaan</h2>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor={`${idPrefix}-grade`} className="text-xs font-semibold text-[#18352a]">
                                Preferensi Grade
                            </Label>
                            <span className="text-[11px] text-[#18352a]/60">Opsional</span>
                        </div>
                        <GradeSelect value={form.data.grade_preference} onChange={(v) => form.setData('grade_preference', v)} id={`${idPrefix}-grade`} />
                        <InputError message={form.errors.grade_preference} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`${idPrefix}-frequency`} className="text-xs font-semibold text-[#18352a]">
                            Frekuensi Penerimaan Standard
                        </Label>
                        <Select
                            value={freq}
                            onValueChange={(v) => {
                                form.setData('frequency', v);
                                if (v === 'mingguan' && receivingDays.length === 0) {
                                    form.setData('receiving_days', ['monday']);
                                }
                            }}
                        >
                            <SelectTrigger id={`${idPrefix}-frequency`} className="min-h-11 rounded-xl border-[#18352a]/20 bg-white focus:border-[#2f6848] focus:ring-2 focus:ring-[#2f6848]/20">
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
                </div>

                {/* Hari yang Tersedia */}
                <div className="space-y-2 pt-2 border-t border-[#2f6848]/10">
                    <Label className="text-xs font-semibold text-[#18352a]">Hari Penerimaan yang Tersedia</Label>
                    {freq === 'harian' ? (
                        <p className="text-xs text-[#2f6848] font-medium bg-[#2f6848]/10 p-3 rounded-xl">
                            Mitra menerima pengiriman setiap hari (Senin – Minggu).
                        </p>
                    ) : freq === 'bulanan' ? (
                        <p className="text-xs text-[#2f6848] font-medium bg-[#2f6848]/10 p-3 rounded-xl">
                            Mitra menerima pengiriman 1 kali setiap bulan.
                        </p>
                    ) : (
                        <div>
                            <p className="text-[11px] text-[#18352a]/70 mb-2">Pilih 1 hari penerimaan dalam seminggu:</p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
                                {DAYS.map(([val, label]) => {
                                    const isSelected = selectedDay === val;
                                    return (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => form.setData('receiving_days', [val])}
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
                </div>
            </div>

            {/* Section 3: Total Kebutuhan Pokok (Dynamic per Day / Week / Month) */}
            <div className="space-y-4 rounded-2xl border border-[#2f6848]/15 bg-emerald-50/40 p-4 sm:p-5">
                <div className="flex items-center gap-2 border-b border-[#2f6848]/10 pb-3 text-[#18352a]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2f6848] text-white">
                        <Scale className="h-4 w-4" />
                    </div>
                    <h2 className="font-bold text-sm text-[#18352a]">3. Total Kebutuhan Pokok ({unitText})</h2>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor={`${idPrefix}-kebutuhan`} className="text-xs font-bold text-[#18352a]">
                            {labelText}
                        </Label>
                        <span className="text-[11px] font-bold text-[#2f6848] bg-[#2f6848]/10 px-2 py-0.5 rounded-md">{unitText}</span>
                    </div>
                    <div className="relative">
                        <Input
                            id={`${idPrefix}-kebutuhan`}
                            type="number"
                            min="0"
                            step="1"
                            inputMode="decimal"
                            value={form.data.kebutuhan_pokok_kg || form.data.ideal_capacity_kg || ''}
                            onChange={(e) => {
                                form.setData('kebutuhan_pokok_kg', e.target.value);
                                form.setData('ideal_capacity_kg', e.target.value);
                            }}
                            placeholder={freq === 'harian' ? 'Contoh: 200' : 'Contoh: 1000'}
                            className="min-h-11 rounded-xl border-[#18352a]/20 bg-white font-bold text-[#18352a] text-base focus:border-[#2f6848] focus:ring-2 focus:ring-[#2f6848]/20 pr-24"
                        />
                        <span className="absolute right-3 top-3.5 text-xs font-bold text-[#2f6848]">{unitText}</span>
                    </div>
                    <p className="text-[11px] text-[#18352a]/70">{helperText}</p>
                    <InputError message={form.errors.kebutuhan_pokok_kg || form.errors.ideal_capacity_kg} />
                </div>
            </div>
        </div>
    );
}
