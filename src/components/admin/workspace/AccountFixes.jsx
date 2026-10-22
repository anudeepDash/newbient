import React, { useCallback, useEffect, useState } from 'react';
import GitMerge from 'lucide-react/dist/esm/icons/git-merge';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import WandSparkles from 'lucide-react/dist/esm/icons/wand-sparkles';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import { cn } from '../../../lib/utils';
import { callCreatorApi } from '../../../app/creator/api';
import { Badge, Button } from '../ui';
import { fieldCls } from '../uploads/UploadKit';
import { EMAIL_RE, formatDay, relativeTime } from './format';

/*
 * Sign-in accounts for one person, and fixes for the usual mess: a creator
 * profile from the old form that no sign-in owns, and a phone sign-in beside
 * a Google one (api/_lib/adminAccounts.js). Merging keeps the Google/password
 * account, because only a phone sign-in can be moved by the server.
 */

const signsInWithMore = (a) => a.methods.some(m => m !== 'phone');
const emailOf = (a) => a?.signInEmail || a?.profileEmail || '';

/** What one "Fix" does for this person, or why it can't. */
export const planFix = ({ accounts = [], unlinkedCreators = [] }) => {
    if (!accounts.length) return { keep: null, merges: [], link: null, blocked: '', needsEmail: false };
    let keep = null;
    let blocked = '';
    if (accounts.length === 1) keep = accounts[0];
    else if (accounts.some(a => a.staff || a.isBlocked)) blocked = 'One of these accounts is a team account or suspended, so they can’t be merged here.';
    else if (accounts.filter(a => a.creatorProfileId).length > 1) blocked = 'Two of these accounts have their own creator profile. Delete one of them in Creators first.';
    else {
        const strong = accounts.filter(signsInWithMore);
        if (strong.length > 1) blocked = 'More than one of these accounts signs in with Google or a password. Ask them to merge from their profile in the app.';
        else if (strong.length === 1) keep = strong[0];
        else if (accounts.filter(a => a.phone && a.methods.includes('phone')).length > 1) blocked = 'Each account has its own phone sign-in. Ask them to merge from their profile in the app.';
        else keep = accounts.find(a => a.methods.includes('phone')) || accounts[0];
    }
    const merges = keep && !blocked ? accounts.filter(a => a.uid !== keep.uid) : [];
    const link = keep && !blocked && unlinkedCreators.length === 1 && !accounts.some(a => a.creatorProfileId) ? unlinkedCreators[0] : null;
    const emailAfter = keep && (emailOf(keep) || merges.some(emailOf) || link?.email);
    return { keep, merges, link, blocked, needsEmail: Boolean(keep && !blocked && !emailAfter) };
};

const METHOD = {
    'google.com': { label: 'Google', tone: 'blue' },
    phone: { label: 'Phone', tone: 'green' },
    password: { label: 'Password', tone: 'violet' },
    'apple.com': { label: 'Apple', tone: 'gray' },
};

const describe = (a) => {
    if (a.methods.includes('google.com')) return `the Google account (${a.signInEmail})`;
    if (a.methods.includes('password')) return `the email account (${a.signInEmail})`;
    if (a.methods.includes('phone')) return `the phone account (${a.phone})`;
    return `the account ${a.uid.slice(0, 6)}`;
};

const holdsLine = (h = {}) => [
    h.passes ? `${h.passes} pass${h.passes === 1 ? '' : 'es'}` : '',
    h.ticketOrders ? `${h.ticketOrders} ticket order${h.ticketOrders === 1 ? '' : 's'}` : '',
    h.giveawayEntries ? `${h.giveawayEntries} giveaway entr${h.giveawayEntries === 1 ? 'y' : 'ies'}` : '',
].filter(Boolean).join(' · ');

const fail = (res) => Object.assign(new Error(res.error), { userMessage: res.error });

