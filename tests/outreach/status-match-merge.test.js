import { describe, it, expect } from 'vitest';
import { STATUSES, TRANSITIONS, canTransition, isOnShortlist } from '../../src/lib/outreach/status.js';
import { parsePastedHandles, matchPastedHandles } from '../../src/lib/outreach/match.js';
import { mergeApplication, resolveDuplicate, validateApplication, tierFor, applicationsOpen, parseFollowers, filterApplications } from '../../src/lib/outreach/application.js';
import { toCsv, csvCell } from '../../src/lib/outreach/csv.js';

describe('status transitions', () => {
    it('follows the outreach order', () => {
        expect(canTransition('applied', 'shortlisted')).toBe(true);
        expect(canTransition('shortlisted', 'message_queued')).toBe(true);
        expect(canTransition('message_queued', 'message_sent')).toBe(true);
        expect(canTransition('message_sent', 'joined')).toBe(true);
        expect(canTransition('message_sent', 'replied')).toBe(true);
        expect(canTransition('replied', 'joined')).toBe(true);
        expect(canTransition('joined', 'posted')).toBe(true);
        expect(canTransition('posted', 'paid')).toBe(true);
    });

    it('never marks a message sent without it being opened first, and never skips ahead', () => {
        expect(canTransition('applied', 'message_sent')).toBe(false);
        expect(canTransition('shortlisted', 'message_sent')).toBe(false);
        expect(canTransition('applied', 'paid')).toBe(false);
        expect(canTransition('message_sent', 'paid')).toBe(false);
    });

    it('lets anyone before paid be removed, and removed be restored only to the shortlist', () => {
        STATUSES.filter(s => !['paid', 'removed'].includes(s)).forEach(s => expect(canTransition(s, 'removed')).toBe(true));
        expect(canTransition('paid', 'removed')).toBe(false);
        expect(TRANSITIONS.removed).toEqual(['shortlisted']);
        expect(canTransition('message_queued', 'shortlisted')).toBe(true);
    });

    it('rejects unknown statuses and no-op moves', () => {
        expect(canTransition('applied', 'applied')).toBe(false);
        expect(canTransition('applied', 'banana')).toBe(false);
        expect(canTransition(undefined, 'shortlisted')).toBe(false);
    });

    it('every transition target is a known status', () => {
        Object.values(TRANSITIONS).flat().forEach(s => expect(STATUSES).toContain(s));
        expect(isOnShortlist('message_sent')).toBe(true);
        expect(isOnShortlist('applied')).toBe(false);
        expect(isOnShortlist('removed')).toBe(false);
    });
});

describe('bulk paste', () => {
    const pasted = [
        '@Riya.Sharma',
        'https://www.instagram.com/arjun.k/?hl=en',
        'meera_blr',
        'Kabir Mehta\t@kabir.m',
        'one, two_2; three',
        '@riya.sharma',
        'not a handle!!',
        '',
        'https://www.instagram.com/p/C123/',
    ].join('\n');

    it('reads handles in every common shape, once each', () => {
        const { handles, invalid } = parsePastedHandles(pasted);
        expect(handles).toEqual(['riya.sharma', 'arjun.k', 'meera_blr', 'kabir.m', 'one', 'two_2', 'three']);
        expect(invalid).toEqual(['not a handle!!', 'https://www.instagram.com/p/C123/']);
    });

    it('matches against applications and lists the rest', () => {
        const apps = [
            { id: 'a1', instagramHandle: 'riya.sharma' },
            { id: 'a2', instagramHandle: 'meera_blr' },
            { id: 'a3', instagramHandle: 'someone.else' },
        ];
        const { matched, unmatched, invalid } = matchPastedHandles(pasted, apps);
        expect(matched.map(m => m.application.id)).toEqual(['a1', 'a2']);
        expect(unmatched).toEqual(['arjun.k', 'kabir.m', 'one', 'two_2', 'three']);
        expect(invalid).toHaveLength(2);
    });
});

describe('duplicate merge', () => {
    it('updates by phone first, and flags a handle that belongs to another application', () => {
        expect(resolveDuplicate({ byPhone: null, byHandle: null })).toEqual({ targetId: null, conflictWith: null });
        expect(resolveDuplicate({ byPhone: 'a1', byHandle: null })).toEqual({ targetId: 'a1', conflictWith: null });
        expect(resolveDuplicate({ byPhone: null, byHandle: 'a2' })).toEqual({ targetId: 'a2', conflictWith: null });
        expect(resolveDuplicate({ byPhone: 'a1', byHandle: 'a1' })).toEqual({ targetId: 'a1', conflictWith: null });
        expect(resolveDuplicate({ byPhone: 'a1', byHandle: 'a2' })).toEqual({ targetId: 'a1', conflictWith: 'a2' });
    });

    it('keeps the latest values, the status and the first-applied time', () => {
        const first = mergeApplication(null, { fullName: 'Riya', followerCount: 9000, city: 'Bangalore' }, { now: '2026-10-01T10:00:00.000Z' });
        expect(first).toMatchObject({ status: 'applied', submitCount: 1, firstSubmittedAt: '2026-10-01T10:00:00.000Z' });

        const existing = { ...first, status: 'shortlisted', contactId: 'c1', creatorId: 'cr1' };
        const again = mergeApplication(existing, { fullName: 'Riya Sharma', followerCount: 12000, city: 'Bangalore' }, { now: '2026-10-05T10:00:00.000Z' });
        expect(again).toMatchObject({
            fullName: 'Riya Sharma',
            followerCount: 12000,
            status: 'shortlisted',
            contactId: 'c1',
            creatorId: 'cr1',
            submitCount: 2,
            firstSubmittedAt: '2026-10-01T10:00:00.000Z',
            lastSubmittedAt: '2026-10-05T10:00:00.000Z',
            consentAt: '2026-10-05T10:00:00.000Z',
        });
    });

    it('clears a field the applicant left empty the second time', () => {
        const first = mergeApplication(null, { fullName: 'Riya', referralSource: 'Instagram' }, { now: 't1' });
        const again = mergeApplication(first, { fullName: 'Riya' }, { now: 't2' });
        expect(again.referralSource).toBeNull();
    });
});

