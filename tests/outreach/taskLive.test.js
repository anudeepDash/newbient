import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from '../helpers/fakeFirestore.js';
import { setDbForTests } from '../../api/_lib/db.js';
import { setWhatsAppFetchForTests } from '../../api/_lib/whatsapp.js';
import { tellPostsOpened } from '../../api/_lib/postsOpen.js';
import { runQueue } from '../../api/_lib/outreachQueue.js';
import { handleOutreachAction } from '../../api/_lib/outreach.js';
import { plainBrief, taskLinksOf, briefLine, linksLine } from '../../src/lib/outreach/taskBrief.js';
import { deliverablesFor } from '../../src/lib/outreach/deliverables.js';
import { TEMPLATES, problemsWith } from '../../scripts/submit-wa-templates.mjs';
import { WA_TEMPLATES } from '../../src/lib/outreach/whatsappTemplate.js';

/* A task made live sends its brief on WhatsApp; the team can send a task, group link or update by hand. */

const ADMIN = { uid: 'u-admin', email: 'ops@newbi.live', email_verified: true };
const NOW = Date.parse('2026-11-11T05:00:00Z');

// As saved by the campaign editor (Pinnaca's first story).
const STORY = {
    id: 's1', title: 'Instagram story 1', taskType: 'story', submissionsOpen: true, priority: 'required',
    description: '<div><b>Task 1 is Live </b>🎉</div><div><b><br></b></div><div><b>Repost this post on your stories</b></div><div><b>Visible Tag:</b></div><div>@pinnaca.in</div><div>@newbi.live</div>',
    referencePostUrl: 'https://www.instagram.com/p/De1pFFnMQCG/', referencePostLabel: 'Repost this poster',
    ticketLink: 'https://link.district.in/DSTRKT/t711e1bi', ticketLabel: 'Add this ticket link (story sticker)',
    googleFormLink: '', taskLinks: [{ label: 'Guidelines', url: 'https://drive.google.com/x' }, { label: 'Bad', url: 'not a link' }],
};

let db;
let sent;
const jobs = () => Object.entries(db.dump('outreach_queue'));
const call = async (action, body) => {
    const res = fakeRes();
    await handleOutreachAction(action, fakeReq({ body }), res, { decodedToken: ADMIN, db });
    return res;
};

beforeEach(() => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.stubEnv('LINK_SIGNING_SECRET', 'test-secret');
    vi.stubEnv('OUTREACH_WA_PER_MINUTE', '50');
    vi.stubEnv('CRON_SECRET', '');
    ['CAMPAIGN_TASK_LIVE', 'CAMPAIGN_GROUP_LINK', 'CAMPAIGN_UPDATE', 'CAMPAIGN_POSTS_OPEN'].forEach(n => vi.stubEnv(`WHATSAPP_TEMPLATE_${n}`, n.toLowerCase()));
    db = new FakeFirestore({
        'campaigns/c1': { title: 'Pinnaca 2026', status: 'Open', whatsappLink: 'https://chat.whatsapp.com/BMFfOyhb', tasks: [STORY, { id: 'r1', title: 'Instagram reel 1', submissionsOpen: false }] },
        // Approved but not messaged yet, in the group, already sent this story, applied only, paid, removed.
        'campaigns/c1/applications/a1': { fullName: 'Riya Sharma', phone: '+919876500001', status: 'shortlisted' },
        'campaigns/c1/applications/a2': { fullName: 'Arjun K', phone: '+919876500002', status: 'joined', joinedAt: '2026-11-01' },
        'campaigns/c1/applications/a3': { fullName: 'Meera', phone: '+919876500003', status: 'joined', deliverables: { s1: { status: 'submitted' } } },
        'campaigns/c1/applications/a4': { fullName: 'Kabir', phone: '+919876500004', status: 'applied' },
        'campaigns/c1/applications/a5': { fullName: 'Zoya', phone: '+919876500005', status: 'paid' },
        'campaigns/c1/applications/a6': { fullName: 'Dev', phone: '+919876500006', status: 'removed' },
        'admins/x': { email: 'ops@newbi.live', role: 'admin' },
    });
    setDbForTests(db);
    sent = [];
    setWhatsAppFetchForTests(async (url, init) => {
        sent.push(JSON.parse(init.body));
        return { ok: true, status: 200, json: async () => ({ messages: [{ id: `wamid.${sent.length}` }] }) };
    });
});

afterEach(() => {
    vi.unstubAllEnvs();
    setDbForTests(null);
    setWhatsAppFetchForTests(null);
});

describe('task brief', () => {
    it('turns the rich text into lines and collects the real links', () => {
        expect(plainBrief(STORY.description)).toBe('Task 1 is Live 🎉\n\nRepost this post on your stories\nVisible Tag:\n@pinnaca.in\n@newbi.live');
        expect(taskLinksOf(STORY).map(l => l.label)).toEqual(['Repost this poster', 'Add this ticket link (story sticker)', 'Guidelines']);
        expect(briefLine(STORY)).toBe('Task 1 is Live 🎉 · Repost this post on your stories · Visible Tag: · @pinnaca.in · @newbi.live');
        expect(linksLine(taskLinksOf(STORY), 120)).toBe('Repost this poster: https://www.instagram.com/p/De1pFFnMQCG/');
    });

    it('shows the links on the creator page only once the task is open', () => {
        const [story, reel] = deliverablesFor({ tasks: [STORY, { ...STORY, id: 'r1', submissionsOpen: false }] });
        expect(story.links).toHaveLength(3);
        expect(reel.links).toEqual([]);
    });
});

