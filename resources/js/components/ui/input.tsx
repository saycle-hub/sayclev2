import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                'flex h-10 w-full rounded-md border border-[#8FB996]/60 bg-white px-3 py-2 text-base text-[#111D13] ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#111D13] placeholder:text-[#111D13]/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#709775]/30 focus-visible:border-[#709775] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                className,
            )}
            ref={ref}
            {...props}
        />
    );
});

Input.displayName = 'Input';

export { Input };
