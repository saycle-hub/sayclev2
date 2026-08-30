import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { usePage } from '@inertiajs/react';
import { Bell, CircleHelp, Search } from 'lucide-react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;

    if (auth.user.role === 'partner') {
        return (
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#2f6848]/15 bg-[#f8faf5]/90 px-6 shadow-sm backdrop-blur-md md:px-8">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#727974]" />
                    <input className="h-10 w-full rounded-lg border border-[#2f6848]/15 bg-[#d7e6c9]/60 pl-10 pr-4 text-sm text-[#191c1a] outline-none placeholder:text-[#727974] focus:border-[#306949] focus:ring-1 focus:ring-[#306949]" placeholder="Cari..." />
                </div>
                <div className="ml-4 flex items-center gap-4 text-[#424844]">
                    <button aria-label="Notifikasi" className="transition hover:text-[#022016]"><Bell className="size-5" /></button>
                    <button aria-label="Bantuan" className="transition hover:text-[#022016]"><CircleHelp className="size-5" /></button>
                    <div className="grid size-8 place-items-center rounded-full border border-[#2f6848]/15 bg-[#adcebe] text-xs font-bold text-[#18352a]">RH</div>
                </div>
            </header>
        );
    }

    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
        </header>
    );
}
