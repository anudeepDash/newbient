import React from 'react';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Users from 'lucide-react/dist/esm/icons/users';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Send from 'lucide-react/dist/esm/icons/send';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import UserX from 'lucide-react/dist/esm/icons/user-x';
import Star from 'lucide-react/dist/esm/icons/star';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import IdCard from 'lucide-react/dist/esm/icons/id-card';
import { cn } from '../../../lib/utils';
import { accent } from '../theme';
import Sheet from '../Sheet';
import { Avatar, Badge, Button, Menu, MenuItem } from '../ui';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import { DeliveryDots } from './CampaignTickets';
import { StageBadge, Spinner } from './parts';
import { creatorHandle, creatorPhotoOf, formatCount, formatDay, inr, taskTypeOf, waNumber } from './campaignModel';

const SUB_STATUS = {
    not_started: { label: 'Not started', tone: 'gray' },
    submitted: { label: 'To review', tone: 'amber' },
    approved: { label: 'Approved', tone: 'green' },
    rejected: { label: 'Changes asked', tone: 'rose' },
};

const isImageUrl = (url) => /\.(png|jpe?g|webp|gif|heic)(\?|$)/i.test(url || '') || /res\.cloudinary\.com\/.+\/image\//i.test(url || '');

const Check2 = ({ ok, children, neutral }) => (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold', neutral ? accent('gray').chip : ok ? accent('green').chip : accent('amber').chip)}>
        {!neutral && (ok ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />)}
        {children}
    </span>
);

