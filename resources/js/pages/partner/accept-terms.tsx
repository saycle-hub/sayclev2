import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

export default function AcceptTerms() {
    const { data, setData, post, processing } = useForm<{ overcapacity_terms_accepted: boolean }>({ overcapacity_terms_accepted: false });
    return <><Head title="Ketentuan kapasitas lebih" /><main className="flex min-h-screen items-center justify-center bg-white p-4"><section className="w-full max-w-xl rounded-2xl border border-[#c2c8be] bg-white p-8 shadow-sm"><h1 className="mb-4 text-2xl font-semibold">Konfirmasi ketentuan kapasitas lebih</h1><p className="mb-6 text-[#424841]">Kg antara kapasitas ideal dan maksimum adalah overcapacity. Harga biaya hanya berlaku untuk overcapacity. Material di atas maksimum dialihkan berdasarkan grade dan intended use. Persetujuan wajib untuk mengaktifkan portal mitra.</p><form onSubmit={(e) => { e.preventDefault(); post(route('partner.terms.accept')); }}><label className="flex gap-3"><input type="checkbox" required checked={data.overcapacity_terms_accepted} onChange={(e) => setData('overcapacity_terms_accepted', e.target.checked)} />Saya menyetujui ketentuan kapasitas lebih.</label><Button type="submit" disabled={processing} className="mt-6 w-full bg-[#1d3a20] text-white">Setujui dan lanjutkan</Button></form></section></main></>;
}
