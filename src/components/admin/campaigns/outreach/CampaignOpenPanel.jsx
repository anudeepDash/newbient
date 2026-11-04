import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Send from 'lucide-react/dist/esm/icons/send';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import TriangleAlert from 'lucide-react/dist/esm/icons/triangle-alert';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { Button, Card, Badge, Select, SearchInput } from '../../ui';
import { Field, fieldCls } from '../../uploads/UploadKit';
import { Spinner, ConfirmSheet } from '../parts';
import { firstNameOf } from '../../../../lib/outreach/normalize';
import { activeCriteria, matchesCriteria } from '../../../../lib/outreach/openAudience';
import { LIVE_BRIEF_BODY, LIVE_BRIEF_TEMPLATE } from '../../../../lib/outreach/whatsappTemplate';
import { callOutreach } from './outreachApi';
import { Handle, Bubble, followers } from './parts';

/*
 * Outreach → WhatsApp → Campaign open: tell creators registered on the portal
 * that this campaign is live: the campaign_live_brief template ("View the brief"
 * button to its page in the app) once it's switched on, else campaign_invite
 * (Apply button). Starts with everyone who matches the campaign (its cities
 * and follower minimum), hasn't applied and hasn't been told; the team can
 * add the campaign's niches, choose all or any of the criteria, widen it,
 * untick people, and send. Server: api/_lib/outreachOpenCall.js.
 */

const fill = (body, params) => String(body || '').replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? '');
const FALLBACK_BODY = "*A new campaign is open, {{1}}*\n\n{{2}} is taking applications on Newbi. Tap *Apply* to see the details and apply.";
const FALLBACK_BUTTONS = { [LIVE_BRIEF_TEMPLATE]: ['↗ View the brief', 'Stop updates'], campaign_invite: ['↗ Apply'] };

