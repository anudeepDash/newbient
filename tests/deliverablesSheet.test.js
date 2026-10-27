import { describe, it, expect } from 'vitest';
import { checkedSheetSpec, creatorEntriesFor, deliverablesSheetSpec, doneRowNote, handleIn, readDeliverablesCsv } from '../src/components/admin/campaigns/shortlistModel';
import { applicantsFor, guestKeyFor, orphanSubmitters } from '../src/components/admin/campaigns/campaignModel';
import { buildXlsx } from '../src/lib/xlsx';

const campaign = {
    id: 'c1',
    title: 'Red Bull Campus',
    tasks: [
        { id: 't1', title: 'Story', submissions: {
            a: { status: 'approved', contentLink: 'https://instagram.com/s/1', submittedAt: '2026-10-20T10:00:00Z' },
            b: { status: 'submitted', contentLink: 'https://instagram.com/s/2', submittedAt: '2026-10-21T10:00:00Z' },
            dev: { status: 'approved', contentLink: 'https://x.test', test: true },
        } },
        { id: 't2', title: 'Reel', submissions: {
            a: { status: 'approved', contentLink: 'not a link', proofUrl: 'https://cdn.test/p.png', submittedAt: '2026-10-21T10:00:00Z' },
        } },
    ],
};
const creators = [
    { id: 'a', uid: 'a', name: 'Asha', instagram: '@asha', city: 'Delhi', phone: '9999999999', shortlistedCampaigns: ['c1'], joinedCampaigns: ['c1'] },
    { id: 'b', uid: 'b', name: 'Bilal', instagram: 'bilal', city: 'Pune', shortlistedCampaigns: ['c1'], joinedCampaigns: ['c1'] },
    { id: 'c', uid: 'c', name: 'Chetan', joinedCampaigns: ['c1'] },
];
const helpers = { fileDate: () => '2026-10-22', exportSubtitle: (n, noun, extra) => `${n} ${noun}s · ${extra}` };

describe('deliverablesSheetSpec', () => {
    const spec = deliverablesSheetSpec(campaign, applicantsFor(campaign, creators), helpers);
    const cell = (row, header) => spec.columns.find(c => c.header === header).value(row);

    it('lists shortlisted creators, done ones first, and skips plain applicants', () => {
        expect(spec.rows.map(r => r.creator.name)).toEqual(['Asha', 'Bilal']);
        expect(spec.subtitle).toContain('1 done with everything');
    });

    it('gives each deliverable a status, link and date, with no phone or email', () => {
        const [asha, bilal] = spec.rows;
        expect(cell(asha, 'Done')).toBe(2);
        expect(cell(asha, 'All required done')).toBe('Yes');
        expect(cell(asha, '2. Reel · link')).toBe('https://cdn.test/p.png');
        expect(cell(bilal, '1. Story')).toBe('To review');
        expect(cell(bilal, '2. Reel')).toBe('Not started');
        expect(spec.columns.some(c => /phone|email/i.test(c.header))).toBe(false);
    });

    it('builds a valid workbook', () => {
        expect(buildXlsx(spec).length).toBeGreaterThan(1000);
    });
});

