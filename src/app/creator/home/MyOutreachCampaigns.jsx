import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { useAppStore } from '../../../lib/store/appStore';
import { STATUS_META } from '../../../lib/outreach/status';
import { appPath } from '../../host';
import { callCreatorApi } from '../api';
import { ToneChip } from '../ui';

/*
 * "Your campaigns": the campaigns you applied to with an open form, each
 * linking to your campaign page (groups, I've joined, posts, ticket, payout).
 * Renders nothing when you have none.
 */

const TONE = { violet: 'blue', pink: 'green', teal: 'green', orange: 'amber', rose: 'red' };
const LABEL = { message_queued: 'Shortlisted', message_sent: 'Shortlisted', replied: 'Shortlisted' };

const MyOutreachCampaigns = () => {
    const uid = useAppStore(s => s.authUser?.uid);
    const [items, setItems] = useState([]);
    useEffect(() => {
        if (!uid) { setItems([]); return undefined; }
        let cancelled = false;
        callCreatorApi('outreach-mine').then(r => { if (!cancelled && r.ok) setItems(r.data.items || []); });
        return () => { cancelled = true; };
    }, [uid]);
    if (!items.length) return null;
    return (
        <section className="space-y-2" aria-label="Your campaigns">
            <h2 className="px-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-400">Your campaigns</h2>
            <ul className="space-y-2">
                {items.map(item => {
                    const meta = STATUS_META[item.status] || STATUS_META.applied;
                    const path = item.hubUrl ? new URL(item.hubUrl).pathname : null;
                    const body = (
                        <>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[15px] font-bold">{item.title}</span>
                            </span>
                            <ToneChip tone={TONE[meta.tone] || meta.tone} className="shrink-0 whitespace-nowrap">{LABEL[item.status] || meta.label}</ToneChip>
                            {path && <ChevronRight size={18} className="shrink-0 text-gray-400" />}
                        </>
                    );
                    const cls = 'flex min-h-[56px] items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.04] dark:ring-white/[0.08]';
                    return <li key={`${item.campaignId}_${item.appId}`}>{path ? <Link to={appPath(path)} className={cls}>{body}</Link> : <div className={cls}>{body}</div>}</li>;
                })}
            </ul>
        </section>
    );
};

export default MyOutreachCampaigns;
