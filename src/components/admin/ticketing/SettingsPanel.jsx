import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Unlock from 'lucide-react/dist/esm/icons/unlock';
import Home from 'lucide-react/dist/esm/icons/home';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Ban from 'lucide-react/dist/esm/icons/ban';
import TicketX from 'lucide-react/dist/esm/icons/ticket-x';
import { useStore } from '../../../lib/store';
import { notifyEvent } from '../../../lib/mailApi';
import { Button, Badge } from '../ui';
import PaymentSettingsPanel from './PaymentSettingsPanel';
import { Panel, PanelTitle, useConfirm, useBusy } from './kit';
import { hasGuestlist } from './events';
import { deleteOrders } from './deleteOrders';
import { SOLD_STATUSES } from '../../../lib/ticketing';

/*
 * Settings for one event in Ticketing. Each thing is edited in one place:
 * payments here; event details, ticket types and capacity in Events; a
 * standalone guestlist (made here, not in Events) here. "Tell pass holders"
 * messages everyone with a pass about a change, or cancels the event. "Delete"
 * takes the ticket sale down or deletes the event, with its orders.
 */

const Row = ({ label, children }) => (
    <div className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
        <span className="text-gray-500">{label}</span>
        <span className="text-right font-semibold">{children}</span>
    </div>
);

// A guestlist is "on the home page" when an upcoming event points at it.
const homeEventFor = (gl, upcomingEvents) => (upcomingEvents || []).find(e =>
    e.guestlistId === gl.id || e.id === gl.id || (e.title === gl.title && e.category === 'guestlist'));

const StandaloneGuestlist = ({ gl, onEdit, onDeleted }) => {
    const addToast = useStore(s => s.addToast);
    const upcomingEvents = useStore(s => s.upcomingEvents);
    const [busy, run] = useBusy();
    const [ask, confirmSheet] = useConfirm();
    const home = homeEventFor(gl, upcomingEvents);
    const closed = gl.status === 'Closed';

    const toggleOpen = () => run('status', 'status', async () => {
        await useStore.getState().updateGuestlist(gl.id, { status: closed ? 'Open' : 'Closed' });
        addToast(closed ? 'Guestlist is open for sign-ups.' : 'No one new can sign up.', 'success', closed ? undefined : { title: 'Guestlist closed' });
    });

    const toggleHome = () => {
        if (home) {
            ask({
                title: 'Take it off the home page?',
                body: `"${gl.title}" stops showing under upcoming events. The guestlist and its sign-ups stay.`,
                confirmLabel: 'Remove from home',
                action: async () => {
                    await useStore.getState().deleteUpcomingEvent(home.id);
                    addToast('Removed from the home page.', 'info');
                },
            });
            return;
        }
        run('home', 'home', async () => {
            await useStore.getState().addUpcomingEvent({
                title: gl.title,
                description: gl.description || '',
                image: gl.image || '',
                location: gl.location || 'Venue',
                date: gl.date || new Date().toISOString(),
                buttonText: 'Join guestlist',
                highlightColor: gl.highlightColor || '#2ebfff',
                isGuestlistEnabled: gl.guestlistEnabled !== undefined ? gl.guestlistEnabled : true,
                guestlistMode: gl.guestlistMode || 'qr',
                perUserLimit: gl.perUserLimit || 2,
                hasGuestlistTask: !!gl.hasGuestlistTask,
                guestlistTask: gl.guestlistTask || null,
                category: 'guestlist',
                guestlistId: gl.id,
                link: `/ticket/${gl.id}`,
            });
            addToast('Added to upcoming events on the home page.', 'success');
        });
    };

    const remove = () => ask({
        title: `Delete "${gl.title}"?`,
        body: `The guestlist${home ? ' and its home page event are' : ' is'} removed and people can't sign up any more. Existing passes stop showing here. This can't be undone.`,
        confirmLabel: 'Delete guestlist',
        danger: true,
        action: async () => {
            await useStore.getState().deleteGuestlist(gl.id);
            addToast('Guestlist deleted.', 'success');
            onDeleted?.();
        },
    });

    return (
        <Panel className="p-4 sm:p-5">
            <PanelTitle icon={ListChecks} tone="fuchsia" title="Guestlist" hint="Made in Ticketing, so its details are edited here"
                action={<Button variant="accent" className="h-11" onClick={() => onEdit(gl)}><Pencil size={14} /> Edit</Button>} />
            <div className="flex flex-wrap gap-1.5">
                <Badge tone={closed ? 'red' : gl.status === 'Filling Fast' ? 'amber' : 'green'}>{closed ? 'Closed' : gl.status === 'Filling Fast' ? 'Filling fast' : 'Open'}</Badge>
                {home && <Badge tone="blue"><Home size={10} /> On the home page</Badge>}
                {gl.isPinned && <Badge tone="violet">Featured</Badge>}
                {gl.guestlistEnabled === false && <Badge tone="gray">External sign-up</Badge>}
            </div>
            <div className="mt-3 divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                {gl.guestlistEnabled === false ? (
                    <Row label="Sign-up link">
                        <a href={gl.externalLink} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[16rem] items-center gap-1 truncate text-sky-600 dark:text-neon-blue">{gl.externalLink} <ExternalLink size={11} /></a>
                    </Row>
                ) : (
                    <>
                        <Row label="Capacity">{gl.currentSpots || 0} taken of {gl.maxSpots || 'no limit'}</Row>
                        <Row label="Spots per person">{gl.perUserLimit || 2}</Row>
                        <Row label="Entry">{gl.guestlistMode === 'rsvp' ? 'RSVP only, no QR' : 'QR pass'}</Row>
                        <Row label="Task to apply">{gl.hasGuestlistTask ? (gl.guestlistTask?.reviewRequired === false ? 'Yes, auto-approved' : 'Yes, reviewed') : 'No'}</Row>
                    </>
                )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" className="h-11" onClick={toggleOpen} disabled={Boolean(busy.status)}>
                    {closed ? <><Unlock size={14} /> Open sign-ups</> : <><Lock size={14} /> Close sign-ups</>}
                </Button>
                <Button variant="secondary" className="h-11" onClick={toggleHome} disabled={Boolean(busy.home)}>
                    <Home size={14} /> {busy.home ? 'Adding…' : home ? 'Remove from home' : 'Show on home page'}
                </Button>
                <Button variant="ghost" className="h-11 text-red-600 dark:text-red-400" onClick={remove}><Trash2 size={14} /> Delete</Button>
            </div>
            {confirmSheet}
        </Panel>
    );
};

