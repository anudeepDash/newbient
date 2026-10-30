/**
 * Submits our WhatsApp templates to Meta for approval (guestlists and account
 * security alerts). On 23 Oct 2026 they were created by hand in WhatsApp
 * Manager with exactly this text, so this is the record of what Meta has.
 * The same day the 9 guestlist and event templates got an IMAGE header (each
 * with its card from public/og as the sample; the code sends the event's own
 * picture, else that card: api/_lib/whatsapp.js IMAGE_HEADERS). This script
 * doesn't add headers to those; templates with `header: { image }` (pass_ticket_qr)
 * get their image header, with the sample uploaded, when submitted. The code only uses each one once WHATSAPP_TEMPLATE_<NAME>
 * is set, after Meta approves it.
 *
 *   node scripts/submit-wa-templates.mjs            checks every template, sends nothing
 *   node scripts/submit-wa-templates.mjs --submit   submits the ones Meta doesn't have yet
 *
 * Needs WHATSAPP_ACCESS_TOKEN (with whatsapp_business_management) and
 * WHATSAPP_WABA_ID, from the environment or .env. Templates that already exist
 * in Meta (any status) are skipped, so running it twice is safe.
 */
import fs from 'node:fs';

const APP = 'https://app.newbi.live';
const MEMBER_FOOTER = 'Newbi · app.newbi.live';

const pass = (example) => ({ type: 'URL', text: 'Open pass', url: `${APP}/p/{{1}}`, example: [`${APP}/p/${example}`] });
const list = (text, example) => ({ type: 'URL', text, url: `${APP}/community/g/{{1}}`, example: [`${APP}/community/g/${example}`] });

