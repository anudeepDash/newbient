/**
 * Who mail is sent as, and with which Gmail login.
 *
 * Credentials and the From address are looked up per service key from env:
 *   SMTP_USER_<KEY> / SMTP_PASS_<KEY>   (or <KEY>_SMTP_USER / <KEY>_SMTP_PASS)
 *   SMTP_FROM_<KEY>="Name <alias@newbi.live>"
 * and fall back to SMTP_USER / SMTP_PASS. Each From alias must be set up as
 * "Send mail as" on the login it goes through, or Gmail rewrites it.
 */

const unquote = (value) => {
    let v = String(value || '').trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1).trim();
    return v;
};

/** "Name <email>" or "email" → { name, email }. */
export const parseAlias = (fromStr) => {
    if (!fromStr) return {};
    const match = String(fromStr).match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
    if (match) return { name: match[1]?.trim() || null, email: match[2]?.trim() || null };
    return { email: String(fromStr).trim() };
};

/** SMTP login and sender alias for a service key (moved here from api/mail.js). */
export const getEmailConfig = (serviceKey, defaultName, defaultEmail) => {
    const key = String(serviceKey || 'OFFICIAL').toUpperCase();
    let smtpUser = process.env[`SMTP_USER_${key}`] || process.env[`${key}_SMTP_USER`] || process.env.SMTP_USER;
    let smtpPass = process.env[`SMTP_PASS_${key}`] || process.env[`${key}_SMTP_PASS`] || process.env.SMTP_PASS;
    if (key === 'WEEKLY') {
        smtpUser = process.env.WEEKLY_SMTP_USER || smtpUser;
        smtpPass = process.env.WEEKLY_SMTP_PASS || smtpPass;
    }

    let fromDisplayName = defaultName;
    let fromEmailAddress = defaultEmail;
    let envFrom = process.env[`SMTP_FROM_${key}`] || process.env[`${key}_SMTP_FROM`];
    if (!envFrom && key === 'OFFICIAL') envFrom = process.env.SMTP_FROM;
    if (envFrom) {
        const parsed = parseAlias(envFrom);
        if (parsed.name) fromDisplayName = parsed.name;
        if (parsed.email) fromEmailAddress = parsed.email;
    }

    return { smtpUser: unquote(smtpUser), smtpPass: unquote(smtpPass), fromDisplayName, fromEmailAddress };
};

/**
 * Named senders used by server templates. `key` picks the env overrides.
 * Ticket mail keeps going out as booking@ (what guests already receive) until
 * the owner sets SMTP_FROM_TICKETS to a tickets@ alias.
 */
export const SENDERS = {
    official: { key: 'OFFICIAL', name: 'newbi.live', email: 'partnership@newbi.live' },
    tickets: { key: 'TICKETS', name: 'Newbi Tickets', email: 'booking@newbi.live' },
    creators: { key: 'CREATORS', name: 'Newbi Creators', email: 'creators@newbi.live' },
    security: { key: 'SECURITY', name: 'Newbi Security', email: 'noreply@newbi.live' },
    noreply: { key: 'NOREPLY', name: 'Newbi', email: 'noreply@newbi.live' },
    support: { key: 'SUPPORT', name: 'Newbi', email: 'noreply@newbi.live', replyTo: 'partnership@newbi.live' },
    finance: { key: 'BILLING', name: 'Newbi Finance', email: 'partnership@newbi.live' },
    partnerships: { key: 'PARTNERSHIP', name: 'Newbi Partnerships', email: 'partnership@newbi.live' },
    legal: { key: 'LEGAL', name: 'Newbi Legal', email: 'partnership@newbi.live' },
    weekly: { key: 'WEEKLY', name: 'Weekly by Concert Zone', email: 'weekly@newbi.live' },
};

/** A resolved account: credentials, the From header, and a quota id per Gmail login. */
export const resolveSender = (senderName = 'official', { fromName, fromEmail, credentialKey } = {}) => {
    const sender = SENDERS[senderName] || SENDERS.official;
    const from = getEmailConfig(sender.key, fromName || sender.name, fromEmail || sender.email);
    const creds = credentialKey ? getEmailConfig(credentialKey, from.fromDisplayName, from.fromEmailAddress) : from;
    // Bulk mail uses its own login when SMTP_USER_NEWSLETTER is set, else the sender's.
    const useCreds = creds.smtpUser && creds.smtpPass ? creds : from;
    return {
        senderName,
        serviceKey: sender.key,
        smtpUser: useCreds.smtpUser,
        smtpPass: useCreds.smtpPass,
        fromName: from.fromDisplayName,
        fromEmail: from.fromEmailAddress,
        from: `"${String(from.fromDisplayName || '').replace(/["\r\n]/g, '')}" <${from.fromEmailAddress}>`,
        replyTo: sender.replyTo || undefined,
        quotaId: quotaIdFor(useCreds.smtpUser),
    };
};

/**
 * The sender for an arbitrary staff choice (the old /api/mail rules): an
 * accountType of weekly/creators, or a From address on one of our aliases.
 */
export const senderForStaffChoice = ({ accountType = 'official', fromEmail = '' } = {}) => {
    if (accountType === 'weekly') return 'weekly';
    if (accountType === 'creators' || accountType === 'creator') return 'creators';
    const e = String(fromEmail || '').toLowerCase();
    if (!e) return 'official';
    if (e.includes('creator')) return 'creators';
    if (e.includes('tickets') || e.includes('booking')) return 'tickets';
    if (e.includes('billing')) return 'finance';
    if (e.includes('legal')) return 'legal';
    if (e.includes('partnership')) return 'partnerships';
    if (e.includes('security')) return 'security';
    if (e.includes('weekly')) return 'weekly';
    if (e.includes('noreply')) return 'noreply';
    return 'official';
};

export const quotaIdFor = (smtpUser) => String(smtpUser || 'default').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 80) || 'default';