/** One applicant in one campaign: fit, contact, their tasks, payment, and the next step. */
const ApplicantSheet = ({
    open, onClose, campaign, entry, busy,
    onSelect, onUnselect, onStage, onPay, onUnpay, onApprove, onRequestChanges, onMessage, onOpenProfile,
    ticket = null, onSendTicket,
}) => {
    if (!entry) return <Sheet open={false} onClose={onClose} />;
    const { creator, stage, criteria, progress, payout } = entry;
    const handle = creatorHandle(creator);
    const wa = waNumber(creator.phone);
    const selected = ['selected', 'review', 'approved', 'paid'].includes(stage) && (creator.shortlistedCampaigns || []).includes(campaign.id);
    const college = creator.college || creator.collegeName || creator.university;

    const header = (
        <div className="flex items-start gap-3">
            <Avatar src={creatorPhotoOf(creator)} name={creator.name} size={52} className="rounded-2xl" />
            <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-lg font-extrabold tracking-tight">
                    <span className="truncate">{creator.name || 'Creator'}</span>
                    {creator.instagramVerified && <ShieldCheck size={16} className="shrink-0 text-sky-500" aria-label="Instagram verified" />}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StageBadge stage={stage} />
                    {handle && (
                        <a href={`https://instagram.com/${handle}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-gray-500 hover:text-pink-600 dark:hover:text-neon-pink">
                            @{handle} <ExternalLink size={10} />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );

    const footer = (
        <div className="flex flex-wrap gap-2">
            {!selected ? (
                <>
                    {stage !== 'declined' && <Button variant="secondary" onClick={() => onStage(entry, 'declined')} disabled={busy} className="h-11"><UserX size={14} /> Not selected</Button>}
                    {stage === 'applied' && <Button variant="secondary" onClick={() => onStage(entry, 'shortlisted')} disabled={busy} className="h-11"><Star size={14} /> Shortlist</Button>}
                    {(stage === 'shortlisted' || stage === 'declined') && <Button variant="ghost" onClick={() => onStage(entry, null)} disabled={busy} className="h-11"><Undo2 size={14} /> Back to applied</Button>}
                    <Button variant="accent" onClick={() => onSelect(entry)} disabled={busy} className="h-11 min-w-[140px] flex-1">
                        {busy ? <Spinner /> : <UserCheck size={14} />} Select and notify
                    </Button>
                </>
            ) : (
                <>
                    <Button variant="secondary" onClick={() => onMessage(entry)} className="h-11 flex-1"><Send size={14} /> Message</Button>
                    {stage !== 'paid' && <Button variant="success" onClick={() => onPay(entry)} disabled={busy} className="h-11 flex-1"><Wallet size={14} /> Mark paid</Button>}
                </>
            )}
        </div>
    );

    return (
        <Sheet open={open} onClose={onClose} header={header} size="lg" footer={footer}>
            <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                    {wa && (
                        <Button as="a" size="sm" variant="secondary" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="h-10"><MessageCircle size={14} className="text-emerald-500" /> WhatsApp</Button>
                    )}
                    {creator.email && (
                        <Button as="a" size="sm" variant="secondary" href={`mailto:${creator.email}`} className="h-10"><Mail size={14} /> Email</Button>
                    )}
                    {handle && (
                        <Button as="a" size="sm" variant="secondary" href={`https://instagram.com/${handle}`} target="_blank" rel="noopener noreferrer" className="h-10"><Instagram size={14} className="text-pink-500" /> Instagram</Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => onOpenProfile(creator)} className="h-10"><IdCard size={14} /> Full profile</Button>
                    {selected && (
                        <Menu trigger={({ toggle }) => (
                            <Button size="sm" variant="ghost" onClick={toggle} aria-label="More" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
                        )}>
                            <MenuItem icon={UserX} danger onClick={() => onUnselect(entry)} hint="They lose access to the tasks">Remove from campaign</MenuItem>
                        </Menu>
                    )}
                </div>

                <section>
                    <h3 className="mb-2 text-[13px] font-bold">Fit for this campaign</h3>
                    <div className="flex flex-wrap gap-1.5">
                        <Check2 ok={criteria.meetsFollowers} neutral={criteria.min <= 0}>
                            <Users size={12} /> {formatCount(criteria.followers)} followers{criteria.min > 0 ? ` · needs ${formatCount(criteria.min)}` : ''}
                        </Check2>
                        <Check2 ok={criteria.meetsCity} neutral={!criteria.cityTargeted}>
                            <MapPin size={12} /> {creator.city || 'No city'}{criteria.cityTargeted ? ` · wants ${campaign.targetCity}` : ''}
                        </Check2>
                        {college && <Check2 neutral><GraduationCap size={12} /> {college}</Check2>}
                        {criteria.nicheMatch && <Badge tone="violet" className="px-2.5 py-1 text-[12px]"><Sparkles size={12} /> Niche match</Badge>}
                        {creator.profileStatus && creator.profileStatus !== 'approved' && <Badge tone="amber" className="px-2.5 py-1 text-[12px]">Profile not verified</Badge>}
                    </div>
                </section>

                {(selected || progress.items.some(i => i.sub)) && (
                    <section>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-[13px] font-bold">Deliverables</h3>
                            <span className="text-[12px] text-gray-500">{progress.approved} of {progress.total} approved</span>
                        </div>
                        {progress.total === 0 ? (
                            <p className="text-[13px] text-gray-500">This campaign has no deliverables yet.</p>
                        ) : (
                            <ul className="space-y-2">
                                {progress.items.map(({ task, sub, status }) => {
                                    const cfg = SUB_STATUS[status] || SUB_STATUS.not_started;
                                    const TypeIcon = taskTypeOf(task.taskType).icon;
                                    const content = sub?.contentLink && /^https?:\/\//i.test(sub.contentLink) ? sub.contentLink : '';
                                    return (
                                        <li key={task.id} className={cn('rounded-xl border p-3', status === 'submitted' ? cn(accent('amber').border, accent('amber').soft) : 'border-black/[0.06] dark:border-white/[0.08]')}>
                                            <div className="flex items-start gap-3">
                                                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', accent('pink').chip)}><TypeIcon size={15} /></span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[14px] font-semibold">{task.title || 'Deliverable'}</p>
                                                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-gray-500">
                                                        <Badge tone={cfg.tone}>{cfg.label}</Badge>
                                                        {sub?.submittedAt && <span>Sent {formatDay(sub.submittedAt)}</span>}
                                                        {task.priority === 'optional' && <span>Optional</span>}
                                                    </p>
                                                    {status === 'rejected' && sub?.rejectionReason && (
                                                        <p className="mt-1.5 text-[12px] text-rose-600 dark:text-rose-300">You asked: {sub.rejectionReason}</p>
                                                    )}
                                                    {sub?.contentLink && !content && sub.contentLink !== 'Deliverable completed by creator' && (
                                                        <p className="mt-1.5 break-words text-[12px] text-gray-600 dark:text-zinc-300">{sub.contentLink}</p>
                                                    )}
                                                    {(content || sub?.proofUrl) && (
                                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                                            {content && (
                                                                <a href={content} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/10 px-3 text-[12px] font-semibold hover:border-black/25 dark:border-white/10">
                                                                    <ExternalLink size={12} /> Open content
                                                                </a>
                                                            )}
                                                            {sub?.proofUrl && (isImageUrl(sub.proofUrl) ? (
                                                                <a href={sub.proofUrl} target="_blank" rel="noopener noreferrer" className="block h-16 w-16 overflow-hidden rounded-lg border border-black/10 dark:border-white/10" aria-label="Open proof image">
                                                                    <img src={sub.proofUrl} alt="Proof" className="h-full w-full object-cover" loading="lazy" />
                                                                </a>
                                                            ) : (
                                                                <a href={sub.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/10 px-3 text-[12px] font-semibold hover:border-black/25 dark:border-white/10">
                                                                    <ExternalLink size={12} /> Open proof
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {sub && status !== 'not_started' && (
                                                <div className="mt-3 flex gap-2">
                                                    {status !== 'approved' && (
                                                        <Button size="sm" variant="success" onClick={() => onApprove(entry, task)} disabled={busy} className="h-10 flex-1"><Check size={14} /> Approve</Button>
                                                    )}
                                                    {status !== 'rejected' && (
                                                        <Button size="sm" variant="secondary" onClick={() => onRequestChanges(entry, task)} disabled={busy} className="h-10 flex-1"><X size={14} /> Request changes</Button>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                )}

                {onSendTicket && (selected || stage === 'shortlisted' || ticket) && (
                    <section>
                        <h3 className="mb-2 text-[13px] font-bold">Event ticket</h3>
                        {ticket ? (
                            <div className={cn('flex items-center gap-3 rounded-xl border p-3', accent('green').border, accent('green').soft)}>
                                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent('green').chip)}><Ticket size={17} /></span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[14px] font-bold">{ticket.externalTicket ? (ticket.externalTicket.kind === 'pdf' ? 'PDF ticket' : 'Ticket link') : 'Newbi pass'}{ticket.status === 'checked_in' ? ' · checked in' : ''}</p>
                                    <div className="mt-1"><DeliveryDots delivery={ticket.delivery} showSeen /></div>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => onSendTicket(entry)} className="h-10">Send</Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <p className="min-w-0 flex-1 text-[13px] text-gray-500">No ticket sent yet.</p>
                                <Button size="sm" variant="secondary" onClick={() => onSendTicket(entry)} className="h-10"><Ticket size={14} /> Send ticket</Button>
                            </div>
                        )}
                    </section>
                )}

                {(selected || payout) && (
                    <section>
                        <h3 className="mb-2 text-[13px] font-bold">Payment</h3>
                        {payout?.status === 'paid' ? (
                            <div className={cn('flex items-center gap-3 rounded-xl border p-3', accent('teal').border, accent('teal').soft)}>
                                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent('teal').chip)}><Wallet size={17} /></span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-extrabold tabular-nums">{inr(payout.amount)}</p>
                                    <p className="truncate text-[12px] text-gray-500">Paid {formatDay(payout.paidAt, true)}{payout.note ? ` · ${payout.note}` : ''}</p>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => onPay(entry)} className="h-10">Edit</Button>
                                <Button size="sm" variant="ghost" onClick={() => onUnpay(entry)} disabled={busy} className="h-10 text-rose-600 dark:text-rose-300">Undo</Button>
                            </div>
                        ) : (
                            <p className="text-[13px] text-gray-500">
                                {progress.requiredDone ? 'All required deliverables are approved. Mark them paid once the money is sent.' : 'Not paid yet.'}
                            </p>
                        )}
                    </section>
                )}

                <section className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-3">
                    {[
                        ['Phone', creator.phone],
                        ['Email', creator.email],
                        ['City', creator.city],
                        ['Instagram followers', creator.instagramFollowers ? Number(creator.instagramFollowers).toLocaleString('en-IN') : ''],
                        ['YouTube', creator.youtubeSubscribers ? `${formatCount(creator.youtubeSubscribers)} subscribers` : ''],
                        ['Creator ID', creator.creatorId],
                    ].filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} className="min-w-0 py-1.5">
                            <p className="text-[12px] font-bold text-gray-500">{k}</p>
                            <p className="truncate font-medium">{v}</p>
                        </div>
                    ))}
                </section>
            </div>
        </Sheet>
    );
};

export default ApplicantSheet;