describe('a task made live', () => {
    it('sends its brief to every approved creator who still owes it, once', async () => {
        expect(await tellPostsOpened({ db, campaignId: 'c1', taskIds: ['s1', 'r1'], now: NOW, start: false })).toEqual({ queued: 2 });
        const queued = jobs();
        expect(queued.map(([id]) => id).sort()).toEqual(['task_live_c1_a1_s1', 'task_live_c1_a2_s1']);
        expect(queued[0][1]).toMatchObject({ kind: 'task_live', data: { taskIds: ['s1'], taskTitle: 'Instagram story 1', dueAt: 'No fixed date' } });
        expect(queued[0][1].data.links).toContain('https://link.district.in/DSTRKT/t711e1bi');

        await runQueue({ db, deadline: Date.now() + 5000, sleep: async () => {} });
        expect(sent).toHaveLength(2);
        const msg = sent[0];
        expect(msg.template.name).toBe('campaign_task_live');
        const [header, body, button] = msg.template.components;
        expect(header.parameters[0].type).toBe('image');
        expect(body.parameters.map(p => p.text).slice(0, 3)).toEqual(['Riya', 'Pinnaca 2026', 'Instagram story 1']);
        expect(body.parameters.every(p => !/[\n\t]/.test(p.text))).toBe(true);
        expect(button).toMatchObject({ sub_type: 'url', index: '0' });

        // Opening it again (closed and reopened) doesn't send it twice.
        expect((await tellPostsOpened({ db, campaignId: 'c1', taskIds: ['s1'], now: NOW + 86_400_000, start: false })).queued).toBe(0);
    });

    it('falls back to the short notice while the brief template is off', async () => {
        vi.stubEnv('WHATSAPP_TEMPLATE_CAMPAIGN_TASK_LIVE', '');
        expect(await tellPostsOpened({ db, campaignId: 'c1', taskIds: ['s1'], now: NOW, start: false })).toEqual({ queued: 1 });
        expect(jobs()[0][1].kind).toBe('posts_open');
    });
});

describe('Send on WhatsApp (outreach-wa-send)', () => {
    it('sends a task again to the people picked, skipping who isn’t approved', async () => {
        const res = await call('outreach-wa-send', { campaignId: 'c1', kind: 'task_live', taskId: 's1', appIds: ['a1', 'a4', 'a3'] });
        expect(res.statusCode).toBe(200);
        expect(res.body.queued).toBe(1);
        expect(res.body.skipped).toEqual([{ id: 'a4', reason: 'not_approved' }, { id: 'a3', reason: 'posts_in' }]);
        expect(sent[0].template.name).toBe('campaign_task_live');
    });

    it('won’t send a task that isn’t open', async () => {
        const res = await call('outreach-wa-send', { campaignId: 'c1', kind: 'task_live', taskId: 'r1', appIds: ['a1'] });
        expect(res.statusCode).toBe(409);
    });

    it('sends the campaign’s group link with a signed Joined button', async () => {
        const res = await call('outreach-wa-send', { campaignId: 'c1', kind: 'group_link', appIds: ['a1', 'a6'] });
        expect(res.body).toMatchObject({ queued: 1, skipped: [{ id: 'a6', reason: 'not_approved' }] });
        const [, body, joined, stop] = sent[0].template.components;
        expect(body.parameters[2].text).toBe('https://chat.whatsapp.com/BMFfOyhb');
        expect(joined.parameters[0].payload).toMatch(/^j1\.c1\.a1\./);
        expect(stop.parameters[0].payload).toBe('stop');
    });

    it('sends an update with a link, and refuses one without a link', async () => {
        expect((await call('outreach-wa-send', { campaignId: 'c1', kind: 'update', note: 'Passes\nat 3 PM', appIds: ['a2'] })).statusCode).toBe(400);
        const res = await call('outreach-wa-send', { campaignId: 'c1', kind: 'update', note: 'Passes\nat 3 PM', link: 'https://maps.app.goo.gl/x', appIds: ['a2'] });
        expect(res.body.queued).toBe(1);
        expect(sent[0].template.components[1].parameters.map(p => p.text)).toEqual(['Arjun', 'Pinnaca 2026', 'Passes at 3 PM', 'https://maps.app.goo.gl/x']);
    });

    it('says how to switch a template on when it isn’t approved yet', async () => {
        vi.stubEnv('WHATSAPP_TEMPLATE_CAMPAIGN_GROUP_LINK', '');
        const res = await call('outreach-wa-send', { campaignId: 'c1', kind: 'group_link', appIds: ['a1'] });
        expect(res.statusCode).toBe(409);
        expect(res.body.error).toContain('WHATSAPP_TEMPLATE_CAMPAIGN_GROUP_LINK');
    });

    it('matches the templates submitted to Meta', () => {
        for (const kind of ['task_live', 'group_link', 'update']) {
            const t = TEMPLATES.find(x => x.name === WA_TEMPLATES[kind].name);
            expect(t.body).toBe(WA_TEMPLATES[kind].body);
            expect(problemsWith(t)).toEqual([]);
        }
    });
});