describe('readDeliverablesCsv', () => {
    const everyone = [...creators, { id: 'z', uid: 'z', name: 'Zoya', instagram: 'zoya.k' }];
    const entries = creatorEntriesFor(campaign, everyone, applicantsFor(campaign, everyone));

    it('reads a column per deliverable, adds new creators and marks work done in both', () => {
        const csv = 'Instagram,Story,Reel,Reel · link\n@zoya.k,Done,,https://instagram.com/reel/z\nasha,yes,done,\nnobody_here,done,,\nhttps://instagram.com/bilal/,To review,,';
        const { rows, byColumn } = readDeliverablesCsv(csv, entries, campaign);
        expect(byColumn).toBe(true);
        const [zoya, asha, nobody, bilal] = rows;
        expect(zoya.status).toBe('ready');
        expect(zoya.adds).toBe(true);
        expect(zoya.member).toBe('new');
        expect(zoya.done.map(d => [d.task.id, d.link])).toEqual([['t1', ''], ['t2', 'https://instagram.com/reel/z']]);
        // Asha did both in the app: nothing new, but the sheet marks them done in both.
        expect(asha.status).toBe('both');
        expect(asha.member).toBe('in');
        expect(asha.marked.map(m => m.state)).toEqual(['both', 'both']);
        expect(asha.save).toHaveLength(2);
        expect(doneRowNote(asha)).toBe('Registered, in the campaign · Story: done in the app and the sheet · Reel: done in the app and the sheet');
        // Not on Newbi: added to the campaign by handle, to invite later.
        expect(nobody.status).toBe('guest');
        expect(nobody.guest).toMatchObject({ key: 'sheet-ig-nobody_here', instagram: 'nobody_here' });
        expect(nobody.save.map(m => m.task.id)).toEqual(['t1']);
        expect(bilal.status).toBe('nothing');
    });

    it('reads handles typed as links without https', () => {
        const csv = 'Instagram\ninstagram.com/asha\nwww.instagram.com/Zoya.K/?hl=en';
        const [asha, zoya] = readDeliverablesCsv(csv, entries, campaign, 't2').rows;
        expect(asha.entry.key).toBe('a');
        expect(zoya.entry.key).toBe('z');
    });

    it('adds people not on Newbi as guests, by handle or phone, and finds them on the next sheet', () => {
        const csv = 'Name,Instagram,Phone,Link\nRiya,@riya.s,,https://instagram.com/reel/r\nArjun,,+91 98765 43210,\nNo One,,,';
        const [riya, arjun, none] = readDeliverablesCsv(csv, entries, campaign, 't2').rows;
        expect(riya).toMatchObject({ status: 'guest', member: 'newGuest', label: 'Riya' });
        expect(riya.guest.key).toBe('sheet-ig-riya-s');
        expect(riya.save[0].link).toBe('https://instagram.com/reel/r');
        expect(doneRowNote(riya)).toBe('Not on Newbi yet: added to the campaign, invite them later · Reel: done from the sheet');
        expect(arjun.guest).toMatchObject({ key: 'sheet-p-9876543210', phone: '9876543210' });
        expect(none.status).toBe('unknown');

        // Saved: the store merges the guest's record into the task as submissions['sheet-ig-riya-s'].
        const withGuest = {
            ...campaign,
            tasks: campaign.tasks.map(t => (t.id === 't2' ? { ...t, submissions: { ...t.submissions, 'sheet-ig-riya-s': {
                status: 'approved', contentLink: 'https://instagram.com/reel/r', via: 'sheet', store: 'app', guest: { instagram: 'riya.s', name: 'Riya' },
            } } } : t)),
        };
        const orphan = orphanSubmitters(withGuest, everyone).find(o => o.creator.guest);
        expect(orphan.creator).toMatchObject({ guest: true, name: 'Riya', instagram: 'riya.s' });
        const list = creatorEntriesFor(withGuest, everyone, applicantsFor(withGuest, everyone));
        const again = readDeliverablesCsv('Instagram\nriya.s', list, withGuest, 't2').rows[0];
        expect(again).toMatchObject({ status: 'already', member: 'guest' });
        // The Story is new for them: still a guest, so it goes to their guest record.
        const story = readDeliverablesCsv('Instagram\nriya.s', list, withGuest, 't1').rows[0];
        expect(story.status).toBe('ready');
        expect(story.entry.guest).toBe(true);
        expect(story.save.map(m => m.task.id)).toEqual(['t1']);

        const spec = deliverablesSheetSpec(withGuest, orphanSubmitters(withGuest, everyone), helpers);
        const row = Object.fromEntries(spec.columns.map(c => [c.header, c.value(spec.rows.find(r => r.creator.guest))]));
        expect(row).toMatchObject({ Instagram: '@riya.s', '2. Reel': 'Done (sheet)' });
        expect(row).not.toHaveProperty('Name');
        expect(row).not.toHaveProperty('Newbi ID');
    });

    it('reads sheets people make themselves: Google Forms headers, messy handles, semicolons', () => {
        const form = 'Timestamp,Email Address,Your Name,Instagram ID (eg @newbi.live),Mobile Number,Reel Link\n'
            + '22/10/2026,asha@x.com,Asha,@asha – 12k,,https://instagram.com/reel/a\n'
            + '22/10/2026,riya@x.com,Riya,Riya (@riya.s),98765 43210,\n'
            + '22/10/2026,n@x.com,Nobody,not sure,123,';
        const { rows, columns } = readDeliverablesCsv(form, entries, campaign, 't2');
        expect(columns).toMatchObject({ email: 1, name: 2, instagram: 3, phone: 4 });
        const [asha, riya, nobody] = rows;
        expect(asha.entry.key).toBe('a');
        expect(asha.save[0].link).toBe('https://instagram.com/reel/a');
        expect(riya).toMatchObject({ status: 'guest', label: 'Riya' });
        expect(riya.guest).toMatchObject({ instagram: 'riya.s', phone: '9876543210' });
        expect(nobody.status).toBe('unknown');
        expect(doneRowNote(nobody)).toBe('Not on Newbi, and “not sure” isn’t an Instagram handle');

        const semi = readDeliverablesCsv('Name;Insta handle\nZoya;zoya.k', entries, campaign, 't2');
        expect(semi.rows[0].entry.key).toBe('z');
    });

    it('uses the columns picked by hand', () => {
        const csv = 'Creator,Account,Notes\nZoya,zoya.k,x';
        expect(readDeliverablesCsv(csv, entries, campaign, 't2').error).toMatch(/pick the column/);
        const picked = readDeliverablesCsv(csv, entries, campaign, 't2', { columns: { instagram: 1 } });
        expect(picked.rows[0].entry.key).toBe('z');
        expect(readDeliverablesCsv('Instagram,Phone\nzz,9876543210', entries, campaign, 't2', { columns: { instagram: -1 } }).rows[0].guest.key).toBe('sheet-p-9876543210');
    });

    it('finds the handle in what people type', () => {
        expect(handleIn('@Riya.S ')).toBe('riya.s');
        expect(handleIn('https://www.instagram.com/riya.s/?igsh=abc')).toBe('riya.s');
        expect(handleIn('Riya (@riya.s)')).toBe('riya.s');
        expect(handleIn('https://instagram.com/reel/xyz')).toBe('');
        expect(handleIn('riya@gmail.com')).toBe('');
        expect(handleIn('Riya Sharma')).toBe('');
    });

    it('makes guest keys only from a real handle or a 10-digit phone', () => {
        expect(guestKeyFor({ handle: 'a.b_c' })).toBe('sheet-ig-a-b_c');
        expect(guestKeyFor({ handle: 'not a handle', phone: '12345' })).toBe(null);
        expect(guestKeyFor({ phone: '919876543210' })).toBe('sheet-p-9876543210');
    });

    it('reads the downloaded deliverables sheet back without marking "To review" as done', () => {
        const csv = 'Newbi ID,Name,Instagram,1. Story,1. Story · link\n,Bilal,@bilal,To review,https://instagram.com/s/2\n,Zoya,@zoya.k,Done (app + sheet),https://instagram.com/s/9';
        const [bilal, zoya] = readDeliverablesCsv(csv, entries, campaign).rows;
        expect(bilal.status).toBe('nothing');
        expect(zoya.done.map(d => [d.task, d.link])).toEqual([[campaign.tasks[0], 'https://instagram.com/s/9']]);
    });

    it('takes a sheet for one deliverable: every row did it, with the post link from any column', () => {
        const csv = 'Instagram handle,Instagram link,Post\nzoya.k,https://instagram.com/zoya.k,https://instagram.com/reel/1\nbilal,,';
        const { rows, byColumn } = readDeliverablesCsv(csv, entries, campaign, 't2');
        expect(byColumn).toBe(false);
        expect(rows[0].done.map(d => [d.task.id, d.link])).toEqual([['t2', 'https://instagram.com/reel/1']]);
        expect(rows[1].status).toBe('ready');
        expect(rows[1].done.map(d => d.state)).toEqual(['new']);
        // Bilal sent the Story in the app: a Story sheet approves it.
        expect(readDeliverablesCsv('Instagram\nbilal', entries, campaign, 't1').rows[0].marked[0].state).toBe('sent');
    });

    it('respects the chosen deliverable\'s own column', () => {
        const csv = 'Instagram,1. Story,2. Reel,2. Reel · link\nzoya.k,Done,Not started,';
        expect(readDeliverablesCsv(csv, entries, campaign, 't2').rows[0].status).toBe('nothing');
        expect(readDeliverablesCsv(csv, entries, campaign, 't1').rows[0].marked.map(m => m.task.id)).toEqual(['t1']);
    });

    it('knows a sheet that was already uploaded', () => {
        const withSheet = {
            ...campaign,
            tasks: campaign.tasks.map(t => ({ ...t, sheetDone: { a: { at: '2026-10-22', link: '', file: 'x.csv' } } })),
        };
        const list = creatorEntriesFor(withSheet, everyone, applicantsFor(withSheet, everyone));
        const [asha] = readDeliverablesCsv('Instagram\nasha', list, withSheet, 't1').rows;
        expect(asha.status).toBe('already');
        // The app submission has its link already, so a new one in the sheet changes nothing.
        expect(readDeliverablesCsv('Instagram,Link\nasha,https://instagram.com/s/new', list, withSheet, 't1').rows[0].status).toBe('already');
        const spec = deliverablesSheetSpec(withSheet, applicantsFor(withSheet, creators), helpers);
        expect(spec.columns.find(c => c.header === '1. Story').value(spec.rows[0])).toBe('Done (app + sheet)');
    });

    it('downloads the upload back with what was found', () => {
        const parsed = readDeliverablesCsv('Instagram,Notes\nzoya.k,hi\nnobody,', entries, campaign, 't1');
        const spec = checkedSheetSpec(parsed, 'from agency.csv');
        expect(spec.filename).toBe('from_agency_checked');
        const row = (r) => Object.fromEntries(spec.columns.map(c => [c.header, c.value(r)]));
        expect(row(spec.rows[0])).toMatchObject({ Instagram: 'zoya.k', Notes: 'hi', 'Newbi status': 'Mark done', 'Newbi check': 'Registered, added to the campaign · Story: done from the sheet' });
        expect(row(spec.rows[1])['Newbi check']).toBe('Not on Newbi yet: added to the campaign, invite them later · Story: done from the sheet');
    });

    it('asks for a handle column, and for the deliverable when the sheet has no columns', () => {
        expect(readDeliverablesCsv('Name,Story\nZoya,done', entries, campaign).error).toMatch(/Instagram/);
        expect(readDeliverablesCsv('Instagram\nzoya.k', entries, campaign).error).toMatch(/Pick which deliverable/);
    });
});

