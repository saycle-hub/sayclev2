import { useCallback, useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'saycle.pwa.install.dismissed';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Bottom install banner. Shows only when the browser fires
 * `beforeinstallprompt` and the user has not dismissed it before.
 * Non-blocking, dismissible, design-system colors.
 */
export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (localStorage.getItem(DISMISS_KEY) === '1') {
            return;
        }

        const onPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setVisible(true);
        };

        const onInstalled = () => {
            setVisible(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    const install = useCallback(async () => {
        if (! deferredPrompt) return;
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        // Hide regardless of outcome; browser won't re-fire for a while.
        setVisible(false);
        setDeferredPrompt(null);
    }, [deferredPrompt]);

    const dismiss = useCallback(() => {
        localStorage.setItem(DISMISS_KEY, '1');
        setVisible(false);
    }, []);

    if (! visible || ! deferredPrompt) return null;

    return (
        <div
            role="region"
            aria-label="Pasang aplikasi"
            className="fixed inset-x-3 bottom-3 z-50 md:left-auto md:right-6 md:w-96"
        >
            <div className="flex items-center gap-3 rounded-2xl border border-[#2f6848]/20 bg-[#18352a] p-4 shadow-lg">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#f4f3ed]">Pasang SayCle di perangkat Anda</p>
                    <p className="mt-0.5 text-xs text-[#f4f3ed]/70">Akses lebih cepat dari layar utama.</p>
                </div>
                <button
                    type="button"
                    onClick={install}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[#e88c12] px-4 text-sm font-semibold text-[#18352a] transition-colors hover:bg-[#e88c12]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18352a]"
                >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Pasang
                </button>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Tutup ajakan pemasangan"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#f4f3ed]/70 transition-colors hover:bg-white/10 hover:text-[#f4f3ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e88c12]"
                >
                    <X className="h-5 w-5" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
