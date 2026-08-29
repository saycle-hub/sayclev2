import { Head } from '@inertiajs/react';
import { PackageOpen } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';

type Props = { module: string };

export default function ComingSoon({ module }: Props) {
    const breadcrumbs = [{ title: `${module}`, href: `/` }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${module} — SayCle`} />
            <div className="flex h-full flex-1 flex-col items-center justify-center p-6 text-[#18352a]">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#d7e6c9]">
                    <PackageOpen size={20} />
                </div>
                <h2 className="mt-5 text-2xl font-semibold">Modul {module} segera tersedia</h2>
                <p className="mt-2 max-w-md text-center text-sm text-[#18352a]/70">
                    Modul ini sedang dalam pengembangan. Kembali ke beranda untuk melihat modul yang sudah aktif.
                </p>
            </div>
        </AppLayout>
    );
}
