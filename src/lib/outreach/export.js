import { statusLabel } from './status.js';

/*
 * The shortlist export, in the shape the admin's ExportMenu takes (styled
 * Excel first, CSV second; lib/xlsx.js defuses formula-looking cells).
 * Every column the shortlist table has, plus consent and message history.
 */

const yesNo = (v) => (v ? 'Yes' : 'No');

export const EXPORT_COLUMNS = [
    { header: 'Name', width: 24, value: a => a.fullName || '' },
    { header: 'Instagram handle', width: 20, value: a => a.instagramHandle || '' },
    { header: 'Followers', type: 'number', value: a => Number(a.followerCount) || 0 },
    { header: 'Tier', value: a => a.tier || '' },
    { header: 'City', value: a => a.city || '' },
    { header: 'College or employer', width: 26, value: a => a.collegeOrEmployer || '' },
    { header: 'Category', width: 20, value: a => a.category || '' },
    { header: 'Registered on Newbi', value: a => yesNo(a.registeredNewbiCreator) },
    { header: 'Newbi creator ID', value: a => a.creatorId || '' },
    { header: 'Runs city pages', value: a => yesNo(a.runsCityPages) },
    { header: 'City page handle', value: a => a.cityPagesHandle || '' },
    { header: 'Phone', width: 16, value: a => a.phone || '' },
    { header: 'Email', width: 28, value: a => a.email || '' },
    { header: 'Status', value: a => statusLabel(a.status) },
    { header: 'Heard via', value: a => a.referralSource || '' },
    { header: 'WhatsApp consent at', type: 'date', value: a => a.consentAt || null },
    { header: 'First applied', type: 'date', value: a => a.firstSubmittedAt || null },
    { header: 'Last updated by applicant', type: 'date', value: a => a.lastSubmittedAt || null },
    { header: 'Times submitted', type: 'number', value: a => Number(a.submitCount) || 1 },
    { header: 'Message sent at', type: 'date', value: a => a.messageSentAt || null },
    { header: 'Message sent by', width: 24, value: a => a.messageSentBy || '' },
    { header: 'Possible duplicate', value: a => (a.possibleDuplicateOf ? 'Check' : '') },
];

/** → the ExportMenu spec, or null when there are no rows. */
export const exportSpecFor = ({ title, rows, label = 'shortlist', date = new Date().toISOString().slice(0, 10) }) => {
    if (!rows?.length) return null;
    const safe = String(title || 'campaign').replace(/[^\w-]+/g, '_').slice(0, 40);
    return {
        filename: `${safe}_${label}_${date}`,
        sheetName: label === 'shortlist' ? 'Shortlist' : 'Applications',
        title: `${title || 'Campaign'} · ${label}`,
        subtitle: `${rows.length} ${rows.length === 1 ? 'person' : 'people'}`,
        columns: EXPORT_COLUMNS,
        rows,
    };
};
