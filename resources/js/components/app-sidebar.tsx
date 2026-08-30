import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BarChart3, ClipboardList, FileText, HandCoins, Handshake, HelpCircle, Layers, LayoutGrid, Package, Route, Scale, Settings, Tags, Truck, Users } from 'lucide-react';
import AppLogo from './app-logo';

const navByRole: Record<string, { home: NavItem; items: NavItem[] }> = {
    admin: {
        home: { title: 'Dasbor', url: '/dashboard', icon: LayoutGrid },
        items: [
            { title: 'Stok', url: '/stock', icon: Package },
            { title: 'Mitra', url: '/partners', icon: Users },
            { title: 'Kontrak', url: '/contracts', icon: Handshake },
            { title: 'Alokasi', url: '/allocation', icon: Layers },
            { title: 'Rute', url: '/routes', icon: Route },
            { title: 'Kendaraan', url: '/vehicles', icon: Truck },
            { title: 'Tugas', url: '/tasks', icon: ClipboardList },
            { title: 'Harga', url: '/prices', icon: Tags },
            { title: 'Statistik', url: '/stats', icon: BarChart3 },
        ],
    },
    officer: {
        home: { title: 'Beranda', url: '/officer', icon: LayoutGrid },
        items: [
            { title: 'Tugas', url: '/officer/tasks', icon: ClipboardList },
            { title: 'Rute', url: '/officer/routes', icon: Route },
            { title: 'Penimbangan', url: '/officer/weighing', icon: Scale },
        ],
    },
    partner: {
        home: { title: 'Beranda', url: '/partner', icon: LayoutGrid },
        items: [
            { title: 'Pengiriman', url: '/partner/deliveries', icon: Truck },
            { title: 'Kontrak', url: '/partner/contract', icon: FileText },
            { title: 'Tagihan', url: '/partner/billing', icon: HandCoins },
        ],
    },
};

export function AppSidebar() {
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;
    const roleNav = navByRole[auth.user.role] ?? { home: { title: 'Beranda', url: '/dashboard', icon: LayoutGrid }, items: [] };
    const mainNavItems = [roleNav.home, ...roleNav.items];

    if (auth.user.role === 'partner') {
        return (
            <Sidebar collapsible="none" style={{ backgroundColor: '#ffffff' }} className="!h-[100dvh] !min-h-[100dvh] !w-[280px] !border-r !border-[#2f6848]/15 !bg-white !text-[#191c1a] [&_[data-sidebar=sidebar]]:!h-[100dvh] [&_[data-sidebar=sidebar]]:!min-h-[100dvh] [&_[data-sidebar=sidebar]]:!bg-white">
                <SidebarHeader className="px-4 py-6">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild className="px-4">
                                <Link href="/partner"><AppLogo /></Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>
                <SidebarContent className="px-4">
                    <SidebarMenu className="gap-2">
                        {[{ title: 'Beranda', url: '/partner', icon: LayoutGrid }, ...roleNav.items].map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild isActive={item.url === window.location.pathname} className="h-12 rounded-lg px-4 text-[#424844] data-[active=true]:border-r-4 data-[active=true]:border-[#022016] data-[active=true]:bg-[#f2f4ef] data-[active=true]:font-bold data-[active=true]:text-[#022016]">
                                    <Link href={item.url}><item.icon /><span>{item.title}</span></Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter style={{ backgroundColor: '#ffffff' }} className="!bg-white border-t border-[#2f6848]/15 px-4 py-5">
                    <SidebarMenu className="gap-1">
                        <SidebarMenuItem><SidebarMenuButton asChild className="h-11 px-4 text-[#424844]"><Link href="#"><HelpCircle /><span>Bantuan</span></Link></SidebarMenuButton></SidebarMenuItem>
                        <SidebarMenuItem><SidebarMenuButton asChild className="h-11 px-4 text-[#424844]"><Link href="/settings/profile"><Settings /><span>Pengaturan</span></Link></SidebarMenuButton></SidebarMenuItem>
                    </SidebarMenu>
                    <div className="mt-4 flex items-center gap-3 px-4">
                        <div className="grid size-10 place-items-center rounded-full bg-[#d7e6c9] font-semibold text-[#18352a]">RH</div>
                        <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#191c1a]">Rafly Hermansyah</p><p className="text-xs text-[#727974]">Mitra Aktif</p></div>
                    </div>
                    <Link href="/logout" method="post" as="button" className="mt-4 w-full px-4 py-2 text-left text-sm font-semibold text-[#ba1a1a] hover:text-[#93000a]">Logout</Link>
                </SidebarFooter>
            </Sidebar>
        );
    }

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={roleNav.home.url} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