describe('screenshot hyperlinks', () => {
    it('writes the screenshot as a clickable link in the workbook and as the URL in CSV', async () => {
        const { unzipSync, strFromU8 } = await import('fflate');
        const { buildCsv } = await import('../src/lib/xlsx');
        const spec = deliverablesSheetSpec(campaign, applicantsFor(campaign, creators), helpers);
        const xml = strFromU8(unzipSync(buildXlsx(spec))['xl/worksheets/sheet1.xml']);
        expect(xml).toContain('HYPERLINK("https://cdn.test/p.png","Open link")');
        expect(buildCsv(spec)).toContain('https://cdn.test/p.png');
    });
});

describe('story vs reel links', () => {
    it('uses the screenshot for stories and the posted link for reels', () => {
        const both = { contentLink: 'https://instagram.com/x/1', proofUrl: 'https://cdn.test/s.png', status: 'approved' };
        const c = { ...campaign, tasks: [
            { id: 't1', title: 'Story', type: 'story', submissions: { a: both } },
            { id: 't2', title: 'Reel', type: 'reel', submissions: { a: both } },
        ] };
        const spec = deliverablesSheetSpec(c, applicantsFor(c, creators), helpers);
        const asha = spec.rows.find(r => r.creator.name === 'Asha');
        const cell = (h) => spec.columns.find(col => col.header === h).value(asha);
        expect(cell('1. Story · link')).toBe('https://cdn.test/s.png');
        expect(cell('2. Reel · link')).toBe('https://instagram.com/x/1');
    });
});
