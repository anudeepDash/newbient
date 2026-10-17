import React from 'react';
import Copy from 'lucide-react/dist/esm/icons/copy';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import { cn } from '../../../../lib/utils';
import { copyToClipboard } from '../../../../lib/clipboard';
import { useStore } from '../../../../lib/store';
import { Field, fieldCls, Toggle } from '../../uploads/UploadKit';
import { BuilderCard } from '../../events/EditorParts';
import { slugify } from '../../../../lib/outreach/normalize';
import { TIERS, DEFAULT_TIER_MIN } from '../../../../lib/outreach/application';
import { applyUrlFor } from './outreachApi';

/*
 * The campaign editor's "Open form" card: the no-sign-in application at
 * app.newbi.live/c/{slug}/apply, and what that page shows (artist, cities,
 * dates, deliverables, perks by tier). The WhatsApp group link and message
 * template are not here: they're private and live in the Outreach tab.
 */

export const OPEN_FORM_FIELDS = {
    publicApplyEnabled: false, slug: '', artist: '', citiesText: '', eventDate: '', applicationDeadline: '',
    postingDeadline: '', deliverablesText: '',
    perksByTier: Object.fromEntries(TIERS.map(t => [t, { minFollowers: '', cash: '', pass: '' }])),
};

const toStr = (v) => (v === undefined || v === null || Number.isNaN(Number(v)) || v === '' ? '' : String(v));

/** A stored campaign → editor values. */
export const openFormFromCampaign = (c = {}, { copy = false } = {}) => ({
    publicApplyEnabled: copy ? false : Boolean(c.publicApplyEnabled),
    slug: copy ? '' : (c.slug || ''),
    artist: c.artist || '',
    citiesText: (Array.isArray(c.cities) ? c.cities : []).join(', '),
    eventDate: c.eventDate || '',
    applicationDeadline: c.applicationDeadline || '',
    postingDeadline: c.postingDeadline || '',
    deliverablesText: c.deliverablesText || '',
    perksByTier: Object.fromEntries(TIERS.map(t => {
        const p = c.perksByTier?.[t] || {};
        return [t, { minFollowers: toStr(p.minFollowers), cash: toStr(p.cash), pass: p.pass || '' }];
    })),
});

const parseCities = (text) => [...new Set(String(text || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean))];
const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Math.max(0, Math.round(Number(v) || 0)));

/** Editor values → what gets saved on the campaign doc. */
export const openFormPayload = (f) => ({
    publicApplyEnabled: Boolean(f.publicApplyEnabled),
    slug: String(f.slug || '').trim().toLowerCase() || null,
    artist: f.artist.trim(),
    cities: parseCities(f.citiesText),
    eventDate: f.eventDate || null,
    applicationDeadline: f.applicationDeadline || null,
    postingDeadline: f.postingDeadline || null,
    deliverablesText: f.deliverablesText.trim(),
    perksByTier: Object.fromEntries(TIERS.map(t => {
        const p = f.perksByTier?.[t] || {};
        return [t, { minFollowers: numOrNull(p.minFollowers), cash: numOrNull(p.cash), pass: String(p.pass || '').trim() }];
    })),
});

/** Errors for the open form, as { field: message }. Slug uniqueness is checked on save. */
export const validateOpenForm = (f, { targetCity } = {}) => {
    const e = {};
    if (!f.publicApplyEnabled) {
        if (f.slug && !/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/.test(f.slug)) e.slug = 'Use lowercase letters, numbers and dashes.';
        return e;
    }
    if (!f.slug) e.slug = 'Give the form a link name.';
    else if (!/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/.test(f.slug)) e.slug = 'Use lowercase letters, numbers and dashes.';
    const cities = parseCities(f.citiesText);
    if (!cities.length && (!targetCity || targetCity === 'Any')) e.citiesText = 'Add at least one city for the form’s city list.';
    if (f.applicationDeadline && f.eventDate && f.applicationDeadline > f.eventDate) e.applicationDeadline = 'Applications should close before the event.';
    const mins = TIERS.map(t => numOrNull(f.perksByTier?.[t]?.minFollowers) ?? DEFAULT_TIER_MIN[t]);
    if (!(mins[0] <= mins[1] && mins[1] <= mins[2])) e.perksByTier = 'Each tier should start at more followers than the one before.';
    return e;
};

