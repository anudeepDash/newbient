import React from 'react';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import { cn } from '../../../lib/utils';
import Sheet from '../Sheet';
import { Avatar, Badge, Button } from '../ui';
import { formatDateTime, formatDay, relativeTime, whatsappLink } from './format';
import { interestLabel } from '../../../app/community/welcomeForm';

/** Coloured tags for what someone is to Newbi (creator, team, tribe…). */
export const memberTags = (m) => {
    const tags = [];
    if (m.isBlocked) tags.push({ label: 'Suspended', tone: 'red' });
    if (m.teamRole) tags.push({ label: 'Team', tone: 'indigo' });
    if (m.isCreator) tags.push({ label: 'Creator', tone: 'pink' });
    if (m.isArtist) tags.push({ label: 'Artist', tone: 'rose' });
    if (m.hasJoinedTribe && !m.isCreator && !m.isArtist) tags.push({ label: 'Tribe', tone: 'blue' });
    if (m.isTicketHolder) tags.push({ label: 'Tickets', tone: 'orange' });
    if (m.isSubscriber) tags.push({ label: 'Newsletter', tone: 'cyan' });
    if (!m.hasAccount) tags.push({ label: 'No account', tone: 'gray' });
    return tags;
};

export const MemberTags = ({ member, max = 4, className }) => (
    <span className={cn('flex flex-wrap items-center gap-1', className)}>
        {memberTags(member).slice(0, max).map(t => <Badge key={t.label} tone={t.tone}>{t.label}</Badge>)}
    </span>
);

const Row = ({ label, children }) => (
    <div className="flex items-start justify-between gap-4 py-2.5">
        <span className="shrink-0 text-[13px] text-gray-500">{label}</span>
        <span className="min-w-0 break-words text-right text-[14px] font-semibold">{children}</span>
    </div>
);

const MemberSheet = ({ open, onClose, member, onSuspend, onReinstate, onSignOut, canModerate }) => {
    if (!member) return <Sheet open={false} onClose={onClose} />;
    const wa = whatsappLink(member.phone, `Hi ${String(member.displayName || '').split(' ')[0] || 'there'},`);
    return (
        <Sheet
            open={open}
            onClose={onClose}
            size="md"
            header={(
                <div className="flex min-w-0 items-center gap-3">
                    <Avatar src={member.photoURL || member.profileImage} name={member.displayName || member.email} size={48} />
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-extrabold tracking-tight">{member.displayName || 'No name'}</h2>
                        <MemberTags member={member} max={6} className="mt-1" />
                    </div>
                </div>
            )}
            bodyClassName="space-y-6"
            footer={canModerate && member.hasAccount ? (
                <div className="flex gap-2">
                    {member.isBlocked ? (
                        <Button variant="success" onClick={() => onReinstate(member)} className="h-12 flex-1"><ShieldCheck size={16} /> Restore access</Button>
                    ) : (
                        <>
                            <Button variant="secondary" onClick={() => onSignOut(member)} className="h-12 flex-1"><LogOut size={15} /> Sign out everywhere</Button>
                            <Button variant="danger" onClick={() => onSuspend(member)} className="h-12 flex-1"><ShieldAlert size={15} /> Suspend</Button>
                        </>
                    )}
                </div>
            ) : null}
        >
            <div className="grid grid-cols-3 gap-2">
                {member.email && (
                    <a href={`mailto:${member.email}`} className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-sky-500/[0.08] text-[12px] font-semibold text-sky-700 dark:bg-neon-blue/[0.08] dark:text-neon-blue">
                        <Mail size={17} /> Email
                    </a>
                )}
                {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-500/[0.08] text-[12px] font-semibold text-emerald-700 dark:bg-neon-green/[0.08] dark:text-neon-green">
                        <MessageCircle size={17} /> WhatsApp
                    </a>
                )}
                {member.phone && (
                    <a href={`tel:${member.phone}`} className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-violet-500/[0.08] text-[12px] font-semibold text-violet-700 dark:bg-neon-purple/[0.08] dark:text-violet-300">
                        <Phone size={17} /> Call
                    </a>
                )}
            </div>

            <section className="divide-y divide-black/[0.06] rounded-2xl border border-black/[0.06] px-4 dark:divide-white/[0.06] dark:border-white/[0.08]">
                <Row label="Email">{member.email || '—'}</Row>
                {member.phone && <Row label="Phone">{member.phone}</Row>}
                {/* From the community welcome form, when they've filled it. */}
                {member.city && <Row label="City">{member.city}</Row>}
                {member.isStudent === true && <Row label="Student">{member.college || 'Yes'}</Row>}
                {member.isStudent === false && <Row label="Does">{member.occupation || 'Not a student'}</Row>}
                {member.gender && <Row label="Gender">{member.gender}</Row>}
                {Array.isArray(member.interests) && member.interests.length > 0 && <Row label="Into">{member.interests.map(interestLabel).join(', ')}</Row>}
                {typeof member.instagramHandle === 'string' && member.instagramHandle && <Row label="Instagram">@{member.instagramHandle}</Row>}
                <Row label="Joined">{member.createdAt ? formatDay(member.createdAt) : 'Unknown'}</Row>
                <Row label="Last seen">{member.lastSeen ? `${relativeTime(member.lastSeen)} · ${formatDateTime(member.lastSeen)}` : 'Not recorded'}</Row>
                <Row label="Account">{member.hasAccount ? (member.isBlocked ? 'Suspended' : 'Active') : 'No sign-in account'}</Row>
            </section>

            {!member.hasAccount && (
                <p className="text-[13px] leading-relaxed text-gray-500">
                    We know this person from a ticket, newsletter or creator form, but they haven't made a sign-in account, so there's nothing to suspend or sign out.
                </p>
            )}
            {member.isBlocked && (
                <p className="text-[13px] leading-relaxed text-gray-500">Suspended people are signed out and can't sign back in until you restore access.</p>
            )}
        </Sheet>
    );
};

export default MemberSheet;