const CampaignOpenPanel = ({ campaign, live }) => {
    const addToast = useStore(s => s.addToast);
    const [state, setState] = useState({ loading: true, error: '', creators: [], criteria: { cities: [], minFollowers: 0, niches: [] }, open: true, template: null });
    const [templates, setTemplates] = useState([]);
    const [match, setMatch] = useState('campaign');
    const [niche, setNiche] = useState('any');
    const [mode, setMode] = useState('all');
    const [minFollowers, setMinFollowers] = useState('');
    const [withUnverified, setWithUnverified] = useState(false);
    const [withTold, setWithTold] = useState(false);
    const [q, setQ] = useState('');
    const [picked, setPicked] = useState(() => new Set());
    const [confirm, setConfirm] = useState(false);
    const [sending, setSending] = useState(false);

    const load = async () => {
        setState(s => ({ ...s, loading: true, error: '' }));
        const r = await callOutreach('outreach-open-audience', { campaignId: campaign.id });
        if (!r.ok) { setState(s => ({ ...s, loading: false, error: r.error })); return; }
        setState({ loading: false, error: '', creators: r.data.creators, criteria: { niches: [], ...r.data.criteria }, open: r.data.open, template: r.data.template || null });
        setMinFollowers(m => (m === '' ? String(r.data.criteria.minFollowers || 0) : m));
    };
    useEffect(() => { load(); }, [campaign.id]); // eslint-disable-line react-hooks/exhaustive-deps
    // The approved text from Meta, for the preview.
    useEffect(() => {
        let on = true;
        callOutreach('wa-templates').then(r => { if (on && r.ok) setTemplates(r.data.templates); });
        return () => { on = false; };
    }, []);

    // The one that goes out: the "View the brief" template once it's switched on, else the Apply one.
    const templateName = state.template || 'campaign_invite';
    const tpl = templates.find(t => t.name === templateName) || null;
    const min = Math.max(0, Number(String(minFollowers).replace(/[,\s]/g, '')) || 0);
    const cities = state.criteria.cities || [];
    const niches = state.criteria.niches || [];
    const criteria = useMemo(() => activeCriteria({ city: match, min, niche }, { cities, niches }), [match, min, niche, cities, niches]);
    const meets = (c) => matchesCriteria(c, criteria, mode);
    const reachable = useMemo(() => state.creators.filter(c => c.phone && !c.optedOut && !c.whatsappOff && !c.applied), [state.creators]);
    const audience = useMemo(() => reachable.filter(c => matchesCriteria(c, criteria, mode)
        && (withUnverified || c.verified)
        && (withTold || !c.told)), [reachable, criteria, mode, withUnverified, withTold]);
    useEffect(() => { setPicked(new Set(audience.map(c => c.id))); }, [audience]);
    const query = q.trim().toLowerCase().replace(/^@/, '');
    const shown = query ? audience.filter(c => `${c.name} ${c.handle} ${c.city} ${c.phone}`.toLowerCase().includes(query)) : audience;
    const recipients = audience.filter(c => picked.has(c.id));
    const allShownPicked = shown.length > 0 && shown.every(c => picked.has(c.id));

    const left = {
        applied: state.creators.filter(c => c.applied).length,
        noNumber: state.creators.filter(c => !c.phone).length,
        stopped: state.creators.filter(c => c.phone && (c.optedOut || c.whatsappOff)).length,
        unverified: reachable.filter(c => !c.verified && meets(c) && (withTold || !c.told)).length,
        told: reachable.filter(c => c.told && meets(c) && (withUnverified || c.verified)).length,
    };
    const sample = recipients[0] || audience[0];
    const params = [firstNameOf(sample?.name) || 'Riya', campaign.title || 'the campaign'];
    const preview = fill(tpl?.body || (templateName === LIVE_BRIEF_TEMPLATE ? LIVE_BRIEF_BODY : FALLBACK_BODY), params);
    const buttons = tpl?.buttons?.length ? tpl.buttons.map(b => (b.url ? `↗ ${b.text}` : b.text)) : FALLBACK_BUTTONS[templateName] || FALLBACK_BUTTONS.campaign_invite;
    // Never every registered creator: at least one criterion has to narrow it (the server checks this too).
    const canSend = live && state.open && criteria.length > 0 && recipients.length > 0 && !sending;

    const sendNow = async () => {
        setSending(true);
        const r = await callOutreach('outreach-open-send', {
            campaignId: campaign.id, creatorIds: recipients.map(c => c.id), includeUnverified: withUnverified, again: withTold,
            criteria: { city: match, min, niche, mode },
        });
        setSending(false);
        setConfirm(false);
        if (!r.ok) { addToast(r.error || 'Please try again.', 'error', { title: 'Not sent' }); return; }
        const s = r.data.skipped || {};
        const notes = [s.already && `${s.already} already got it`, s.noNumber && `${s.noNumber} without a usable number`, s.whatsappOff && `${s.whatsappOff} turned WhatsApp off`, s.notEligible && `${s.notEligible} applied or can’t be messaged`, s.notMatching && `${s.notMatching} don’t fit the criteria`].filter(Boolean);
        addToast(`${r.data.queued} queued${notes.length ? `; ${notes.join(', ')}` : ''}. They go out a few a minute.`, r.data.queued ? 'success' : 'warning', { title: 'Campaign open on WhatsApp' });
        load();
    };

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
            <Card className="min-w-0 space-y-5 p-4">
                {!live && (
                    <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-[13px] font-medium text-amber-700 dark:text-amber-300">
                        <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                        <span>Neither <strong>campaign_live_brief</strong> nor <strong>campaign_invite</strong> is switched on. Once Meta approves one, set WHATSAPP_TEMPLATE_CAMPAIGN_LIVE_BRIEF (or _CAMPAIGN_INVITE) in Vercel. See <Link to="/admin/whatsapp" className="underline">WhatsApp → Templates</Link>.</span>
                    </p>
                )}
                {!state.loading && !state.open && (
                    <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-[13px] font-medium text-amber-700 dark:text-amber-300">
                        <TriangleAlert size={15} className="mt-0.5 shrink-0" /> This campaign isn’t taking applications, so there’s nothing to apply to. Set it to Open (and check the deadline) first.
                    </p>
                )}
                {!state.loading && !criteria.length && (
                    <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-[13px] font-medium text-amber-700 dark:text-amber-300">
                        <TriangleAlert size={15} className="mt-0.5 shrink-0" /> Set at least one criterion: the campaign’s cities, a follower minimum or its niches. This only goes to creators who fit, never to everyone registered.
                    </p>
                )}
                <p className="text-[13px] leading-snug text-gray-500">
                    For creators registered on the creator portal who haven’t applied yet, and only the ones who fit the criteria below. Each person gets it once per campaign (the announcement from Campaigns counts too). Only WhatsApp: email and push go out when you announce the campaign.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Who to send to" hint={criteria.length > 1 ? (mode === 'any' ? 'Anyone who meets at least one of the criteria below.' : 'Only people who meet every criterion below.') : 'Matters once more than one criterion is set.'}>
                        <Select label="Who to send to" value={mode} onChange={setMode} className="w-full" options={[
                            { value: 'all', label: 'Meets all the criteria' },
                            { value: 'any', label: 'Meets any of the criteria' },
                        ]} />
                    </Field>
                    <Field label="Niche" hint={niches.length ? 'Set in the campaign editor (Preferred niches).' : 'The campaign has no preferred niches.'}>
                        <Select label="Niche" value={niche} onChange={setNiche} className="w-full" options={[
                            { value: 'any', label: 'Any niche' },
                            ...(niches.length ? [{ value: 'campaign', label: `This campaign’s niches (${niches.join(', ')})` }] : []),
                        ]} />
                    </Field>
                    <Field label="City">
                        <Select label="City" value={match} onChange={setMatch} className="w-full" options={[
                            { value: 'campaign', label: cities.length ? `This campaign’s cities (${cities.join(', ')})` : 'Any city (the campaign has none set)' },
                            { value: 'any', label: 'Any city' },
                        ]} />
                    </Field>
                    <Field label="At least this many followers" hint={state.criteria.minFollowers ? `The campaign’s minimum is ${followers(state.criteria.minFollowers)}.` : 'The campaign has no minimum.'}>
                        <input className={fieldCls} inputMode="numeric" value={minFollowers} onChange={(e) => setMinFollowers(e.target.value)} placeholder="0" />
                    </Field>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                    <label className="flex items-center gap-2 text-[13px] font-medium">
                        <input type="checkbox" checked={withUnverified} onChange={(e) => setWithUnverified(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                        Include numbers not verified yet ({left.unverified})
                    </label>
                    <label className="flex items-center gap-2 text-[13px] font-medium">
                        <input type="checkbox" checked={withTold} onChange={(e) => setWithTold(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                        Send again to people already told ({left.told})
                    </label>
                </div>
                {withUnverified && <p className="text-[12px] text-amber-600 dark:text-amber-300">An unverified number was typed on the sign-up form and could belong to someone else. Messages to people who didn’t expect them hurt the number’s WhatsApp rating.</p>}

                <div className="space-y-2">
                    <div className="overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.08]">
                        <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] px-3 py-2 dark:border-white/[0.06]">
                            <label className="flex items-center gap-2.5 text-[12px] font-semibold text-gray-500">
                                <input type="checkbox" checked={allShownPicked} disabled={!shown.length} onChange={() => setPicked(s => { const n = new Set(s); shown.forEach(c => (allShownPicked ? n.delete(c.id) : n.add(c.id))); return n; })} className="h-4 w-4 accent-emerald-600" />
                                {recipients.length} of {audience.length} picked
                            </label>
                            <button type="button" onClick={load} className="flex items-center gap-1 text-[12px] font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-white" aria-label="Refresh the list">
                                <RefreshCw size={12} className={cn(state.loading && 'animate-spin')} /> Refresh
                            </button>
                            {audience.length > 8 && <SearchInput value={q} onChange={setQ} placeholder="Find someone" className="ml-auto w-full sm:w-48" />}
                        </div>
                        {state.loading ? (
                            <p className="flex items-center justify-center gap-2 px-4 py-8 text-[13px] text-gray-500"><Spinner /> Finding creators…</p>
                        ) : state.error ? (
                            <p className="px-4 py-6 text-center text-[13px] text-rose-600">{state.error}</p>
                        ) : shown.length ? (
                            <ul className="max-h-96 divide-y divide-black/[0.05] overflow-y-auto dark:divide-white/[0.06]">
                                {shown.slice(0, 500).map(c => (
                                    <li key={c.id}>
                                        <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5">
                                            <input type="checkbox" checked={picked.has(c.id)} onChange={() => setPicked(s => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} className="h-4 w-4 accent-emerald-600" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[13.5px] font-semibold">{c.name}</span>
                                                <span className="block truncate text-[12px] text-gray-500">{c.handle ? <><Handle handle={c.handle} /> · </> : null}{followers(c.followers)} · {c.city || 'No city'}</span>
                                            </span>
                                            {!c.verified && <Badge tone="amber">Not verified</Badge>}
                                            {c.told && <Badge tone="gray">{c.told === 'sent' ? 'Told' : c.told === 'queued' ? 'Queued' : 'Didn’t go'}</Badge>}
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="px-4 py-6 text-center text-[13px] text-gray-500">{audience.length ? 'Nobody matches that search.' : 'Nobody matches. Try any city, a lower follower count, or include unverified numbers.'}</p>
                        )}
                    </div>
                    {shown.length > 500 && <p className="text-[11.5px] text-gray-500">Showing 500 of {shown.length.toLocaleString('en-IN')}; everyone picked is sent to.</p>}
                    {!state.loading && <p className="text-[11.5px] text-gray-500">Not listed: {left.applied} who already applied, {left.noNumber} with no number, {left.stopped} who turned WhatsApp off or replied STOP.</p>}
                </div>
            </Card>

            <div className="min-w-0 space-y-3 lg:sticky lg:top-4 lg:self-start">
                <Card className="space-y-3 p-4">
                    <p className="text-[12px] font-bold text-gray-500">What {sample ? firstNameOf(sample.name) || 'they' : 'they'} will get{tpl ? '' : ' (roughly; the approved text loads from Meta)'}</p>
                    <Bubble text={preview} image={campaign.image || campaign.coverImage || campaign.bannerImage || campaign.thumbnail} buttons={buttons} />
                    <Button variant="success" className="h-11 w-full" disabled={!canSend} onClick={() => setConfirm(true)}>
                        {sending ? <Spinner /> : <Send size={14} />} {!live ? 'Waiting for Meta approval' : !state.open ? 'Applications aren’t open' : !criteria.length ? 'Set a criterion first' : recipients.length ? `Send to ${recipients.length}` : 'Nobody picked'}
                    </Button>
                </Card>
            </div>

            <ConfirmSheet
                open={confirm}
                onClose={() => setConfirm(false)}
                title={`Tell ${recipients.length} creators on WhatsApp?`}
                message={`Each person gets this campaign’s message from the Newbi WhatsApp number, with ${templateName === LIVE_BRIEF_TEMPLATE ? 'a View the brief button that opens the campaign in the app' : 'an Apply button'}. It can’t be taken back once it’s sent.`}
                confirmLabel={sending ? 'Sending…' : `Send to ${recipients.length}`}
                onConfirm={sendNow}
            />
        </div>
    );
};

export default CampaignOpenPanel;
