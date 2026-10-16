import { useEffect, useMemo } from 'react';
import { useStore } from '../lib/store';
import { useStoreSubscription } from './useStoreSubscription';

// Refresh the account count when a members view opens, every few minutes while
// it stays open, and when the tab comes back — so it never waits on a manual sync.
const COUNT_TTL = 2 * 60 * 1000;
const refreshCount = () => {
    const { membersCountedAt, fetchMembersCount, user } = useStore.getState();
    if (!user || Date.now() - (membersCountedAt || 0) < COUNT_TTL) return;
    useStore.setState({ membersCountedAt: Date.now() }); // one request at a time
    fetchMembersCount?.().then(count => { if (count == null) useStore.setState({ membersCountedAt: 0 }); });
};

export function useConsolidatedMembers() {
    const uid = useStore(s => s.user?.uid);
    useEffect(() => {
        if (!uid) return undefined;
        refreshCount();
        const timer = setInterval(refreshCount, COUNT_TTL + 1000);
        const onVisible = () => { if (document.visibilityState === 'visible') refreshCount(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
    }, [uid]);

    useStoreSubscription([
        'allUsers',
        'creators',
        'artists',
        'subscribers',
        'admins',
        'ticketOrders',
        'giveawayEntries',
        'clientRequests'
    ]);

    const {
        allUsers = [],
        creators = [],
        artists = [],
        subscribers = [],
        admins = [],
        ticketOrders = [],
        giveawayEntries = [],
        clientRequests = [],
        totalAuthUsers
    } = useStore();

    const members = useMemo(() => {
        const combined = [
            ...(allUsers || []),
            ...(creators || []).map(c => ({
                id: c.uid || c.id,
                email: c.email,
                displayName: c.name || c.fullName || c.displayName,
                createdAt: c.createdAt,
                hasJoinedTribe: true,
                isCreator: true,
                phone: c.phone || c.whatsapp,
                ...c
            })),
            ...(artists || []).map(a => ({
                id: a.uid || a.id,
                email: a.email,
                displayName: a.stageName || a.name || a.displayName,
                createdAt: a.createdAt,
                hasJoinedTribe: true,
                isArtist: true,
                phone: a.phone,
                ...a
            })),
            ...(admins || []).map(adm => ({
                id: adm.uid || adm.id,
                email: adm.email,
                displayName: adm.displayName || adm.name,
                createdAt: adm.createdAt,
                isAdmin: true,
                role: adm.role,
                ...adm
            })),
            ...(subscribers || []).map(s => ({
                id: s.id,
                email: s.email,
                displayName: s.displayName || s.name || (s.email ? s.email.split('@')[0] : 'Subscriber'),
                createdAt: s.createdAt,
                isSubscriber: true,
                ...s
            })),
            ...(ticketOrders || []).map(t => ({
                id: t.id || t.bookingRef,
                email: t.email || t.customerEmail,
                displayName: t.name || t.customerName || (t.email ? t.email.split('@')[0] : 'Ticket Holder'),
                createdAt: t.createdAt,
                isTicketHolder: true,
                phone: t.phone || t.customerPhone,
                ...t
            })),
            ...(giveawayEntries || []).map(g => ({
                id: g.id || g.userId,
                email: g.email,
                displayName: g.name || (g.email ? g.email.split('@')[0] : 'Participant'),
                createdAt: g.createdAt,
                isParticipant: true,
                phone: g.phone,
                ...g
            })),
            ...(clientRequests || []).map(cr => ({
                id: cr.id,
                email: cr.email,
                displayName: cr.name || cr.clientName || (cr.email ? cr.email.split('@')[0] : 'Client'),
                createdAt: cr.createdAt,
                isClient: true,
                phone: cr.phone,
                ...cr
            }))
        ];

        const memberMap = new Map();
        combined.forEach(item => {
            if (!item) return;
            const emailKey = item.email ? item.email.toLowerCase().trim() : null;
            const idKey = item.id || item.uid;
            const key = emailKey || idKey;
            if (!key) return;

            if (!memberMap.has(key)) {
                memberMap.set(key, {
                    id: idKey || key,
                    uid: idKey || key,
                    email: item.email || '',
                    displayName: item.displayName || item.fullName || item.name || (item.email ? item.email.split('@')[0] : 'UNNAMED_MEMBER'),
                    createdAt: item.createdAt || null,
                    lastActive: item.lastActive || item.createdAt || null,
                    isBlocked: item.isBlocked || false,
                    hasJoinedTribe: item.hasJoinedTribe || false,
                    isCreator: !!item.isCreator,
                    isArtist: !!item.isArtist,
                    isAdmin: !!item.isAdmin,
                    isSubscriber: !!item.isSubscriber,
                    isTicketHolder: !!item.isTicketHolder,
                    role: item.role || 'Member',
                    phone: item.phone || '',
                    ...item
                });
            } else {
                const existing = memberMap.get(key);
                memberMap.set(key, {
                    ...item,
                    ...existing,
                    id: existing.id || idKey,
                    uid: existing.uid || idKey,
                    displayName: (existing.displayName && existing.displayName !== 'UNNAMED_MEMBER')
                        ? existing.displayName
                        : (item.displayName || item.fullName || item.name || existing.displayName),
                    hasJoinedTribe: existing.hasJoinedTribe || item.hasJoinedTribe || false,
                    isBlocked: existing.isBlocked || item.isBlocked || false,
                    isCreator: existing.isCreator || !!item.isCreator,
                    isArtist: existing.isArtist || !!item.isArtist,
                    isAdmin: existing.isAdmin || !!item.isAdmin,
                    isSubscriber: existing.isSubscriber || !!item.isSubscriber,
                    isTicketHolder: existing.isTicketHolder || !!item.isTicketHolder,
                    createdAt: existing.createdAt || item.createdAt || null,
                    lastActive: existing.lastActive || item.lastActive || null,
                    phone: existing.phone || item.phone || ''
                });
            }
        });

        const list = Array.from(memberMap.values());
        return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }, [allUsers, creators, artists, subscribers, admins, ticketOrders, giveawayEntries, clientRequests]);

    const activeMembers = useMemo(() => {
        return members.filter(m => !m.isBlocked);
    }, [members]);

    const suspendedMembers = useMemo(() => {
        return members.filter(m => m.isBlocked);
    }, [members]);

    // Accounts in Firebase Auth (live), or everyone we know of if that's higher.
    const totalCount = Math.max(totalAuthUsers || 0, members.length);
    const activeCount = Math.max(0, totalCount - suspendedMembers.length);

    return {
        members,
        activeMembers,
        suspendedMembers,
        totalCount,
        activeCount,
        suspendedCount: suspendedMembers.length,
        creators,
        artists
    };
}
