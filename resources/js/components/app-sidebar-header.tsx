import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { usePage } from '@inertiajs/react';
import { Bell, CircleHelp, Search } from 'lucide-react';

interface AppSidebarHeaderProps {
    breadcrumbs?: BreadcrumbItemType[];
    title?: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
}

export function AppSidebarHeader({ breadcrumbs = [], title, description, actions }: AppSidebarHeaderProps) {
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;

    if (auth.user.role === 'partner') {
        return (
            <header className="mx-3.5 mt-3.5 flex flex-col gap-4 rounded-2xl bg-[#415D43] p-5 text-white shadow-sm md:p-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/70" />
                        <input className="h-10 w-full rounded-lg border border-white/20 bg-white/10 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/60 focus:border-white focus:ring-1 focus:ring-white" placeholder="Cari..." />
                    </div>
                    <div className="ml-4 flex items-center gap-4 text-white">
                        <button aria-label="Notifikasi" className="transition hover:text-white/80"><Bell className="size-5" /></button>
                        <button aria-label="Bantuan" className="transition hover:text-white/80"><CircleHelp className="size-5" /></button>
                        <div className="grid size-8 place-items-center rounded-full border border-white/30 bg-white/20 text-xs font-bold text-white">RH</div>
                    </div>
                </div>
                {title && (
                    <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/15 pt-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
                            {description && <p className="mt-1 text-sm text-[#A1CCA5]">{description}</p>}
                        </div>
                        {actions && <div className="flex items-center gap-2">{actions}</div>}
                    </div>
                )}
            </header>
        );
    }

    return (
        <header className="mx-3.5 mt-3.5 flex flex-col gap-4 rounded-2xl bg-[#415D43] p-5 text-white shadow-sm transition-all md:p-6">
            <div className="flex items-center gap-3 text-white">
                <SidebarTrigger className="-ml-1 text-white hover:bg-white/15 hover:text-white" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            {title && (
                <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/15 pt-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
                        {description && <p className="mt-1 text-sm text-[#A1CCA5]">{description}</p>}
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
            )}
        </header>
    );
}
