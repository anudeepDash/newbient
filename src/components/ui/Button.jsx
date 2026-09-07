import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

const Button = React.forwardRef(({ className, variant = 'primary', size = 'md', children, as: Component = 'button', ...props }, ref) => {
    const variants = {
        primary: 'bg-neon-pink text-white hover:bg-neon-pink/90 active:scale-95',
        secondary: 'bg-neon-green text-black font-extrabold hover:bg-neon-green/90 active:scale-95',
        outline: 'border-2 border-neon-blue text-neon-blue hover:bg-neon-blue/10 active:scale-95',
        ghost: 'text-gray-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95',
        black: 'bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 active:scale-95 shadow-md',
        white: 'bg-white text-gray-900 hover:bg-gray-100 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 border border-gray-200 dark:border-white/10 active:scale-95 shadow-sm',
        blue: 'bg-neon-blue text-black font-extrabold hover:bg-neon-blue/90 active:scale-95',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    const MotionComponent = motion[Component] || motion.button;

    return (
        <MotionComponent
            ref={ref}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
                'inline-flex items-center justify-center rounded-2xl font-bold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {children}
        </MotionComponent>
    );
});

Button.displayName = 'Button';

export { Button };
