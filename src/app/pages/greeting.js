/*
 * The Home greeting: a salutation for the time of day with your first name,
 * and one warm line. Something real comes first (your pass in the next few
 * days, or no account yet); otherwise a line for the time and day, which
 * changes daily and stays put while you use the app.
 *
 *   greetingFor({ name: 'Anudeep', city: 'Bengaluru', nextPass, signedIn: true })
 *   → { hello: 'Good evening', name: 'Anudeep', line: 'The night’s young. Here’s what’s on.' }
 */

import { t } from '../../i18n';

const LINES = {
    morning: [
        'Fresh day, fresh shows. Here’s what’s on.',
        'Coffee first, then the guestlist.',
        'Something good is happening this week.',
        'Plan tonight before lunch. Future you will thank you.',
    ],
    afternoon: [
        'Plan tonight while the day’s still going.',
        'A few things worth your evening.',
        'The best plans start around now.',
        'Halfway through the day. Here’s something to look forward to.',
    ],
    evening: [
        'The night’s young. Here’s what’s on.',
        'Doors open somewhere soon. Here’s where.',
        'Good music, good people. Here’s the plan.',
        'Tonight could be a story. Start here.',
    ],
    night: [
        'Plan the weekend before bed.',
        'Tomorrow’s shows, sorted tonight.',
        'The best nights are planned at midnight.',
    ],
    weekend: [
        'It’s the weekend. Here’s where the music is.',
        'Weekend mode: on. Here’s what’s on.',
    ],
    sunday: [
        'Slow Sunday? Line up next week’s nights.',
        'Rest today. Plan the next big night.',
    ],
};

const partOfDay = (h) => (h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'night');
const HELLO = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Up late' };

const dayOfYear = (d) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
const daysUntil = (when, now) => {
    const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const b = new Date(when.getFullYear(), when.getMonth(), when.getDate());
    return Math.round((b - a) / 86400000);
};

export function greetingFor({ name = '', city = '', nextPass = null, signedIn = false, now = new Date() } = {}) {
    const part = partOfDay(now.getHours());
    const hello = t(HELLO[part]);

    // Something real beats a nice line.
    if (nextPass?.when instanceof Date && !Number.isNaN(nextPass.when.getTime())) {
        const n = daysUntil(nextPass.when, now);
        if (n >= 0 && n <= 7 && nextPass.title) {
            const line = n === 0
                ? t('Your pass for {title} is tonight. See you there.', { title: nextPass.title })
                : n === 1
                    ? t('Your pass for {title} is tomorrow. See you there.', { title: nextPass.title })
                    : t('Your pass for {title} is in {n} days. See you there.', { title: nextPass.title, n });
            return { hello, name, line };
        }
    }
    if (!signedIn) {
        return { hello, name: '', line: t('Concerts, campaigns and the community, in one place.') };
    }

    const day = now.getDay();
    let pool = day === 0 ? LINES.sunday : (day === 5 && part !== 'morning') || day === 6 ? LINES.weekend : LINES[part];
    if (city) pool = [...pool, 'Here’s what’s on in {city} this week.'];
    // Changes daily (and with the part of the day), stays the same while you're here.
    const seed = dayOfYear(now) * 4 + ['morning', 'afternoon', 'evening', 'night'].indexOf(part);
    return { hello, name, line: t(pool[seed % pool.length], { city }) };
}
