import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BarChart3, ClipboardList, FileText, HandCoins, Handshake, LayoutGrid, Package, Route, Scale, Tags, Truck, Users } from 'lucide-react';
import AppLogo from './app-logo';

const navByRole: Record<string, { home: NavItem; items: NavItem[] }> = {
    admin: {
        home: { title: 'Dasbor', url: '/dashboard', icon: LayoutGrid },
        items: [
            { title: 'Stok', url: '/stock', icon: Package },
            { title: 'Mitra', url: '/partners', icon: Users },
            { title: 'Kontrak', url: '/contracts', icon: Handshake },
            { title: 'Rute', url: '/routes', icon: Route },
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