/* A text box inside a confirm sheet; what's typed goes into `into` (a ref). */
const SheetText = ({ into, label, placeholder, hint }) => {
    const [value, setValue] = useState('');
    into.current = value;
    return (
        <div className="space-y-1.5">
            <label htmlFor="pass-holders-text" className="block text-[13px] font-bold text-gray-800 dark:text-zinc-200">{label}</label>
            <input id="pass-holders-text" value={value} onChange={(e) => setValue(e.target.value)} maxLength={200} autoFocus placeholder={placeholder}
                className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-[14px] dark:border-white/10 dark:bg-white/5" />
            {hint && <p className="text-[12px] text-gray-500">{hint}</p>}
        </div>
    );
};

const ROUNDS = 8;

const TellPassHolders = ({ event }) => {
    const addToast = useStore(s => s.addToast);
    const [ask, confirmSheet] = useConfirm();
    const [count, setCount] = useState(null);
    const text = useRef('');
    const ids = { eventId: event.id, guestlistIds: event.guestlistIds || (event.guestlistDoc ? [event.guestlistDoc.id] : []) };

    useEffect(() => {
        let live = true;
        notifyEvent('event-changed', { ...ids, countOnly: true }).then(r => { if (live && r?.success) setCount(r.count); });
        return () => { live = false; };
    }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Big events go in rounds; each pass is only ever sent one message per notice.
    const send = async (kind, payload) => {
        let sent = 0;
        let res = null;
        for (let i = 0; i < ROUNDS; i++) {
            res = await notifyEvent(kind, { ...ids, ...payload });
            if (!res?.success) throw new Error(res?.error || "Couldn't send that.");
            sent += res.sent || 0;
            if (!res.remaining) break;
        }
        return { sent, remaining: res?.remaining || 0 };
    };

    const who = count === null ? 'everyone with a pass' : `${count} ${count === 1 ? 'person' : 'people'} with a pass`;

    const tellChange = () => ask({
        title: 'Tell pass holders about a change',
        body: (
            <>
                <p>Goes to {who} as a WhatsApp, a push and an in-app note. Their passes keep working. Change the event itself in Events first.</p>
                <SheetText into={text} label="What changed" placeholder="Doors now open at 5:00 PM (was 4:00 PM)" hint="One line, said the way you'd tell a friend." />
            </>
        ),
        confirmLabel: 'Send',
        busyLabel: 'Sending…',
        action: async () => {
            if (text.current.trim().length < 5) throw new Error('Say what changed (a few words).');
            const out = await send('event-changed', { change: text.current.trim() });
            addToast(out.remaining ? `${out.remaining} still to send. Send it again to finish.` : `${out.sent} ${out.sent === 1 ? 'person was' : 'people were'} told.`, out.remaining ? 'warning' : 'success', { title: 'Change sent' });
        },
    });

    const cancelEvent = () => ask({
        title: `Cancel ${event.title || 'this event'}?`,
        body: (
            <>
                <p>Every pass for it stops working, the guestlist closes to new sign-ups, and {who} {count === 1 ? 'is' : 'are'} told. Refunds are still sent by hand. Hide or delete the event page in Events afterwards.</p>
                <SheetText into={text} label="Refund" placeholder="₹1,499 back to your UPI in 5–7 working days" hint="Leave it empty for free passes: they're told there's nothing to refund." />
            </>
        ),
        confirmLabel: 'Cancel event',
        cancelLabel: 'Keep it',
        busyLabel: 'Cancelling…',
        danger: true,
        action: async () => {
            const out = await send('event-cancelled', { refund: text.current.trim() });
            setCount(0);
            addToast(out.remaining ? `${out.remaining} still to tell. Run it again to finish.` : `${out.sent} ${out.sent === 1 ? 'pass' : 'passes'} cancelled and their holders told.`, out.remaining ? 'warning' : 'success', { title: 'Event cancelled' });
        },
    });

    return (
        <Panel className="p-4 sm:p-5">
            <PanelTitle icon={Megaphone} tone="amber" title="Tell pass holders"
                hint={count === null ? 'Message everyone holding a pass for this event.' : `${count} ${count === 1 ? 'person holds' : 'people hold'} a pass for this event.`} />
            <div className="flex flex-wrap gap-2">
                <Button variant="secondary" className="h-11" onClick={() => { text.current = ''; tellChange(); }} disabled={count === 0}><Megaphone size={14} /> Tell them about a change</Button>
                <Button variant="ghost" className="h-11 text-red-600 dark:text-red-400" onClick={() => { text.current = ''; cancelEvent(); }}><Ban size={14} /> Cancel the event</Button>
            </div>
            {confirmSheet}
        </Panel>
    );
};

/*
 * Taking a sale down (the event stays in Events) or deleting the event. Either
 * way its orders are deleted too, so no order is left pointing at nothing, and
 * their passes stop working. Nobody is messaged: "Cancel the event" does that.
 */
const DeleteSale = ({ event, orders, onDeleted }) => {
    const addToast = useStore(s => s.addToast);
    const [ask, confirmSheet] = useConfirm();
    const sold = orders.filter(o => SOLD_STATUSES.includes(o.status));
    const name = event.title || 'this event';
    const n = orders.length;
    const ordersLine = n ? ` Its ${n} ${n === 1 ? 'order is' : 'orders are'} deleted too.` : '';
    const soldWarning = sold.length ? (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-[13px] font-semibold text-amber-700 dark:text-amber-300">
            {sold.length} {sold.length === 1 ? 'person holds a ticket' : 'people hold tickets'}. Their tickets stop working and nobody is told. To tell them and offer refunds, use Cancel the event first.
        </p>
    ) : null;

    const dropOrders = async () => {
        const failed = n ? await deleteOrders(orders, { reason: 'Ticket sale removed' }) : 0;
        if (failed) throw new Error(`${failed} ${failed === 1 ? 'order' : 'orders'} couldn't be deleted. Try again.`);
    };

    const takeDown = () => ask({
        title: 'Take down the ticket sale?',
        body: (
            <>
                <p>The tickets page for {name} goes away and nobody can book.{ordersLine} The event itself stays in Events. This can't be undone.</p>
                {soldWarning}
            </>
        ),
        confirmLabel: 'Take down sale',
        busyLabel: 'Taking down…',
        danger: true,
        action: async () => {
            await dropOrders();
            await useStore.getState().updateUpcomingEvent(event.id, { isTicketed: false });
            addToast(n ? `${n} ${n === 1 ? 'order' : 'orders'} deleted with it.` : 'Nobody can book tickets now.', 'success', { title: 'Ticket sale taken down' });
            if (!hasGuestlist(event)) onDeleted?.();
        },
    });

    const removeEvent = () => ask({
        title: `Delete ${name}?`,
        body: (
            <>
                <p>The event and its page are removed everywhere.{ordersLine}{hasGuestlist(event) ? ' Guestlist sign-ups stay in Guestlists.' : ''} This can't be undone.</p>
                {soldWarning}
            </>
        ),
        confirmLabel: 'Delete event',
        busyLabel: 'Deleting…',
        danger: true,
        action: async () => {
            await dropOrders();
            await useStore.getState().deleteUpcomingEvent(event.id);
            addToast(n ? `${n} ${n === 1 ? 'order was' : 'orders were'} deleted with it.` : `${name} is gone.`, 'success', { title: 'Event deleted' });
            onDeleted?.();
        },
    });

    return (
        <Panel className="p-4 sm:p-5">
            <PanelTitle icon={Trash2} tone="red" title="Delete"
                hint={n ? `Deleting also removes its ${n} ${n === 1 ? 'order' : 'orders'}.` : 'No orders yet, so nothing else is removed.'} />
            <div className="flex flex-wrap gap-2">
                {event.isTicketed && <Button variant="secondary" className="h-11 text-red-600 dark:text-red-400" onClick={takeDown}><TicketX size={14} /> Take down ticket sale</Button>}
                <Button variant="ghost" className="h-11 text-red-600 dark:text-red-400" onClick={removeEvent}><Trash2 size={14} /> Delete event</Button>
            </div>
            {confirmSheet}
        </Panel>
    );
};

const SettingsPanel = ({ event, orders = [], onEditGuestlist, onDeleted, onEditSale }) => {
    const fromEvents = event.source === 'event';
    return (
        <div className="space-y-5">
            {event.isTicketed && fromEvents && <PaymentSettingsPanel event={event} onEdit={onEditSale} />}
            {event.isTicketed && !fromEvents && (
                <Panel className="p-4 text-[13px] text-gray-600 dark:text-zinc-400 sm:p-5">
                    This event is archived, so ticket sales and payment details can't change any more.
                </Panel>
            )}

            {event.guestlistDoc && (
                <StandaloneGuestlist gl={event.guestlistDoc} onEdit={onEditGuestlist} onDeleted={onDeleted} />
            )}

            <TellPassHolders event={event} />

            {fromEvents && (
                <Panel className="p-4 sm:p-5">
                    <PanelTitle icon={Calendar} tone="green" title="Event details"
                        hint={event.isTicketed
                            ? 'The event page, ticket types, venue map and payments are edited in the sale editor.'
                            : `Name, date${hasGuestlist(event) && !event.guestlistDoc ? ', guestlist rules' : ''} and the page people see are edited in Events.`}
                        action={event.isTicketed && onEditSale
                            ? <Button variant="secondary" className="h-11" onClick={() => onEditSale()}><Pencil size={14} /> Edit sale</Button>
                            : <Button as={Link} to={`/admin/upcoming-events?edit=${encodeURIComponent(event.id)}`} variant="secondary" className="h-11"><Pencil size={14} /> Edit in Events</Button>} />
                    {hasGuestlist(event) && !event.guestlistDoc && (
                        <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            <Row label="Spots per person">{event.perUserLimit || 5}</Row>
                            <Row label="Entry">{event.guestlistMode === 'rsvp' ? 'RSVP only, no QR' : 'QR pass'}</Row>
                            <Row label="Task to apply">{event.hasGuestlistTask ? 'Yes' : 'No'}</Row>
                        </div>
                    )}
                </Panel>
            )}

            {fromEvents && <DeleteSale event={event} orders={orders} onDeleted={onDeleted} />}
        </div>
    );
};

export default SettingsPanel;
