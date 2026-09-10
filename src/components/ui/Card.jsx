import React from 'react';
import { cn } from '../../lib/utils';

const Card = React.forwardRef(({ className, children, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                'glass-card p-6 text-gray-900 dark:text-white transition-all duration-300 hover:border-black/10 dark:hover:border-white/30',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
});

Card.displayName = 'Card';

export { Card };
