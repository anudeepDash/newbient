import React from 'react';
import { Link } from 'react-router-dom';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Unlock from 'lucide-react/dist/esm/icons/unlock';
import Home from 'lucide-react/dist/esm/icons/home';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import { useStore } from '../../../lib/store';
import { Button, Badge } from '../ui';
import PaymentSettingsPanel from './PaymentSettingsPanel';
import { Panel, PanelTitle, useConfirm, useBusy } from './kit';
import { hasGuestlist } from './events';

/*
 * Settings for one event in Ticketing. Each thing is edited in one place:
 * payments here; event details, ticket types and capacity in Events; a
 * standalone guestlist (made here, not in Events) here.
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
        addToast(closed ? 'Guestlist is open for sign-ups.' : 'Guestlist closed. No new sign-ups.', 'success');
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

const SettingsPanel = ({ event, onEditGuestlist, onDeleted }) => {
    const fromEvents = event.source === 'event';
    return (
        <div className="space-y-5">
            {event.isTicketed && fromEvents && <PaymentSettingsPanel event={event} />}
            {event.isTicketed && !fromEvents && (
                <Panel className="p-4 text-[13px] text-gray-600 dark:text-zinc-400 sm:p-5">
                    This event is archived, so ticket sales and payment details can't change any more.
                </Panel>
            )}

            {event.guestlistDoc && (
                <StandaloneGuestlist gl={event.guestlistDoc} onEdit={onEditGuestlist} onDeleted={onDeleted} />
            )}

            {fromEvents && (
                <Panel className="p-4 sm:p-5">
                    <PanelTitle icon={Calendar} tone="green" title="Event details"
                        hint={`Name, date, ticket types, capacity${hasGuestlist(event) && !event.guestlistDoc ? ', guestlist rules' : ''} and the page people see are edited in Events.`}
                        action={<Button as={Link} to={`/admin/upcoming-events?edit=${encodeURIComponent(event.id)}`} variant="secondary" className="h-11"><Pencil size={14} /> Edit in Events</Button>} />
                    {hasGuestlist(event) && !event.guestlistDoc && (
                        <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            <Row label="Spots per person">{event.perUserLimit || 5}</Row>
                            <Row label="Entry">{event.guestlistMode === 'rsvp' ? 'RSVP only, no QR' : 'QR pass'}</Row>
                            <Row label="Task to apply">{event.hasGuestlistTask ? 'Yes' : 'No'}</Row>
                        </div>
                    )}
                </Panel>
            )}
        </div>
    );
};

export default SettingsPanel;