export const TEMPLATES = [
    {
        // The ticket itself: carries the ticket's QR code as its image header (api/_lib/notify.js
        // sends https://app.newbi.live/api/qr?text=<pass code>). Used instead of pass_confirmed
        // once WHATSAPP_TEMPLATE_PASS_TICKET_QR is set.
        name: 'pass_ticket_qr',
        body: "🎟️ *Your ticket is ready, {{1}}*\n\n*Event:* {{2}}\n*Date:* {{3}}\n*Pass code:* {{4}}\n\nShow the QR code above at the entrance. You can also open your pass any time with the button below.",
        samples: ['Riya', 'NH7 Weekender Pune', 'Sat, 5 Dec', 'NB7K2QXM'],
        header: { image: 'public/og/wa-pass-v1.jpg' },
        buttons: [pass('NB7K2QXM')],
    },
    {
        name: 'guestlist_pending',
        body: "📝 *You're signed up, {{1}}*\n\n*Guestlist:* {{2}}\n*Date:* {{3}}\n*Coming:* {{4}}\n\nThe team checks every sign-up on this list. We'll message you here as soon as you're in.",
        samples: ['Riya', 'Techno Tuesdays at Kitty Su', 'Tue, 10 Nov', 'You + 1 guest'],
    },
    {
        name: 'guestlist_rsvp_confirmed',
        // Meta's pre-check read "carry a photo ID" as Authentication; this is the wording that was submitted.
        body: "✅ *You're on the list, {{1}}*\n\n*Event:* {{2}}\n*Date:* {{3}}\n*Name on the list:* {{4}}\n\nThere's no QR code for this event. Give the name above at the entrance and the team will let you in.",
        samples: ['Riya', 'Techno Tuesdays at Kitty Su', 'Tue, 10 Nov', 'Riya Sharma + 1'],
    },
    {
        name: 'guestlist_task_changes',
        // Reworded after Meta's pre-check read the first version as Marketing.
        body: "✏️ *Your guestlist request needs a change, {{1}}*\n\n*Guestlist:* {{2}}\n*What to change:* {{3}}\n\nUpdate it on the guestlist page and we'll review your request again.",
        samples: ['Riya', 'Techno Tuesdays at Kitty Su', 'The screenshot is blurry, please upload a clearer one'],
        buttons: [list('Open guestlist', 'techno-tuesdays')],
    },
    {
        name: 'guestlist_not_confirmed',
        body: "🙏 *We couldn't fit you in this time, {{1}}*\n\n*Guestlist:* {{2}}\n*Why:* {{3}}\n\nYour account and your other passes aren't affected. Reply here if you think this is a mistake.",
        samples: ['Riya', 'Techno Tuesdays at Kitty Su', 'The list filled up before we reached your sign-up'],
    },
    {
        name: 'guestlist_spot_opened',
        // Reworded after Meta's pre-check read the first version as Marketing.
        body: "📋 *Update on your waitlist request, {{1}}*\n\n*Guestlist:* {{2}}\n*Confirm by:* {{3}}\n\nA place is now available on this guestlist for your waitlist request. Confirm it in the Newbi app before the time above. If it isn't confirmed by then, it's released to the next request.",
        samples: ['Riya', 'Techno Tuesdays at Kitty Su', 'Today, 6:00 PM'],
        buttons: [list('Confirm my place', 'techno-tuesdays')],
    },
    {
        name: 'guestlist_entry_cutoff',
        // Written plainer before submitting, so Meta's pre-check doesn't read it as Marketing.
        body: "🕚 *Guestlist entry time for today, {{1}}*\n\n*Event:* {{2}}\n*Guestlist entry until:* {{3}}\n*Venue:* {{4}}\n\nYour guestlist pass is valid for entry until the time above. After that, the venue's regular entry terms apply. Your pass is in the Newbi app.",
        samples: ['Riya', 'Techno Tuesdays', '11:00 PM', 'Kitty Su, The Lalit, Delhi'],
        buttons: [pass('NB7K2QX4M9')],
    },
    {
        name: 'event_changed',
        body: "📣 *A change to your event, {{1}}*\n\n*Event:* {{2}}\n*What changed:* {{3}}\n\nYour pass still works, so there's nothing to do. If the new plan doesn't work for you, reply here and we'll cancel it.",
        samples: ['Riya', 'NH7 Weekender Pune', 'Doors now open at 5:00 PM (was 4:00 PM)'],
        buttons: [pass('NB7K2QX4M9')],
    },
    {
        name: 'event_cancelled',
        body: "❌ *Event cancelled, {{1}}*\n\n*Event:* {{2}}\n*Was on:* {{3}}\n*Refund:* {{4}}\n\nWe're sorry about this. Your pass has been cancelled. Reply here if you have any questions.",
        samples: ['Riya', 'NH7 Weekender Pune', 'Sat, 5 Dec', '₹1,499 back to your UPI in 5–7 working days'],
    },
    {
        name: 'pass_checked_in',
        body: "🚪 *Your pass was scanned, {{1}}*\n\n*Event:* {{2}}\n*Scanned at:* {{3}}\n\nEnjoy the show! If this wasn't you, reply here now so the gate team can check.",
        samples: ['Riya', 'NH7 Weekender Pune', '5:42 PM'],
    },
    {
        name: 'new_sign_in',
        body: "🔐 *New sign-in to your Newbi account, {{1}}*\n\n*Device:* {{2}}\n*When:* {{3}}\n\nIf this was you, there's nothing to do. If it wasn't, reply here now and we'll lock the account.",
        samples: ['Riya', 'Chrome on Android, Pune', '23 Oct, 9:42 PM'],
    },
    {
        name: 'phone_number_changed',
        body: "📱 *The phone number on your Newbi account changed, {{1}}*\n\n*New number ends in:* {{2}}\n*When:* {{3}}\n\nIf you made this change, there's nothing to do. If you didn't, reply here now.",
        samples: ['Riya', '4321', '23 Oct, 9:42 PM'],
    },
    {
        name: 'accounts_merged',
        body: "🔗 *Your Newbi accounts are now one, {{1}}*\n\n*Merged in:* {{2}}\n*Moved over:* {{3}}\n\nEverything is in this account now. Reply here if you didn't ask for this.",
        samples: ['Riya', 'r•••••@example.com', '3 passes and your creator profile'],
    },
    // Added with the automation work (campaign creators and the team). The two post reminders have an IMAGE
    // header (sample: public/og/wa-deliverables-v1.jpg) added in WhatsApp Manager, like the guestlist ones.
    {
        name: 'campaign_post_due',
        body: "⏳ *Your post is due tomorrow, {{1}}*\n\n*Campaign:* {{2}}\n*Due:* {{3}}\n*Still to send:* {{4}}\n\nPost it, then tap *Send my posts* so we can check it. Reply here if you need more time.",
        samples: ['Riya', 'Bacardi NH7 Hype', 'Thursday, 12 November', 'Reel and Story'],
        buttons: [{ type: 'URL', text: 'Send my posts', url: `${APP}/d/{{1}}`, example: [`${APP}/d/sample-token`] }],
        footer: 'Newbi Creators · app.newbi.live',
    },
    {
        name: 'campaign_post_overdue',
        body: "⚠️ *We haven't got your post yet, {{1}}*\n\n*Campaign:* {{2}}\n*Was due:* {{3}}\n\nSend it today to stay on the campaign. If something came up, reply here and tell us.",
        samples: ['Riya', 'Bacardi NH7 Hype', 'Tuesday, 10 November'],
        buttons: [{ type: 'URL', text: 'Send my posts', url: `${APP}/d/{{1}}`, example: [`${APP}/d/sample-token`] }],
        footer: 'Newbi Creators · app.newbi.live',
    },
    {
        // Worded as an update on a post they already owe: "posting opens" was flagged as Marketing.
        name: 'campaign_posts_open',
        body: "🗓️ *Your post date is set, {{1}}*\n\nYour post for *{{2}}* can go up from {{3}}.\n\n*Post:* {{4}}\n*Due:* {{5}}\n\nOnce it's up, tap *Send my posts* so we can check it. Reply here if you need to change anything.",
        samples: ['Riya', 'Bacardi NH7 Hype', 'tomorrow, Thursday, 12 November', 'Reel and Story', 'Sunday, 15 November'],
        buttons: [{ type: 'URL', text: 'Send my posts', url: `${APP}/d/{{1}}`, example: [`${APP}/d/sample-token`] }],
        footer: 'Newbi Creators · app.newbi.live',
    },
];

