import * as React from 'react';
import { cn } from '@/lib/utils';
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
    <textarea
        ref={ref}
        className={cn(
            'flex min-h-20 w-full rounded-md border border-[#8FB996]/60 bg-white px-3 py-2 text-sm text-[#111D13] placeholder:text-[#111D13]/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#709775]/30 focus-visible:border-[#709775] disabled:cursor-not-allowed disabled:opacity-50',
            className,
        )}
        {...props}
    />
));
Textarea.displayName = 'Textarea';
