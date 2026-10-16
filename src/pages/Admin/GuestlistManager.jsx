import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

/*
 * Guestlists now live in Ticketing: the list (filtered to guestlists), the
 * per-event Guestlist tab (requests, tasks, capacity), check-in, export, and
 * "New guestlist" for standalone lists. This route only forwards old links.
 */
const GuestlistManager = () => {
    const [params] = useSearchParams();
    const id = params.get('id') || params.get('eventId');
    const to = id
        ? `/admin/ticketing?eventId=${encodeURIComponent(id)}&tab=guestlist`
        : '/admin/ticketing?kind=guestlist';
    return <Navigate to={to} replace />;
};

export default GuestlistManager;
