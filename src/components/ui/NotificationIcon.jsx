import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Bell, Megaphone, Ticket, MessageSquare, Gift, FileText, Sparkles, Users, Heart, CalendarDays, ClipboardList, Star } from 'lucide-react';
import { cn } from '../../lib/utils';

// Premium, SF-Symbols-style icons for banners and the notification centre:
// a vivid gradient disc with a crisp white glyph and a soft coloured glow.
// Status glyphs draw themselves in when they appear.

// [top, bottom] of each disc's gradient.
const TONES = {
    success: ['#4ade80', '#16a34a'],
    error: ['#fb7185', '#e11d48'],
    warning: ['#fcd34d', '#f59e0b'],
    info: ['#60a5fa', '#2563eb'],
    pink: ['#f9a8d4', '#db2777'],
    violet: ['#c4b5fd', '#7c3aed'],
    cyan: ['#67e8f9', '#0891b2'],
    rose: ['#fda4af', '#e11d48'],
    amber: ['#fcd34d', '#d97706'],
    slate: ['#94a3b8', '#475569'],
    green: ['#6ee7b7', '#059669'],
};

const Orb = ({ tone, size, className, children }) => {
    const [top, bottom] = TONES[tone] || TONES.info;
    return (
        <span
            className={cn('relative shrink-0 inline-flex items-center justify-center rounded-full text-white', className)}
            style={{
                width: size,
                height: size,
                background: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 2px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.12), 0 3px 12px -3px ${bottom}b3`,
            }}
        >
            {children}
        </span>
    );
};

const STATUS_PATHS = {
    success: ['M6.75 12.4 10.4 16 17.25 8.75'],
    error: ['M8.25 8.25 15.75 15.75', 'M15.75 8.25 8.25 15.75'],
    warning: ['M12 7v6.25'],
    info: ['M12 11v5.75'],
};

/** Animated status glyph: tick, cross, exclamation or info. */
export const StatusIcon = ({ type = 'info', size = 34 }) => {
    const reduceMotion = useReducedMotion();
    const paths = STATUS_PATHS[type] || STATUS_PATHS.info;
    const glyph = Math.round(size * 0.64);
    const draw = (i) => reduceMotion
        ? {}
        : {
            initial: { pathLength: 0, opacity: 0 },
            animate: { pathLength: 1, opacity: 1 },
            transition: { pathLength: { delay: 0.12 + i * 0.1, duration: 0.38, ease: [0.65, 0, 0.35, 1] }, opacity: { delay: 0.12 + i * 0.1, duration: 0.05 } },
        };

    return (
        <Orb tone={type} size={size}>
            <svg style={{ filter: 'drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.2))' }} width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {paths.map((d, i) => <motion.path key={d} d={d} {...draw(i)} />)}
                {type === 'warning' && <motion.circle cx="12" cy="16.9" r="1.25" fill="currentColor" stroke="none" {...(reduceMotion ? {} : { initial: { scale: 0 }, animate: { scale: 1 }, transition: { delay: 0.4, type: 'spring', stiffness: 500, damping: 18 } })} />}
                {type === 'info' && <motion.circle cx="12" cy="7.4" r="1.25" fill="currentColor" stroke="none" {...(reduceMotion ? {} : { initial: { scale: 0 }, animate: { scale: 1 }, transition: { delay: 0.12, type: 'spring', stiffness: 500, damping: 18 } })} />}
            </svg>
        </Orb>
    );
};

const CATEGORIES = [
    [/volunteer|squad/, Heart, 'rose'],
    [/gig|hiring/, Users, 'cyan'],
    [/giveaway|winner|won/, Gift, 'amber'],
    [/campaign|task/, Sparkles, 'violet'],
    [/ticket|booking|payment/, Ticket, 'pink'],
    [/guestlist/, Star, 'amber'],
    [/event/, CalendarDays, 'violet'],
    [/form/, ClipboardList, 'slate'],
    [/message|admin_message|contact/, MessageSquare, 'green'],
    [/blog|post|article/, FileText, 'slate'],
    [/announcement/, Megaphone, 'info'],
];

/** Old notifications carry auto-generated emoji pictures as data URLs; only show real images. */
export const isRealNotificationImage = (src) => Boolean(src) && !String(src).startsWith('data:image');

/** Category icon for an in-app notification (or its real image, when it has one). */
export const NotificationIcon = ({ notification, size = 34, muted = false }) => {
    const [imgError, setImgError] = useState(false);
    const image = notification?.image;

    if (isRealNotificationImage(image) && !imgError) {
        return (
            <span
                className="relative shrink-0 inline-block rounded-full overflow-hidden"
                style={{ width: size, height: size, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25), 0 4px 12px -4px rgba(0,0,0,0.4)' }}
            >
                <img src={image} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} draggable={false} />
            </span>
        );
    }

    const text = `${notification?.type || notification?.category || ''} ${notification?.title || ''}`.toLowerCase();
    const [, Icon, tone] = CATEGORIES.find(([pattern]) => pattern.test(text)) || [null, Bell, 'info'];
    return (
        <Orb tone={muted ? 'slate' : tone} size={size}>
            <Icon size={Math.round(size * 0.5)} strokeWidth={2.1} aria-hidden="true" style={{ filter: 'drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.2))' }} />
        </Orb>
    );
};
