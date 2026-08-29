import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from '@inertiajs/react';
import { Check, Pencil, X } from 'lucide-react';
import { useState } from 'react';

interface PriceEditorProps {
    grade: string;
    buyPrice: number;
    sellPrice: number;
}

function formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

export function PriceEditor({ grade, buyPrice, sellPrice }: PriceEditorProps) {
    const [editing, setEditing] = useState(false);
    const form = useForm({ grade, buy_price: String(buyPrice), sell_price: String(sellPrice) });

    const startEdit = () => {
        form.setData({ grade, buy_price: String(buyPrice), sell_price: String(sellPrice) });
        form.clearErrors();
        setEditing(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/prices', {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    };

    if (!editing) {
        return (
            <div className="flex items-center justify-between gap-4">
                <div className="grid flex-1 grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs font-medium tracking-[0.08em] text-[#18352a]/70 uppercase">Harga beli</p>
                        <p className="mt-0.5 font-semibold text-[#18352a] tabular-nums">{formatRupiah(buyPrice)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium tracking-[0.08em] text-[#18352a]/70 uppercase">Harga jual</p>
                        <p className="mt-0.5 font-semibold text-[#18352a] tabular-nums">{formatRupiah(sellPrice)}</p>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={startEdit}
                    className="min-h-11 border-[#2f6848]/30 text-[#2f6848] hover:bg-[#2f6848]/5 hover:text-[#2f6848] md:min-h-9"
                    aria-label={`Ubah harga ${grade}`}
                >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Ubah
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label htmlFor={`buy-${grade}`} className="text-xs text-[#18352a]/70">
                        Harga beli (Rp/kg)
                    </Label>
                    <Input
                        id={`buy-${grade}`}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={form.data.buy_price}
                        onChange={(e) => form.setData('buy_price', e.target.value)}
                        className="focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                        required
                    />
                    <InputError message={form.errors.buy_price} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor={`sell-${grade}`} className="text-xs text-[#18352a]/70">
                        Harga jual (Rp/kg)
                    </Label>
                    <Input
                        id={`sell-${grade}`}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={form.data.sell_price}
                        onChange={(e) => form.setData('sell_price', e.target.value)}
                        className="focus:border-[#e88c12] focus:ring-[#e88c12]/30"
                        required
                    />
                    <InputError message={form.errors.sell_price} />
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={form.processing}>
                    <X className="h-4 w-4" aria-hidden="true" />
                    Batal
                </Button>
                <Button type="submit" size="sm" disabled={form.processing} className="bg-[#2f6848] text-[#f4f3ed] hover:bg-[#18352a]">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Simpan
                </Button>
            </div>
        </form>
    );
}
