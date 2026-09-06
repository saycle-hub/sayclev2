import { CapacityInput } from '@/components/capacity-input';
import { GradeSelect } from '@/components/grade-select';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { Building2, MapPin, Sparkles, Scale, Clock } from 'lucide-react';

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
 * Shared create/edit partner fields with clean card layout and hints.
 */
export function PartnerFormFields({ form, idPrefix }: { form: ReturnType<typeof useForm<PartnerFormData>>; idPrefix: string }) {
    return (
        <div className="space-y-6">
            {/* Section 1: Profil & Alamat */}
            <div className="space-y-4 rounded-2xl border border-[#2f6848]/10 bg-gray-50/50 p-4 sm:p-5">
                <div className="flex items-center gap-2 border-b border-[#2f6848]/10 pb-3 text-[#18352a]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2f6848]/10 text-[#2f6848]">
                        <Building2 className="h-4 w-4" />
                    </div>
                    <h2 className="font-bold text-sm text-[#18352a]">Informasi Profil & Alamat</h2>
                </div>

                <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}-name`} className="text-xs font-semibold text-[#18352a]">
                        Nama Mitra
                    </Label>
                    <div className="relative">
                        <Input
                            id={`${idPrefix}-name`}
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            placeholder="Contoh: Koperasi Tani Makmur Sleman"
                            className="min-h-11 rounded-xl border-[#18352a]/20 bg-white focus:border-[#2f6848] focus:ring-2 focus:ring-[#2f6848]/20"
                            required
                        />
                    </div>
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
            </div>

            {/* Section 2: Kapasitas Mingguan & Frekuensi */}
            <div className="space-y-4 rounded-2xl border border-[#2f6848]/10 bg-gray-50/50 p-4 sm:p-5">
                <div className="flex items-center gap-2 border-b border-[#2f6848]/10 pb-3 text-[#18352a]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e88c12]/15 text-[#e88c12]">
                        <Scale className="h-4 w-4" />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm text-[#18352a]">Target Kapasitas (kg/minggu)</h2>
                        <p className="text-[11px] text-[#18352a]/70">Atur batasan minimum ≤ ideal ≤ maksimum penyerapan.</p>
                    </div>
                </div>

                <fieldset className="space-y-2">
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

                <div className="space-y-2 pt-2">
                    <Label htmlFor={`${idPrefix}-frequency`} className="text-xs font-semibold text-[#18352a]">
                        Frekuensi Penerimaan
                    </Label>
                    <Select value={form.data.frequency} onValueChange={(v) => form.setData('frequency', v)}>
                        <SelectTrigger id={`${idPrefix}-frequency`} className="min-h-11 rounded-xl border-[#18352a]/20 bg-white focus:border-[#2f6848] focus:ring-2 focus:ring-[#2f6848]/20">
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
            </div>
        </div>
    );
}
