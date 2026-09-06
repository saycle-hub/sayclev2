import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavGroup } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BarChart3, ClipboardList, FileText, HandCoins, Handshake, Layers, LayoutGrid, Package, Route, Scale, Tags, Truck, Users, Inbox, UserCog } from 'lucide-react';
import AppLogo from './app-logo';

const navByRole: Record<string, { homeUrl: string; groups: NavGroup[] }> = {
    admin: {
        homeUrl: '/dashboard',
        groups: [
            {
                title: 'Utama',
                items: [
                    { title: 'Dasbor', url: '/dashboard', icon: LayoutGrid },
                    { title: 'Statistik', url: '/stats', icon: BarChart3 },
                ],
            },
            {
                title: 'Logistik & Rute',
                items: [
                    { title: 'Rute Penjemputan', url: '/routes', icon: Route },
                    { title: 'Rute Pengiriman', url: '/delivery-routes', icon: Truck },
                    { title: 'Kendaraan', url: '/vehicles', icon: Truck },
                ],
            },
            {
                title: 'Stok & Alokasi',
                items: [
                    { title: 'Stok Gudang', url: '/stock', icon: Package },
                    { title: 'Laporan Pemasok', url: '/supplier-reports', icon: Inbox },
                    { title: 'Alokasi Stok', url: '/allocation', icon: Layers },
                    { title: 'Asal-Usul Pasokan', url: '/provenance', icon: Layers },
                ],
            },
            {
                title: 'Mitra & Kontrak',
                items: [
                    { title: 'Mitra', url: '/partners', icon: Users },
                    { title: 'Kontrak', url: '/contracts', icon: Handshake },
                    { title: 'Harga Grade', url: '/prices', icon: Tags },
                ],
            },
            {
                title: 'Pengaturan',
                items: [
                    { title: 'Pengguna & Petugas', url: '/users', icon: UserCog },
                ],
            },
        ],
    },
    officer: {
        homeUrl: '/officer',
        groups: [
            {
                title: 'Petugas Lapangan',
                items: [
                    { title: 'Beranda', url: '/officer', icon: LayoutGrid },
                    { title: 'Tugas', url: '/officer/tasks', icon: ClipboardList },
                    { title: 'Rute Penjemputan', url: '/officer/routes', icon: Route },
                    { title: 'Penimbangan', url: '/officer/weighing', icon: Scale },
                ],
            },
        ],
    },
    partner: {
        homeUrl: '/partner',
        groups: [
            {
                title: 'Portal Mitra',
                items: [
                    { title: 'Beranda', url: '/partner', icon: LayoutGrid },
                    { title: 'Pengiriman', url: '/partner/deliveries', icon: Truck },
                    { title: 'Kontrak', url: '/partner/contract', icon: FileText },
                    { title: 'Tagihan', url: '/partner/billing', icon: HandCoins },
                ],
            },
        ],
    },
};

export function AppSidebar() {
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;
    const roleNav = navByRole[auth.user.role] ?? { homeUrl: '/dashboard', groups: navByRole.admin.groups };

    return (
        <Sidebar collapsible="icon" variant="floating" className="p-3.5">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={roleNav.homeUrl} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain groups={roleNav.groups} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

