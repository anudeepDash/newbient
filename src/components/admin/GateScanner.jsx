import React from 'react';
import { Link } from 'react-router-dom';
import ScanLine from 'lucide-react/dist/esm/icons/scan-line';
import { accent } from './theme';
import { cn } from '../../lib/utils';

/*
 * Scanning lives on the full-screen gate scanner (/admin/scanner), which uses
 * store.scanTicket so check-ins are claimed in a transaction. This component
 * is kept for any old embed and simply links there.
 */
const GateScanner = ({ eventId }) => (
    <Link
        to={eventId ? `/admin/scanner?eventId=${encodeURIComponent(eventId)}` : '/admin/scanner'}
        className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 transition-colors hover:border-black/15 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/20"
    >
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', accent('teal').chip)}><ScanLine size={20} /></span>
        <span className="min-w-0">
            <span className="block text-[15px] font-bold">Open the gate scanner</span>
            <span className="block text-[12px] text-gray-500">Full screen, made for phones at the door</span>
        </span>
    </Link>
);

export default GateScanner;
