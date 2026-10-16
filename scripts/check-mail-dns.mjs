#!/usr/bin/env node
/**
 * Checks the DNS records Gmail needs to deliver our mail to inboxes:
 * MX (Google), SPF (include:_spf.google.com), DKIM (the Workspace key) and
 * DMARC. Read-only: it only looks records up.
 *
 *   node scripts/check-mail-dns.mjs                 # newbi.live
 *   node scripts/check-mail-dns.mjs newbi.live artistant.in --selector google
 *
 * Exits with 1 if anything required is missing.
 */
import { promises as dns } from 'node:dns';

const args = process.argv.slice(2);
const selIdx = args.indexOf('--selector');
const selector = selIdx >= 0 ? args[selIdx + 1] : 'google';
const domains = args.filter((a, i) => !a.startsWith('--') && !(selIdx >= 0 && i === selIdx + 1));
if (!domains.length) domains.push('newbi.live');

const COLORS = { pass: '\x1b[32m✔\x1b[0m', warn: '\x1b[33m!\x1b[0m', fail: '\x1b[31m✘\x1b[0m' };
let failures = 0;
const report = (level, label, detail) => {
    if (level === 'fail') failures++;
    console.log(`  ${COLORS[level]} ${label}${detail ? `: ${detail}` : ''}`);
};

const txt = async (name) => {
    try {
        return (await dns.resolveTxt(name)).map(parts => parts.join(''));
    } catch (err) {
        if (['ENOTFOUND', 'ENODATA'].includes(err.code)) return [];
        throw err;
    }
};

const checkDomain = async (domain) => {
    console.log(`\n${domain}`);

    // MX
    try {
        const mx = await dns.resolveMx(domain);
        const google = mx.some(r => /(^|\.)google(mail)?\.com$/i.test(r.exchange) || /aspmx\.l\.google\.com$/i.test(r.exchange) || /smtp\.google\.com$/i.test(r.exchange));
        if (google) report('pass', 'MX', mx.map(r => r.exchange).join(', '));
        else report('warn', 'MX', `not Google Workspace (${mx.map(r => r.exchange).join(', ') || 'none'}). Fine if mail is received elsewhere.`);
    } catch {
        report('warn', 'MX', 'no MX records');
    }

    // SPF
    const spf = (await txt(domain)).filter(r => /^v=spf1\b/i.test(r));
    if (spf.length === 0) report('fail', 'SPF', 'missing. Add TXT "v=spf1 include:_spf.google.com ~all"');
    else if (spf.length > 1) report('fail', 'SPF', `${spf.length} SPF records; there must be exactly one. Merge them.`);
    else if (!/include:_spf\.google\.com/i.test(spf[0])) report('fail', 'SPF', `"${spf[0]}" doesn't include _spf.google.com`);
    else if (/\+all\b/i.test(spf[0])) report('fail', 'SPF', `"${spf[0]}" ends in +all, which lets anyone send as you`);
    else report('pass', 'SPF', spf[0]);

    // DKIM
    const dkim = (await txt(`${selector}._domainkey.${domain}`)).filter(r => /v=DKIM1|k=rsa|p=/i.test(r));
    if (!dkim.length) report('fail', 'DKIM', `nothing at ${selector}._domainkey.${domain}. Turn on DKIM in Google Admin → Apps → Gmail → Authenticate email, publish the record, then press Start authentication.`);
    else if (/p=\s*(;|$)/i.test(dkim[0])) report('fail', 'DKIM', 'the key is empty (revoked)');
    else report('pass', 'DKIM', `${selector}._domainkey key published`);

    // DMARC
    const dmarc = (await txt(`_dmarc.${domain}`)).filter(r => /^v=DMARC1/i.test(r));
    if (!dmarc.length) report('fail', 'DMARC', `missing. Start with TXT at _dmarc.${domain}: "v=DMARC1; p=none; rua=mailto:dmarc@${domain}; fo=1"`);
    else {
        const policy = (dmarc[0].match(/\bp=(\w+)/i) || [])[1] || '';
        const rua = /\brua=/i.test(dmarc[0]);
        if (!policy) report('fail', 'DMARC', `"${dmarc[0]}" has no p= policy`);
        else if (policy.toLowerCase() === 'none') report('warn', 'DMARC', `p=none (monitoring). Move to p=quarantine once reports look clean.${rua ? '' : ' Add rua= to get reports.'}`);
        else report('pass', 'DMARC', `p=${policy}${rua ? '' : ' (add rua= to get reports)'}`);
    }
};

for (const d of domains) {
    try {
        await checkDomain(d);
    } catch (err) {
        report('fail', d, err.message);
    }
}
console.log(failures ? `\n${failures} problem${failures === 1 ? '' : 's'} to fix.` : '\nAll required records are in place.');
process.exit(failures ? 1 : 0);
