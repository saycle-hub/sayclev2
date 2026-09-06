import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavGroup, type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

interface NavMainProps {
    items?: NavItem[];
    groups?: NavGroup[];
}

export function NavMain({ items, groups }: NavMainProps) {
    const page = usePage();
    const currentPath = page.url.split('?')[0];

    if (groups && groups.length > 0) {
        return (
            <>
                {groups.map((group) => (
                    <SidebarGroup key={group.title} className="px-2 py-1">
                        <SidebarGroupLabel className="text-[10px] font-bold tracking-wider uppercase text-white/60 px-2 py-1">
                            {group.title}
                        </SidebarGroupLabel>
                        <SidebarMenu>
                            {group.items.map((item) => {
                                const itemPath = item.url.split('?')[0];
                                const isActive = currentPath === itemPath;
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild isActive={isActive}>
                                            <Link href={item.url} prefetch>
                                                {item.icon && <item.icon />}
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </>
        );
    }

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarMenu>
                {(items ?? []).map((item) => {
                    const itemPath = item.url.split('?')[0];
                    const isActive = currentPath === itemPath;
                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={isActive}>
                                <Link href={item.url} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}

