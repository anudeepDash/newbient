import React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                'flex h-12 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-gray-400 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            ref={ref}
            {...props}
        />
    );
});

Input.displayName = 'Input';

export { Input };