const AddEmail = ({ account, onSaved }) => {
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const save = async (e) => {
        e.preventDefault();
        if (!EMAIL_RE.test(email.trim())) { setError('Enter a valid email address.'); return; }
        setBusy(true);
        setError('');
        const res = await callCreatorApi('admin-account-email', { uid: account.uid, email: email.trim() });
        setBusy(false);
        if (!res.ok) { setError(res.error); if (res.code === 'email_taken') onSaved?.(); return; }
        onSaved?.(`Email added to ${account.name || 'their account'}.`);
    };
    return (
        <form onSubmit={save} className="mt-3 space-y-2">
            <div className="flex gap-2">
                <input
                    type="email" inputMode="email" autoCapitalize="none" autoComplete="off"
                    className={cn(fieldCls, 'h-10 min-w-0 flex-1')}
                    placeholder="Add an email for updates and tickets"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <Button type="submit" size="md" variant="secondary" disabled={busy || !email.trim()}>{busy ? 'Saving…' : 'Add'}</Button>
            </div>
            {error && <p role="alert" className="text-[12.5px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
        </form>
    );
};

/* emailComing: the merge or the creator profile brings an email, so none needs typing. */
const AccountCard = ({ account, isKeep, isMerge, emailComing, onChanged }) => {
    const email = emailOf(account);
    const holds = holdsLine(account.holds);
    return (
        <div className="rounded-2xl border border-black/[0.06] p-3.5 dark:border-white/[0.08]">
            <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[14px] font-bold">{account.name || 'No name'}</span>
                {account.methods.map(m => <Badge key={m} tone={METHOD[m]?.tone || 'gray'}>{METHOD[m]?.label || m}</Badge>)}
                {account.creatorProfileId && <Badge tone="pink">Creator profile</Badge>}
                {account.staff && <Badge tone="indigo">Team</Badge>}
                {account.isBlocked && <Badge tone="red">Suspended</Badge>}
                {isKeep && <Badge tone="green">Keeps</Badge>}
                {isMerge && <Badge tone="amber">Merges in</Badge>}
            </div>
            <div className="mt-2 space-y-0.5 text-[13px] text-gray-600 dark:text-zinc-400">
                <p className={cn(!email && 'font-semibold text-amber-700 dark:text-amber-300')}>{email || 'No email'}{account.profileEmail && !account.signInEmail ? ' (on profile)' : ''}</p>
                {account.phone && <p>{account.phone}</p>}
                <p>
                    {account.createdAt ? `Made ${formatDay(account.createdAt)}` : 'Made: unknown'}
                    {account.lastSignIn ? ` · used ${relativeTime(account.lastSignIn)}` : ''}
                </p>
                {holds && <p>{holds}</p>}
            </div>
            {!email && !isMerge && !emailComing && <AddEmail account={account} onSaved={onChanged} />}
        </div>
    );
};

const AccountFixes = ({ member, open, onConfirm, notify }) => {
    const [state, setState] = useState({ loading: true, error: '', accounts: [], unlinkedCreators: [], canFix: false });
    const email = member?.email || '';
    const phone = member?.phone || '';
    const ids = [member?.id, member?.accountId, member?.uid].filter(Boolean).join(',');

    const load = useCallback(async () => {
        setState(s => ({ ...s, loading: true, error: '' }));
        const res = await callCreatorApi('admin-accounts', { email, phone, ids: [...new Set(ids.split(',').filter(Boolean))] });
        if (!res.ok) { setState(s => ({ ...s, loading: false, error: res.error })); return; }
        setState({ loading: false, error: '', accounts: res.data.accounts || [], unlinkedCreators: res.data.unlinkedCreators || [], canFix: Boolean(res.data.canFix) });
    }, [email, phone, ids]);

    useEffect(() => { if (open && (email || phone || ids)) load(); }, [open, load]); // eslint-disable-line react-hooks/exhaustive-deps

    const changed = (message) => { if (message) notify?.(message, 'success'); load(); };

    const { accounts, unlinkedCreators, canFix, loading, error } = state;
    const plan = planFix({ accounts, unlinkedCreators });
    const firstName = String(member?.displayName || '').split(' ')[0] || 'them';

    const issues = [
        plan.merges.length ? `${accounts.length} separate sign-in accounts. What they do on one doesn’t show on the other.` : '',
        accounts.length > 1 && plan.blocked ? `${accounts.length} separate sign-in accounts.` : '',
        unlinkedCreators.length ? `${unlinkedCreators.length === 1 ? 'Their creator profile' : `${unlinkedCreators.length} creator profiles`} from the form ${unlinkedCreators.length === 1 ? 'isn’t' : 'aren’t'} linked to a sign-in, so the app doesn’t know they’re a creator.` : '',
        plan.needsEmail ? 'No email on the account, so updates and tickets can only go to WhatsApp.' : '',
    ].filter(Boolean);
    const canOneClick = canFix && !plan.blocked && (plan.merges.length > 0 || plan.link);

    const askFix = () => onConfirm({
        title: `Fix ${firstName}’s accounts?`,
        icon: WandSparkles,
        tone: 'warning',
        confirmLabel: 'Fix accounts',
        busyLabel: 'Fixing…',
        description: [
            ...plan.merges.map(m => `Merge ${describe(m)} into ${describe(plan.keep)}. Its passes, tickets and profile move over${m.phone && m.methods.includes('phone') ? `, and ${m.phone} then signs in to the same account` : ''}.`),
            plan.link ? `Link the creator profile${plan.link.instagram ? ` (@${String(plan.link.instagram).replace(/^@/, '')})` : ''} to ${describe(plan.keep)}.` : '',
            plan.merges.length ? 'They’re signed out on the merged account and sign back in once. Either way of signing in then opens the same account.' : '',
        ].filter(Boolean).join(' '),
        onConfirm: async () => {
            for (const m of plan.merges) {
                const res = await callCreatorApi('admin-account-merge', { keepUid: plan.keep.uid, mergeUid: m.uid, confirm: true }, { timeoutMs: 90000 });
                if (!res.ok) { load(); throw fail(res); }
            }
            if (plan.link) {
                const res = await callCreatorApi('admin-creator-link', { creatorId: plan.link.id, uid: plan.keep.uid }, { timeoutMs: 60000 });
                if (!res.ok) { load(); throw fail(res); }
            }
            changed(`${firstName}’s accounts are fixed.`);
        },
    });

    const askLink = (creator, account) => onConfirm({
        title: 'Link this creator profile?',
        icon: Link2,
        tone: 'warning',
        confirmLabel: 'Link profile',
        busyLabel: 'Linking…',
        description: `The creator profile${creator.instagram ? ` (@${String(creator.instagram).replace(/^@/, '')})` : ''} moves to ${describe(account)}, with its campaign work and referrals. The app then shows them as a creator.`,
        onConfirm: async () => {
            const res = await callCreatorApi('admin-creator-link', { creatorId: creator.id, uid: account.uid }, { timeoutMs: 60000 });
            if (!res.ok) { load(); throw fail(res); }
            changed('Creator profile linked.');
        },
    });

    if (loading && !accounts.length && !unlinkedCreators.length) {
        return <div className="h-24 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" aria-label="Looking up sign-in accounts" />;
    }
    if (error) {
        return (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-500/[0.06] p-3.5 text-[13px] text-red-700 dark:text-red-300">
                <span>Couldn’t look up their sign-in accounts. {error}</span>
                <Button size="sm" variant="secondary" onClick={load}><RefreshCw size={13} /> Retry</Button>
            </div>
        );
    }
    if (!accounts.length && !unlinkedCreators.length) {
        return member?.hasAccount ? null : (
            <p className="text-[13px] leading-relaxed text-gray-500">
                We know this person from a ticket, newsletter or creator form, but they haven&apos;t made a sign-in account, so there&apos;s nothing to suspend or sign out.
            </p>
        );
    }

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-bold">Sign-in accounts</h3>
                <Button size="sm" variant="ghost" onClick={load} disabled={loading} aria-label="Refresh"><RefreshCw size={13} className={cn(loading && 'animate-spin')} /></Button>
            </div>

            {issues.length > 0 && (
                <div className="space-y-3 rounded-2xl bg-amber-500/[0.08] p-3.5 dark:bg-amber-400/[0.08]">
                    <div className="flex gap-2.5 text-[13px] text-amber-800 dark:text-amber-200">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <ul className="space-y-1">{issues.map(i => <li key={i}>{i}</li>)}</ul>
                    </div>
                    {plan.blocked && <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-200">{plan.blocked}</p>}
                    {canOneClick && (
                        <Button variant="primary" onClick={askFix} className="h-11 w-full">
                            <GitMerge size={15} /> {plan.merges.length ? (plan.link ? 'Merge into one account and link profile' : 'Merge into one account') : 'Link creator profile'}
                        </Button>
                    )}
                    {!canFix && (plan.merges.length > 0 || plan.link) && (
                        <p className="text-[12.5px] text-amber-800/80 dark:text-amber-200/80">A founder or super admin can fix this from here.</p>
                    )}
                </div>
            )}

            {accounts.map(a => (
                <AccountCard
                    key={a.uid}
                    account={a}
                    isKeep={plan.merges.length > 0 && plan.keep?.uid === a.uid}
                    isMerge={plan.merges.some(m => m.uid === a.uid)}
                    emailComing={plan.keep?.uid === a.uid && Boolean(plan.merges.some(emailOf) || plan.link?.email)}
                    onChanged={changed}
                />
            ))}

            {unlinkedCreators.map(c => (
                <div key={c.id} className="rounded-2xl border border-dashed border-pink-500/30 p-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 text-[14px] font-bold">{c.name || 'Creator profile'}</span>
                        <Badge tone="pink">Creator profile</Badge>
                        <Badge tone="gray">No sign-in</Badge>
                    </div>
                    <div className="mt-2 space-y-0.5 text-[13px] text-gray-600 dark:text-zinc-400">
                        {c.instagram && <p>@{String(c.instagram).replace(/^@/, '')}</p>}
                        <p>{[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact details'}</p>
                        {c.createdAt && <p>From the form, {formatDay(c.createdAt)}</p>}
                    </div>
                    {/* One-off links when the one-click fix doesn't cover it (several profiles, or it can't merge). */}
                    {canFix && !plan.link && !plan.merges.length && accounts.filter(a => !a.creatorProfileId).map(a => (
                        <Button key={a.uid} size="sm" variant="secondary" className="mt-3 mr-2" onClick={() => askLink(c, a)}>
                            <Link2 size={13} /> Link to {describe(a).replace(/^the /, '')}
                        </Button>
                    ))}
                </div>
            ))}
        </section>
    );
};

export default AccountFixes;
