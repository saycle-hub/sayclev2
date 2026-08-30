import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import {
    defineConfig
} from 'vite';
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.jsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
        // PWA (Fase 9): precache build assets, autoUpdate SW,
        // standalone app shell. See PLAN.md Fase 9.
        VitePWA({
            registerType: 'autoUpdate',
            // Explicit scope: plugin defaults to Vite base (/build/ under
            // laravel-vite-plugin), which would confine the SW to /build/*
            // and kill installability + offline for real pages.
            scope: '/',
            includeAssets: ['favicon.ico', 'logo.svg', 'robots.txt'],
            manifest: {
                name: 'SayCle',
                short_name: 'SayCle',
                description: 'Circular dispatch untuk sisa sayuran',
                lang: 'id',
                theme_color: '#18352a',
                background_color: '#f4f3ed',
                display: 'standalone',
                start_url: '/',
                scope: '/',
                icons: [
                    { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                ],
            },
            workbox: {
                // Inertia navigations are full page loads; serve the app
                // shell for any navigation miss (deep links while offline).
                navigateFallback: '/',
                globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
                runtimeCaching: [],
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
    esbuild: {
        jsx: 'automatic',
    },
});