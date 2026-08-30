import { useEffect, useRef, useState } from 'react';

interface Stop {
    lat: number;
    lng: number;
    order: number;
    label: string;
    color: string;
}

interface RouteLine {
    color: string;
    points: [number, number][];
}

interface RouteMapProps {
    depot: { lat: number; lng: number };
    stops: Stop[];
    lines: RouteLine[];
    className?: string;
}

export function RouteMap({ depot, stops, lines, className = '' }: RouteMapProps) {
    const ref = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setReady(true);
        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, []);

    const stopsKey = JSON.stringify(stops);
    const linesKey = JSON.stringify(lines);

    useEffect(() => {
        if (!ready || !ref.current) return;

        let cancelled = false;

        (async () => {
            const L = await import('leaflet');
            await import('leaflet/dist/leaflet.css');

            if (cancelled || !ref.current) return;

            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }

            const map = L.default.map(ref.current, {
                scrollWheelZoom: false,
                attributionControl: true,
            });

            L.default
                .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
                    maxZoom: 18,
                })
                .addTo(map);

            // Depot marker
            L.default.circleMarker([depot.lat, depot.lng], {
                radius: 8,
                color: '#18352a',
                fillColor: '#18352a',
                fillOpacity: 1,
                weight: 2,
            }).addTo(map).bindTooltip('Gudang');

            // Vehicle route lines
            for (const line of lines) {
                if (line.points.length < 2) continue;
                L.default.polyline(line.points, {
                    color: line.color,
                    weight: 3,
                    opacity: 0.75,
                }).addTo(map);
            }

            // Stop markers with numbered pins
            for (const stop of stops) {
                const icon = L.default.divIcon({
                    className: '',
                    html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${stop.color};color:#f4f3ed;font:600 11px/1 system-ui;border:2px solid #f4f3ed;box-shadow:0 1px 3px rgba(24,53,42,.4)">${stop.order}</div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                });
                L.default.marker([stop.lat, stop.lng], { icon }).addTo(map).bindTooltip(stop.label);
            }

            // Fit bounds
            const allPoints: [number, number][] = [
                [depot.lat, depot.lng],
                ...stops.map((s) => [s.lat, s.lng] as [number, number]),
            ];
            if (allPoints.length > 1) {
                map.fitBounds(L.default.latLngBounds(allPoints), { padding: [32, 32] });
            } else {
                map.setView([depot.lat, depot.lng], 13);
            }

            mapRef.current = map;
        })();

        return () => {
            cancelled = true;
        };
    }, [ready, depot.lat, depot.lng, stops, lines, stopsKey, linesKey]);

    return <div ref={ref} className={`z-0 ${className}`} />;
}
