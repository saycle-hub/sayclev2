import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { FlashBanner } from '@/components/flash-banner';
import { type BreadcrumbItem } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
    title,
    description,
    actions,
}: {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    title?: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
}) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} title={title} description={description} actions={actions} />
                <FlashBanner />
                {children}
            </AppContent>
        </AppShell>
    );
}
