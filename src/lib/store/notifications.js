import { useStore as useLegacyStore } from '../store.js';

/*
 * Notifications slice.
 *
 * The per-user listener (userId == uid, plus global ones) still lives in the
 * legacy store, started once by App.jsx for the whole site. Opening a second
 * one here would double the reads, so for now this mirrors it and forwards the
 * actions. When the landing site stops needing notifications, the listener
 * moves here.
 */

export const createNotificationsSlice = (set) => ({
    notifications: [],
    unreadCount: 0,

    _syncNotifications: (legacyState) => set({
        notifications: legacyState.notifications || [],
        unreadCount: legacyState.unreadNotificationsCount || 0,
    }),

    markNotificationRead: (id) => useLegacyStore.getState().markNotificationRead(id),
    markAllNotificationsRead: () => useLegacyStore.getState().markAllNotificationsRead(),
});

export const bindLegacyNotifications = (appStore) => {
    const sync = (state) => appStore.getState()._syncNotifications(state);
    sync(useLegacyStore.getState());
    return useLegacyStore.subscribe((state, prev) => {
        if (state.notifications !== prev.notifications || state.unreadNotificationsCount !== prev.unreadNotificationsCount) sync(state);
    });
};

/*
 * Who a notification is for. Admin-sent notifications can be for everyone or
 * `audience: 'creators'` (shown only to people with a creator profile).
 */
export const isNotificationForViewer = (n, isCreator) => n?.audience !== 'creators' || isCreator;
export const visibleUnreadCount = (state) => {
    const creator = Boolean(state.profile?.capabilities?.creator || state.creatorProfile);
    return (state.notifications || []).filter(n => !n.isRead && isNotificationForViewer(n, creator)).length;
};
