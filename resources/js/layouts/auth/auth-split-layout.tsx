import AppLogoIcon from '@/components/app-logo-icon';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import Waves from '@/components/Waves';

interface AuthLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
}

export default function AuthSplitLayout({ children, title, description }: AuthLayoutProps) {
    const { name, quote } = usePage<SharedData>().props;

    return (
        <div className="relative grid h-dvh flex-col items-center justify-center px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col overflow-hidden bg-[#2f6848] p-10 text-[#f4f3ed] lg:flex dark:border-r">
                <div className="absolute inset-0 bg-[#18352a]/20" />
                <div className="absolute inset-0 opacity-25 motion-reduce:opacity-10" aria-hidden="true">
                    <Waves lineColor="#d7e6c9" waveAmpX={24} waveAmpY={12} />
                </div>
                <Link href={route('home')} className="relative z-20 flex items-center text-lg font-medium focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6a51d]">
                    <AppLogoIcon className="mr-2 size-8 fill-current text-white" />
                    {name}
                </Link>
                <div className="relative z-20 mt-auto max-w-md pb-10">
                    <p className="mb-5 text-xs font-bold uppercase tracking-[.24em] text-[#c9dfb5]">Circular dispatch · Indonesia</p>
                    <p className="text-4xl leading-tight font-bold tracking-[-.04em]">Sisa sayur,<br /><span className="text-[#c9dfb5]">punya alur berikutnya.</span></p>
                </div>
                {quote && (
                    <div className="relative z-20 max-w-md">
                        <blockquote className="space-y-2">
                            <p className="text-lg text-[#f4f3ed]">&ldquo;{quote.message}&rdquo;</p>
                            <footer className="text-sm text-[#c9dfb5]">{quote.author}</footer>
                        </blockquote>
                    </div>
                )}
            </div>
            <div className="w-full lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <Link href={route('home')} className="relative z-20 flex items-center justify-center lg:hidden">
                        <AppLogoIcon className="h-10 fill-current text-black sm:h-12" />
                    </Link>
                    <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                        <h1 className="text-xl font-medium">{title}</h1>
                        <p className="text-muted-foreground text-sm text-balance">{description}</p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
