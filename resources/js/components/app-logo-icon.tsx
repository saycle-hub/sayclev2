import { Leaf } from 'lucide-react';

/**
 * SayCle leaf-mark: compost-green rounded square with a single leaf glyph.
 */
export default function AppLogoIcon({ className }: { className?: string }) {
    return (
        <div className={`flex items-center justify-center rounded-xl bg-white text-[#415D43] shadow-sm ${className ?? ''}`}>
            <Leaf className="h-[60%] w-[60%] text-[#415D43]" aria-hidden="true" />
        </div>
    );
}
