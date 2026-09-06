import { cn } from '@/lib/utils';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const DISMISS_MS = 5000;

/**
 * Mobile-optimized floating popup toast notification for Inertia `flash.success` / `flash.error`.
 * Rendered floating at top of screen with backdrop blur, shadow, and smooth animation.
 */
export function FlashBanner() {
    const { flash } = usePage<SharedData>().props;
    const [dismissed, setDismissed] = useState<string | null>(null);

    useEffect(() => {
        setDismissed(null);
    }, [flash.success, flash.error]);

    const message = flash.success ?? flash.error;
    const isSuccess = Boolean(flash.success);

    useEffect(() => {
        if (!message) return;
        const timer = window.setTimeout(() => setDismissed(message), DISMISS_MS);
        return () => window.clearTimeout(timer);
    }, [message]);

    if (!message || dismissed === message) return null;

    const Icon = isSuccess ? CheckCircle2 : AlertCircle;

    return (
        <div 
            aria-live="assertive" 
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md pointer-events-auto transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-4"
        >
            <div
                className={cn(
                    'flex items-center gap-3.5 rounded-2xl p-4 shadow-2xl backdrop-blur-md border border-white/20 text-white',
                    isSuccess
                        ? 'bg-[#18352a]/95 text-white shadow-emerald-950/20'
                        : 'bg-red-900/95 text-white shadow-red-950/20',
                )}
            >
                <div
                    className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-inner',
                        isSuccess ? 'bg-[#2f6848] text-emerald-200' : 'bg-red-800 text-red-100',
                    )}
                >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-75">
                        {isSuccess ? 'Notifikasi Sukses' : 'Peringatan Sistem'}
                    </p>
                    <p className="text-xs sm:text-sm font-bold leading-snug text-white mt-0.5">
                        {message}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setDismissed(message)}
                    aria-label="Tutup notifikasi"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white opacity-80 transition-opacity hover:bg-white/20 hover:opacity-100 active:scale-95 focus-visible:outline-none"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
