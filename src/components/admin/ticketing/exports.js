import { orderItems, orderTicketCount, isOrderCheckedIn, SOLD_STATUSES, isGuestAdmissible } from '../../../lib/ticketing';
import { downloadXlsx, downloadCsv, exportSubtitle } from '../../../lib/xlsx';
import { safeFileName, toDate } from './format';

const titleCase = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// One row per order and per guestlist entry; both exports share it.
const attendeeRows = (event, orders, guestEntries) => [
    ...orders.map(o => ({
        ref: o.bookingRef || o.id,
        type: 'Ticket',
        name: o.customerName || o.name || '',
        email: o.customerEmail || o.email || '',
        phone: o.customerPhone || o.phone || '',
        status: titleCase(o.status || 'pending'),
        checkedIn: SOLD_STATUSES.includes(o.status) && isOrderCheckedIn(o) ? 'Yes' : 'No',
        tickets: orderTicketCount(o),
        detail: orderItems(o).map(i => `${i.count}× ${i.name}`).join(', '),
        amount: o.totalAmount !== undefined ? Number(o.totalAmount) || 0 : 0,
        coupon: o.appliedCoupon?.code || '',
        paymentRef: o.paymentRef || '',
        task: '',
        date: toDate(o.createdAt),
    })),
    ...guestEntries.map(e => ({
        ref: e.bookingRef || e.id,
        type: event?.guestlistMode === 'rsvp' ? 'RSVP' : 'Guestlist',
        name: e.customerName || e.name || '',
        email: e.customerEmail || e.email || '',
        phone: e.customerPhone || e.phone || '',
        status: titleCase(e.status || (isGuestAdmissible(e) ? 'approved' : 'pending')),
        checkedIn: e.attended ? 'Yes' : 'No',
        list: e._glId || '',
        tickets: Number(e.guestsCount) || 1,
        detail: Array.isArray(e.plusOneNames) && e.plusOneNames.filter(Boolean).length ? `With ${e.plusOneNames.filter(Boolean).join(', ')}` : 'Guest entry',
        amount: null,
        coupon: '',
        paymentRef: '',
        task: e.taskSubmission ? [e.taskSubmission.fileUrl, e.taskSubmission.link, e.taskSubmission.text].filter(Boolean).join(' | ') : '',
        date: toDate(e.createdAt),
    })),
];

const COLUMNS = [
    { header: 'Booking Ref', key: 'ref' },
    { header: 'Type', key: 'type' },
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Phone', key: 'phone' },
    { header: 'Status', key: 'status' },
    { header: 'Checked In', key: 'checkedIn' },
    { header: 'People', key: 'tickets', type: 'number' },
    { header: 'Tickets', key: 'detail', width: 34 },
    { header: 'Amount Paid', key: 'amount', type: 'money' },
    { header: 'Coupon', key: 'coupon' },
    { header: 'UTR / Payment Ref', key: 'paymentRef' },
    { header: 'Task Material', key: 'task', width: 40 },
    { header: 'Booked', key: 'date', type: 'datetime' },
];

const spec = (event, orders, guestEntries) => {
    const rows = attendeeRows(event, orders, guestEntries);
    const sold = rows.filter(r => r.checkedIn === 'Yes').length;
    return {
        filename: `${safeFileName(event?.title)}_attendees`,
        sheetName: 'Attendees',
        title: event?.title || 'Event attendees',
        subtitle: exportSubtitle(rows.length, 'booking', `${sold} checked in`),
        columns: COLUMNS,
        rows,
        totals: { tickets: true, amount: true },
    };
};

/** For ExportMenu: every order and guest of one event. */
export const attendeeSpec = spec;

/** For ExportMenu on the events list: every order of the listed events. */
export const ordersSpec = (events, orders, label = 'Ticket orders') => {
    const byId = Object.fromEntries((events || []).map(e => [e.id, e]));
    const rows = (orders || []).filter(o => byId[o.eventId]).map(o => ({
        ...attendeeRows(byId[o.eventId], [o], [])[0],
        event: byId[o.eventId]?.title || '',
    }));
    return {
        filename: safeFileName(label),
        sheetName: 'Orders',
        title: label,
        subtitle: exportSubtitle(rows.length, 'order'),
        columns: [{ header: 'Event', key: 'event', width: 28 }, ...COLUMNS.filter(c => c.key !== 'task')],
        rows,
        totals: { tickets: true, amount: true },
    };
};

export const exportCsv = (event, orders, guestEntries) => downloadCsv(spec(event, orders, guestEntries));

// Styled Excel workbook: title band, frozen header, filters, ₹ totals.
export const exportExcelReport = (event, orders, guestEntries) => downloadXlsx(spec(event, orders, guestEntries));
