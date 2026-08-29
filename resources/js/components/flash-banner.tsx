import { cn } from '@/lib/utils';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const DISMISS_MS = 6000;

/**
 * Global flash banner for Inertia `flash.success` / `flash.error` shared props.
 * Announced via aria-live and auto-dismissed after a short delay.
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

    const Icon = isSuccess ? CheckCircle2 : CircleAlert;

    return (
        <div aria-live="polite" className="px-4 pt-4 md:px-6">
            <div
                className={cn(
                    'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
                    isSuccess ? 'border-[#2f6848]/30 bg-[#2f6848]/10 text-[#18352a]' : 'border-red-300 bg-red-50 text-red-800',
                )}
            >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="flex-1 font-medium">{message}</p>
                <button
                    type="button"
                    onClick={() => setDismissed(message)}
                    aria-label="Tutup notifikasi"
                    className="rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-[#e88c12] focus-visible:outline-none"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
