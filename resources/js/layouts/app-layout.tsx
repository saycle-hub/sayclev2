import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';

interface AppLayoutProps {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    title?: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
}

export default ({ children, breadcrumbs, title, description, actions, ...props }: AppLayoutProps) => (
    <AppLayoutTemplate breadcrumbs={breadcrumbs} title={title} description={description} actions={actions} {...props}>
        {children}
    </AppLayoutTemplate>
);
