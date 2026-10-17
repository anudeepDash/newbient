/**
 * The sample outreach campaign and its 20 fake applicants, written through the
 * same server code the public form uses. Used by scripts/seed-outreach.mjs
 * (local emulator only) and by tests/outreach/seed.test.js (in memory).
 */
import { handleOutreachAction } from '../api/_lib/outreach.js';

export const CAMPAIGN_ID = 'seed-arijit-blr';
const ADMIN = { uid: 'seed-admin', email: 'seed-admin@newbi.test', email_verified: true };

const res = () => {
    const r = { statusCode: 200, body: null };
    r.status = (c) => { r.statusCode = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    return r;
};
const makeCall = (db) => async (action, body, { token = null, ip = '203.0.113.1' } = {}) => {
    const out = res();
    await handleOutreachAction(action, { method: 'POST', body, query: {}, headers: { 'x-forwarded-for': ip } }, out, { decodedToken: token, db });
    return out;
};

export const PEOPLE = [
    ['Riya Sharma', '@riya.sharma', 12500, 'Christ University', 'Music & Dance'],
    ['Arjun Kapoor', 'https://instagram.com/arjun.k/', 48200, 'Infosys', 'Travel & Lifestyle'],
    ['Meera Iyer', 'meera_blr', 8300, 'Mount Carmel College', 'Fashion & Luxury'],
    ['Kabir Mehta', '@kabir.m', 152000, 'Freelance', 'Comedy & Entertainment'],
    ['ANANYA RAO', '@ananya.eats', 23400, 'St. Joseph’s College', 'Food & Beverage'],
    ['Dev Patel', '@dev.shoots', 6100, 'Srishti Institute', 'Photography & Filmmaking'],
    ['Sana Khan', '@sana.k', 31000, 'Jain University', 'Beauty & Fitness'],
    ['rj_99', '@rj_99', 4700, 'Radio City', 'Podcasts & Media'],
    ['Nikhil Reddy', '@nikhil.moto', 77800, 'Bosch', 'Automotive & Moto'],
    ['Pooja Nair', '@pooja.nair', 15900, 'Christ University', 'Student/Campus Creator'],
    ['Aditya Sen', '@adi.sen', 9800, 'PES University', 'Tech & Gaming'],
    ['Ishita Ghosh', '@ishita.art', 21000, 'NIFT Bangalore', 'Art & Design'],
    ['Rahul Verma', '@blr.gigs', 64000, 'BLR Gigs (city page)', 'City Pages'],
    ['Tanvi Joshi', '@tanvi.fit', 18700, 'Cult.fit', 'Fitness & Sports'],
    ['Farhan Ali', '@farhan.memes', 112000, 'Self-employed', 'Meme & Pop Culture'],
    ['Sneha Kulkarni', '@sneha.k', 5400, 'RV College', 'Student/Campus Creator'],
    ['Vikram Shetty', '@vikram.eats', 27600, 'Zomato', 'Food & Beverage'],
    ['Aisha Thomas', '@aisha.t', 39500, 'Mount Carmel College', 'Fashion & Luxury'],
    ['R K', '@r.k.music', 11200, 'Christ University', 'Music & Dance'],
    ['Zoya Hussain', '@zoya.h', 8800, 'Jyoti Nivas College', 'Travel & Lifestyle'],
];

const phoneFor = (i) => `+1 202 555 01${String(i).padStart(2, '0')}`;

/** Writes the sample campaign. Returns { created } (new applications). */
export const seedOutreach = async (db) => {
    const call = makeCall(db);
    await db.collection('admins').doc('seed-admin').set({ email: ADMIN.email, role: 'admin', name: 'Seed admin' });
    await db.collection('campaigns').doc(CAMPAIGN_ID).set({
        title: '[SEED] Arijit Singh Live, Bangalore',
        brand: 'Newbi Entertainment',
        artist: 'Arijit Singh',
        slug: 'seed-arijit-blr',
        status: 'Open',
        publicApplyEnabled: true,
        cities: ['Bangalore', 'Mysore'],
        targetCity: 'Bangalore',
        eventDate: '2099-11-15',
        applicationDeadline: '2099-11-01',
        postingDeadline: '2099-11-10',
        deliverablesText: '1 reel + 2 stories with the ticket link sticker.',
        perksByTier: {
            nano: { minFollowers: 0, cash: 0, pass: '1 GA pass' },
            micro: { minFollowers: 10000, cash: 1500, pass: '2 GA passes' },
            macro: { minFollowers: 100000, cash: 5000, pass: '2 VIP passes' },
        },
        description: '<p>Sample campaign for trying the outreach module locally.</p>',
        reward: 'Passes + cash by tier',
        tasks: [],
        createdAt: new Date().toISOString(),
    });

    let created = 0;
    for (const [i, [fullName, instagram, followerCount, collegeOrEmployer, category]] of PEOPLE.entries()) {
        const r = await call('outreach-apply', {
            slug: 'seed-arijit-blr',
            fullName,
            email: `seed${i}@example.com`,
            phone: phoneFor(i),
            instagram,
            followerCount: String(followerCount),
            collegeOrEmployer,
            city: i % 5 === 4 ? 'Mysore' : 'Bangalore',
            category,
            runsCityPages: category === 'City Pages',
            cityPagesHandle: category === 'City Pages' ? instagram : '',
            registeredNewbiCreator: i % 3 === 0,
            referralSource: ['Instagram', 'WhatsApp group', 'A friend'][i % 3],
            consentWhatsApp: true,
        }, { ip: `203.0.113.${10 + i}` });
        if (!r.body?.success) throw new Error(`Applicant ${i} failed: ${JSON.stringify(r.body)}`);
        created += r.body.updated ? 0 : 1;
    }

    // Riya applies again with a new follower count: the same application is updated.
    await call('outreach-apply', {
        slug: 'seed-arijit-blr', fullName: 'Riya Sharma', email: 'seed0@example.com', phone: phoneFor(0), instagram: 'riya.sharma',
        followerCount: '13100', collegeOrEmployer: 'Christ University', city: 'Bangalore', category: 'Music & Dance',
        registeredNewbiCreator: true, consentWhatsApp: true,
    }, { ip: '203.0.113.99' });

    // Move a few along so every panel has something in it.
    const apps = (await db.collection('campaigns').doc(CAMPAIGN_ID).collection('applications').get()).docs;
    const idOf = (handle) => apps.find(d => d.data().instagramHandle === handle)?.id;
    const ids = (...handles) => handles.map(idOf).filter(Boolean);
    await call('outreach-settings', {
        campaignId: CAMPAIGN_ID,
        whatsappGroupLink: 'https://chat.whatsapp.com/SeedGroupInvite123',
        messageTemplate: '',
    }, { token: ADMIN });
    await call('outreach-status', { campaignId: CAMPAIGN_ID, appIds: ids('riya.sharma', 'arjun.k', 'kabir.m', 'ananya.eats', 'rj_99', 'blr.gigs'), to: 'shortlisted' }, { token: ADMIN });
    await call('outreach-status', { campaignId: CAMPAIGN_ID, appIds: ids('arjun.k', 'kabir.m'), to: 'message_queued' }, { token: ADMIN });
    await call('outreach-status', { campaignId: CAMPAIGN_ID, appIds: ids('kabir.m'), to: 'message_sent', messageText: '(seed) message' }, { token: ADMIN });
    await call('outreach-status', { campaignId: CAMPAIGN_ID, appIds: ids('kabir.m'), to: 'joined' }, { token: ADMIN });

    return { created };
};

