/**
 * Posting deadline reminders for campaign creators, run once a day by the mail
 * worker (api/mail.js, 09:00 IST) before it drains the outreach send queue.
 *
 * A required deliverable is due on its own deadline (campaign.tasks[].deadline),
 * else the campaign's postingDeadline. Everyone in the creators group (message
 * sent, replied or joined) whose required posts for that day aren't in yet gets:
 *   - campaign_post_due the day before ("Still to send: Reel and Story"), and
 *   - campaign_post_overdue the day after, once.
 * Both carry their personal "Send my posts" link and the campaign picture, and
 * go through the outreach queue (rate limit, STOP opt-outs; a job skips itself
 * if the posts came in meanwhile). One job per person per day and kind (its id).
 */
import { getDb, istDate } from './db.js';
import { enqueueJob } from './outreachQueue.js';
import { deliverablesFor } from '../../src/lib/outreach/deliverables.js';
import { formatDeadline } from '../../src/lib/outreach/template.js';
import { approvedSummary } from '../../src/lib/outreach/whatsappTemplate.js';

// In the creators group, posts not all approved yet.
export const WAITING_ON_POSTS = new Set(['message_sent', 'replied', 'joined']);
export const IN = new Set(['submitted', 'approved']);
const DAY = 86_400_000;
const MAX_CAMPAIGNS = 300;

export const dayOf = (v) => (String(v || '').match(/^\d{4}-\d{2}-\d{2}/) || [''])[0];

/* Required tasks grouped by the day they're due: { '2026-11-12': [task, …] } */
const dueDays = (campaign) => {
    const out = {};
    for (const t of deliverablesFor(campaign)) {
        if (!t.required) continue;
        const day = dayOf(t.deadline) || dayOf(campaign.postingDeadline);
        if (day) (out[day] ||= []).push(t);
    }
    return out;
};

export const runPostReminders = async ({ db = getDb(), now = Date.now() } = {}) => {
    const tomorrow = istDate(new Date(now + DAY));
    const yesterday = istDate(new Date(now - DAY));
    const report = { due: 0, overdue: 0, campaigns: 0 };
    const camps = await db.collection('campaigns').limit(MAX_CAMPAIGNS).get();
    for (const doc of camps.docs) {
        const campaign = doc.data();
        if (String(campaign.status || '').toLowerCase() === 'draft') continue;
        const days = dueDays(campaign);
        const todo = [['post_due', tomorrow], ['post_overdue', yesterday]].filter(([, day]) => days[day]);
        if (!todo.length) continue;
        report.campaigns += 1;
        const apps = await doc.ref.collection('applications').get();
        for (const app of apps.docs) {
            const a = app.data();
            if (!WAITING_ON_POSTS.has(a.status) || !a.phone) continue;
            for (const [kind, day] of todo) {
                const missing = days[day].filter(t => !IN.has(a.deliverables?.[t.id]?.status));
                if (!missing.length) continue;
                const id = await enqueueJob(db, {
                    id: `${kind}_${doc.id}_${app.id}_${day}`.slice(0, 140),
                    campaignId: doc.id, appId: app.id, kind, createdBy: 'Newbi app',
                    data: { dueAt: formatDeadline(day) || day, stillToSend: approvedSummary(missing.map(t => t.title)), taskIds: missing.map(t => t.id) },
                });
                if (id) report[kind === 'post_due' ? 'due' : 'overdue'] += 1;
            }
        }
    }
    return report;
};