const OpenFormCard = ({ form, set, title, targetCity, errors, err }) => {
    const addToast = useStore(s => s.addToast);
    const url = form.slug ? applyUrlFor(form.slug) : '';
    const setPerk = (tier, key, value) => set({ perksByTier: { ...form.perksByTier, [tier]: { ...form.perksByTier[tier], [key]: value } } });
    const copy = async () => {
        const ok = await copyToClipboard(url);
        addToast(ok ? 'Form link copied.' : 'Couldn’t copy. Select the link and copy it.', ok ? 'success' : 'error');
    };

    return (
        <BuilderCard id="cm-open-form" title="Open application form" hint="A no-sign-in form you can share anywhere, instead of a Google Form">
            <div className="space-y-4">
                <Toggle
                    label="Take applications with the open form"
                    hint="Anyone with the link can apply until the application deadline, while the campaign is Open."
                    checked={form.publicApplyEnabled}
                    onChange={(v) => set({ publicApplyEnabled: v, slug: form.slug || slugify(title) })}
                />
                <Field label="Link name" optional={!form.publicApplyEnabled} hint={url ? url : 'Lowercase letters, numbers and dashes.'}>
                    <div className="flex gap-2">
                        <input
                            id="cm-field-slug"
                            className={cn(fieldCls, errors.slug && 'border-rose-500/60')}
                            value={form.slug}
                            onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60) })}
                            placeholder={slugify(title) || 'arijit-singh-blr'}
                            autoCapitalize="off"
                        />
                        {url && (
                            <>
                                <button type="button" onClick={copy} aria-label="Copy form link" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 text-gray-600 hover:text-gray-900 dark:border-white/10 dark:text-zinc-300"><Copy size={16} /></button>
                                <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Open form" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 text-gray-600 hover:text-gray-900 dark:border-white/10 dark:text-zinc-300"><ExternalLink size={16} /></a>
                            </>
                        )}
                    </div>
                    {err('slug')}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Artist" optional>
                        <input className={fieldCls} value={form.artist} onChange={(e) => set({ artist: e.target.value })} placeholder="e.g. Arijit Singh" />
                    </Field>
                    <Field label="Cities on the form" optional={!form.publicApplyEnabled} hint={targetCity && targetCity !== 'Any' ? `Empty uses ${targetCity}.` : 'Separate with commas.'}>
                        <input id="cm-field-citiesText" className={cn(fieldCls, errors.citiesText && 'border-rose-500/60')} value={form.citiesText} onChange={(e) => set({ citiesText: e.target.value })} placeholder="Bangalore, Mysore" />
                        {err('citiesText')}
                    </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Event date" optional>
                        <input type="date" className={fieldCls} value={form.eventDate} onChange={(e) => set({ eventDate: e.target.value })} />
                    </Field>
                    <Field label="Applications close" optional hint="End of this day, India time.">
                        <input id="cm-field-applicationDeadline" type="date" className={cn(fieldCls, errors.applicationDeadline && 'border-rose-500/60')} value={form.applicationDeadline} onChange={(e) => set({ applicationDeadline: e.target.value })} />
                        {err('applicationDeadline')}
                    </Field>
                    <Field label="Post by" optional hint="Fills {deadline_line} in the message.">
                        <input type="date" className={fieldCls} value={form.postingDeadline} onChange={(e) => set({ postingDeadline: e.target.value })} />
                    </Field>
                </div>
                <Field label="Deliverables, in plain words" optional hint="Shown on the form, e.g. 1 reel + 2 stories with the ticket link.">
                    <textarea className={cn(fieldCls, 'min-h-[88px] py-2.5')} value={form.deliverablesText} onChange={(e) => set({ deliverablesText: e.target.value })} rows={3} />
                </Field>
                <div id="cm-field-perksByTier" className="space-y-2">
                    <p className="text-[12px] font-bold text-gray-500">Perks by tier</p>
                    {TIERS.map(t => (
                        <div key={t} className="grid grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[80px_140px_120px_minmax(0,1fr)]">
                            <span className="text-[13px] font-bold capitalize">{t}</span>
                            <input className={fieldCls} type="number" min="0" inputMode="numeric" aria-label={`${t} from followers`} value={form.perksByTier[t].minFollowers} onChange={(e) => setPerk(t, 'minFollowers', e.target.value)} placeholder={`From ${DEFAULT_TIER_MIN[t].toLocaleString('en-IN')}`} />
                            <input className={fieldCls} type="number" min="0" inputMode="numeric" aria-label={`${t} cash ₹`} value={form.perksByTier[t].cash} onChange={(e) => setPerk(t, 'cash', e.target.value)} placeholder="₹ cash" />
                            <input className={cn(fieldCls, 'col-span-3 sm:col-span-1')} aria-label={`${t} pass`} value={form.perksByTier[t].pass} onChange={(e) => setPerk(t, 'pass', e.target.value)} placeholder="Pass, e.g. 2 GA passes" />
                        </div>
                    ))}
                    {err('perksByTier')}
                </div>
            </div>
        </BuilderCard>
    );
};

export default OpenFormCard;