describe('validateApplication', () => {
    const campaign = { cities: ['Bangalore', 'Mysore'], perksByTier: { micro: { minFollowers: 5000 } } };
    const good = {
        fullName: 'Riya Sharma', email: 'Riya@Example.com', phone: '98765 43210', instagram: 'https://instagram.com/Riya.S',
        followerCount: '12,500', collegeOrEmployer: 'Christ University', city: 'bangalore', category: 'Music & Dance',
        runsCityPages: true, cityPagesHandle: '@blr.gigs', registeredNewbiCreator: 'yes', consentWhatsApp: true,
    };

    it('cleans a good submission', () => {
        const { ok, value, errors } = validateApplication(good, campaign);
        expect(errors).toEqual({});
        expect(ok).toBe(true);
        expect(value).toMatchObject({
            email: 'riya@example.com', phone: '+919876543210', instagramHandle: 'riya.s', followerCount: 12500,
            city: 'Bangalore', cityPagesHandle: 'blr.gigs', registeredNewbiCreator: true, firstName: 'Riya', tier: 'micro',
        });
    });

    it('reports each bad field', () => {
        const { ok, errors } = validateApplication({ ...good, phone: '12345', city: 'Delhi', consentWhatsApp: false, followerCount: 'lots', category: 'x' }, campaign);
        expect(ok).toBe(false);
        expect(Object.keys(errors).sort()).toEqual(['category', 'city', 'consentWhatsApp', 'followerCount', 'phone']);
    });

    it('reads follower counts people actually type', () => {
        expect(parseFollowers('12.5k')).toBe(12500);
        expect(parseFollowers('1.2M')).toBe(1200000);
        expect(parseFollowers(-3)).toBe(-3);
        expect(Number.isNaN(parseFollowers('12 thousand'))).toBe(true);
    });

    it('tiers by the campaign thresholds or the defaults', () => {
        expect(tierFor(9999)).toBe('nano');
        expect(tierFor(10000)).toBe('micro');
        expect(tierFor(100000)).toBe('macro');
        expect(tierFor(6000, { micro: { minFollowers: 5000 } })).toBe('micro');
    });
});

describe('applicationsOpen', () => {
    it('only Open campaigns before the end of the deadline day in India', () => {
        expect(applicationsOpen({ status: 'Open' }).open).toBe(true);
        expect(applicationsOpen({ status: 'Live' })).toEqual({ open: false, reason: 'live' });
        expect(applicationsOpen({ status: 'Draft' }).open).toBe(false);
        const c = { status: 'Open', applicationDeadline: '2026-10-20' };
        expect(applicationsOpen(c, Date.parse('2026-10-20T18:20:00Z')).open).toBe(true); // 23:50 IST
        expect(applicationsOpen(c, Date.parse('2026-10-20T18:31:00Z')).reason).toBe('deadline'); // 00:01 IST next day
    });
});

describe('filterApplications', () => {
    const apps = [
        { fullName: 'Riya', instagramHandle: 'riya', followerCount: 5000, category: 'Music & Dance', city: 'Bangalore', registeredNewbiCreator: true, collegeOrEmployer: 'Christ University', status: 'applied' },
        { fullName: 'Arjun', instagramHandle: 'arjun', followerCount: 50000, category: 'Food & Beverage', city: 'Mysore', registeredNewbiCreator: false, collegeOrEmployer: 'Infosys', status: 'shortlisted' },
    ];
    it('combines filters', () => {
        expect(filterApplications(apps, { minFollowers: 10000 }).map(a => a.fullName)).toEqual(['Arjun']);
        expect(filterApplications(apps, { college: 'christ' }).map(a => a.fullName)).toEqual(['Riya']);
        expect(filterApplications(apps, { registered: 'no', city: 'Mysore' }).map(a => a.fullName)).toEqual(['Arjun']);
        expect(filterApplications(apps, { q: '@riy' }).map(a => a.fullName)).toEqual(['Riya']);
    });
});

describe('csv', () => {
    it('escapes quotes and blocks formulas, but keeps phone numbers readable', () => {
        expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
        expect(csvCell('+919876543210')).toBe('+919876543210');
        expect(csvCell('a,b')).toBe('"a,b"');
        const csv = toCsv([{ fullName: 'Riya', instagramHandle: 'riya', status: 'message_sent' }]);
        expect(csv.startsWith('\uFEFFName,Instagram')).toBe(true);
        expect(csv).toContain('Riya,@riya');
        expect(csv).toContain('Message sent');
    });
});
