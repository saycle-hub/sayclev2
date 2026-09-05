import { Leaf } from 'lucide-react';

/**
 * SayCle leaf-mark: compost-green rounded square with a single leaf glyph.
 */
export default function AppLogoIcon({ className }: { className?: string }) {
    return (
        <div className={`flex items-center justify-center rounded-lg bg-[#2f6848] ${className ?? ''}`}>
            <Leaf className="h-[60%] w-[60%] text-[#f4f3ed]" aria-hidden="true" />
        </div>
    );
}