/* What Meta checks before review: numbered variables in order, one sample each, none at the edges or touching. */
export const problemsWith = (t) => {
    const out = [];
    const nums = [...t.body.matchAll(/\{\{(\d+)\}\}/g)].map(m => Number(m[1]));
    const unique = [...new Set(nums)];
    if (unique.some((n, i) => n !== i + 1)) out.push('variables must be {{1}}, {{2}}… in order');
    if (unique.length !== t.samples.length) out.push(`${unique.length} variables but ${t.samples.length} samples`);
    if (/^\W*\{\{/.test(t.body) || /\{\{\d+\}\}\W*$/.test(t.body)) out.push('starts or ends with a variable');
    if (/\}\}\s*\{\{/.test(t.body)) out.push('two variables touch');
    if (t.body.length > 1024) out.push('body over 1024 characters');
    if (!/^[a-z0-9_]{1,512}$/.test(t.name)) out.push('name must be lowercase letters, digits and _');
    (t.buttons || []).forEach(b => { if (b.text.length > 25) out.push(`button "${b.text}" over 25 characters`); });
    return out;
};

// headerHandle: the uploaded sample picture's handle, for templates with an image header.
export const payloadFor = (t, headerHandle = null) => ({
    name: t.name,
    language: 'en',
    category: 'UTILITY',
    components: [
        ...(t.header?.image ? [{ type: 'HEADER', format: 'IMAGE', example: { header_handle: [headerHandle || 'HANDLE'] } }] : []),
        { type: 'BODY', text: t.body, example: { body_text: [t.samples] } },
        { type: 'FOOTER', text: t.footer || MEMBER_FOOTER },
        ...(t.buttons?.length ? [{ type: 'BUTTONS', buttons: t.buttons }] : []),
    ],
});

const readEnv = () => {
    const file = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
    const fromFile = Object.fromEntries(file.split('\n').filter(l => /^[A-Z_]+=/.test(l)).map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    }));
    const pick = (k) => process.env[k] || fromFile[k] || '';
    return { token: pick('WHATSAPP_ACCESS_TOKEN'), waba: pick('WHATSAPP_WABA_ID'), version: pick('WHATSAPP_API_VERSION') || 'v23.0' };
};

/* Meta wants a sample picture for an image header, uploaded through its resumable-upload API.
   Used by this script and by the admin's "Submit to Meta" button (api/_lib/whatsappCenter.js). */
