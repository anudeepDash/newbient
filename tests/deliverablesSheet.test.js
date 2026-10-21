import { describe, it, expect } from 'vitest';
import { creatorEntriesFor, deliverablesSheetSpec, readDeliverablesCsv } from '../src/components/admin/campaigns/shortlistModel';
import { applicantsFor } from '../src/components/admin/campaigns/campaignModel';
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

    it('reads a column per deliverable, adds new creators and skips work already approved', () => {
        const csv = 'Instagram,Story,Reel,Reel · link\n@zoya.k,Done,,https://instagram.com/reel/z\nasha,yes,done,\nnobody_here,done,,\nhttps://instagram.com/bilal/,To review,,';
        const { rows, byColumn } = readDeliverablesCsv(csv, entries, campaign);
        expect(byColumn).toBe(true);
        const [zoya, asha, nobody, bilal] = rows;
        expect(zoya.status).toBe('ready');
        expect(zoya.adds).toBe(true);
        expect(zoya.done.map(d => [d.task.id, d.link])).toEqual([['t1', ''], ['t2', 'https://instagram.com/reel/z']]);
        expect(asha.status).toBe('already');
        expect(nobody.status).toBe('unknown');
        expect(bilal.status).toBe('nothing');
    });

    it('reads the downloaded deliverables sheet back without marking "To review" as done', () => {
        const csv = 'Newbi ID,Name,Instagram,1. Story,1. Story · link\n,Bilal,@bilal,To review,https://instagram.com/s/2\n,Zoya,@zoya.k,Done,https://instagram.com/s/9';
        const [bilal, zoya] = readDeliverablesCsv(csv, entries, campaign).rows;
        expect(bilal.status).toBe('nothing');
        expect(zoya.done).toEqual([{ task: campaign.tasks[0], link: 'https://instagram.com/s/9' }]);
    });

    it('marks the picked deliverables for a plain list of handles', () => {
        const csv = 'Instagram handle,Link\nzoya.k,https://instagram.com/p/1\nbilal,';
        const { rows, byColumn } = readDeliverablesCsv(csv, entries, campaign, ['t2']);
        expect(byColumn).toBe(false);
        expect(rows[0].done).toEqual([{ task: campaign.tasks[1], link: 'https://instagram.com/p/1' }]);
        expect(rows[1].status).toBe('ready');
        expect(readDeliverablesCsv(csv, entries, campaign, []).rows[0].status).toBe('nothing');
    });

    it('asks for a handle column', () => {
        expect(readDeliverablesCsv('Name,Story\nZoya,done', entries, campaign).error).toMatch(/Instagram/);
    });
});
