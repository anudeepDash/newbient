import { passesPost } from '../../../lib/passesApi';
import { useStore } from '../../../lib/store';

/*
 * Deleting ticket orders for good. The pass made for each booking is cancelled
 * first so its QR stops working and the holder's ticket page says so (the gate
 * also turns away a pass whose order is gone). Nobody is messaged: use "Cancel
 * the event" in Settings for that. Returns how many orders couldn't be deleted.
 */
export const deleteOrders = async (orders, { reason = 'Order deleted' } = {}) => {
    const refs = orders.map(o => o.bookingRef).filter(Boolean);
    for (let i = 0; i < refs.length; i += 5) {
        await Promise.all(refs.slice(i, i + 5).map(ref => passesPost('revoke', { ref, reason }).catch(() => null)));
    }
    return useStore.getState().deleteTicketOrders(orders.map(o => o.id));
};
