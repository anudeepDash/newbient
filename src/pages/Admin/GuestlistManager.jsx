import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import TicketingManagement from './TicketingManagement';

/*
 * App · Community → Guestlists: the ticketing screens fixed to guestlists (the
 * list, each event's Guestlist tab with requests, tasks and capacity, check-in,
 * export, and "New guestlist"). Old ?id= links open that guestlist.
 */
const GuestlistManager = () => {
    const [params] = useSearchParams();
    const id = params.get('id');
    if (id) return <Navigate to={`/admin/guestlists?eventId=${encodeURIComponent(id)}&tab=guestlist`} replace />;
    return <TicketingManagement mode="guestlists" />;
};

export default GuestlistManager;
