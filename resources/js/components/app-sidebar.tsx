import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid } from 'lucide-react';
import AppLogo from './app-logo';

const navByRole: Record<string, NavItem[]> = {
 admin: [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutGrid,
    },
 { title: 'Stock', url: '/stock' }, { title: 'Partners', url: '/partners' }, { title: 'Contracts', url: '/contracts' }, { title: 'Routes', url: '/routes' }, { title: 'Tasks', url: '/tasks' }, { title: 'Prices', url: '/prices' }, { title: 'Stats', url: '/stats' }],
 officer: [{ title: 'Tasks', url: '/officer/tasks' }, { title: 'Routes', url: '/officer/routes' }, { title: 'Weighing', url: '/officer/weighing' }],
 partner: [{ title: 'Deliveries', url: '/partner/deliveries' }, { title: 'Contract', url: '/partner/contract' }, { title: 'Billing', url: '/partner/billing' }],
};

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        url: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        url: 'https://laravel.com/docs/starter-kits',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;
    const mainNavItems = [{ title: 'Home', url: `/${auth.user.role === 'admin' ? 'dashboard' : auth.user.role}`, icon: LayoutGrid }, ...(navByRole[auth.user.role] ?? [])];
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={mainNavItems[0].url} prefetch>
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
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