export const uploadHeaderSample = async ({ token, version }, { bytes, type, fileName }) => {
    // The app id comes from the token itself, so there's nothing more to set.
    const dbg = await (await fetch(`https://graph.facebook.com/${version}/debug_token?input_token=${encodeURIComponent(token)}`, { headers: { Authorization: `Bearer ${token}` } })).json();
    const appId = dbg?.data?.app_id || process.env.WHATSAPP_APP_ID;
    if (!appId) throw new Error('Could not find the Meta app id (set WHATSAPP_APP_ID).');
    const session = await (await fetch(`https://graph.facebook.com/${version}/${appId}/uploads?file_length=${bytes.length}&file_type=${encodeURIComponent(type)}&file_name=${encodeURIComponent(fileName)}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })).json();
    if (!session.id) throw new Error(`Upload not started: ${session.error?.message || 'no session'}`);
    const done = await (await fetch(`https://graph.facebook.com/${version}/${session.id}`, { method: 'POST', headers: { Authorization: `OAuth ${token}`, file_offset: '0', 'Content-Type': type }, body: bytes })).json();
    if (!done.h) throw new Error(`Upload failed: ${done.error?.message || 'no handle'}`);
    return done.h;
};

const uploadSample = (auth, file) => uploadHeaderSample(auth, {
    bytes: fs.readFileSync(file),
    type: /\.png$/i.test(file) ? 'image/png' : 'image/jpeg',
    fileName: file.split('/').pop(),
});

const main = async () => {
    const submit = process.argv.includes('--submit');
    let bad = 0;
    for (const t of TEMPLATES) {
        const problems = problemsWith(t);
        if (problems.length) { bad += 1; console.log(`✗ ${t.name}: ${problems.join('; ')}`); }
    }
    if (bad) { console.log(`${bad} template(s) need fixing first.`); process.exit(1); }
    console.log(`All ${TEMPLATES.length} templates pass the checks.`);
    if (!submit) {
        console.log('Nothing sent. Run with --submit to send them to Meta.');
        return;
    }

    const { token, waba: wabaFromEnv, version } = readEnv();
    let waba = wabaFromEnv;
    if (!token) {
        console.log('Set WHATSAPP_ACCESS_TOKEN (environment or .env) first.');
        process.exit(1);
    }
    // No WHATSAPP_WABA_ID set: the token knows which WhatsApp account it was granted.
    if (!waba) {
        const dbg = await (await fetch(`https://graph.facebook.com/${version}/debug_token?input_token=${encodeURIComponent(token)}`, { headers: { Authorization: `Bearer ${token}` } })).json();
        const scope = (dbg?.data?.granular_scopes || []).find(g => g.scope === 'whatsapp_business_management');
        waba = scope?.target_ids?.[0] || '';
        if (!waba) { console.log('Could not work out the WhatsApp account from the token. Set WHATSAPP_WABA_ID.'); process.exit(1); }
        console.log(`Using WhatsApp account ${waba} (from the token).`);
    }
    const base = `https://graph.facebook.com/${version}/${encodeURIComponent(waba)}/message_templates`;
    const auth = { Authorization: `Bearer ${token}` };
    const existing = await (await fetch(`${base}?fields=name,status&limit=500`, { headers: auth })).json();
    if (existing.error) {
        console.log(`Meta refused the token or account: ${existing.error.message}`);
        process.exit(1);
    }
    const have = new Map((existing.data || []).map(x => [x.name, x.status]));
    // --only=pass_ticket_qr sends just that one.
    const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);
    for (const t of TEMPLATES.filter(x => !only || x.name === only)) {
        if (have.has(t.name)) { console.log(`– ${t.name}: already in Meta (${have.get(t.name)}), skipped`); continue; }
        let handle = null;
        if (t.header?.image) {
            try { handle = await uploadSample({ token, version }, t.header.image); } catch (err) { console.log(`✗ ${t.name}: ${err.message}`); continue; }
        }
        const res = await fetch(base, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(payloadFor(t, handle)) });
        const out = await res.json();
        console.log(res.ok ? `✓ ${t.name}: submitted (${out.status || 'PENDING'}, ${out.category || 'UTILITY'})` : `✗ ${t.name}: ${out.error?.error_user_msg || out.error?.message || res.status}`);
    }
    console.log('Once one is approved, set WHATSAPP_TEMPLATE_<NAME>=<its name> in Vercel to switch it on.');
};

if (import.meta.url === `file://${process.argv[1]}`) main();
