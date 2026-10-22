import React, { useState } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { cn } from '../../lib/utils';
import { useAccent } from './theme';
import { BuilderCard } from './events/EditorParts';
import { Toggle, fieldCls } from './uploads/UploadKit';
import {
    TextInput, TextArea, MoneyInput, ListCard, RowActions, AddButton, OptionalBlock, Chips, moveItem,
} from './proposals/builder/parts';
import { rupees } from './proposals/builder/model';
import BlocksEditor from './proposals/builder/BlocksEditor';

/*
 * Editors for each part of the 8-page proposal (the "v2" paper). Field names
 * match what the paper prints (components/ui/ProposalDocumentRenderer).
 *
 * Every editor takes { formData, setFormData, onRefine }. setFormData accepts
 * an updater function. onRefine({ label, value, apply }) opens the AI helper.
 */

const pad2 = (n) => String(n).padStart(2, '0');

const useSetters = (setFormData) => ({
    set: (patch) => setFormData(prev => ({ ...prev, ...patch })),
    setList: (key, fn) => setFormData(prev => ({ ...prev, [key]: fn(Array.isArray(prev[key]) ? prev[key] : []) })),
});

const PageToggle = ({ checked, onChange, label = 'Show this page' }) => (
    <div className="mb-4 rounded-xl bg-black/[0.025] px-3 py-2 dark:bg-white/[0.03]">
        <Toggle label={label} checked={checked} onChange={onChange} />
    </div>
);

/** Kept for older imports: a labelled on/off switch. */
export function ToggleSwitch({ label, checked, onChange, description }) {
    return <Toggle label={label} hint={description} checked={Boolean(checked)} onChange={onChange} />;
}

const KickerTitle = ({ formData, set, kickerKey, titleKey, kickerPlaceholder, titlePlaceholder }) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextInput label="Small heading" value={formData[kickerKey]} onChange={v => set({ [kickerKey]: v })} placeholder={kickerPlaceholder} />
        <TextInput label="Page title" value={formData[titleKey]} onChange={v => set({ [titleKey]: v })} placeholder={titlePlaceholder} />
    </div>
);

/** A titled callout box on the page (Primary objective, What's included…). */
const Callout = ({ formData, set, showKey, titleKey, textKey, label, hint, titlePlaceholder, textPlaceholder, onRefine }) => {
    const on = formData[showKey] !== false;
    return (
        <OptionalBlock on={on}>
            <Toggle label={label} hint={hint} checked={on} onChange={v => set({ [showKey]: v })} />
            {on && (
                <>
                    {titleKey && <TextInput label="Box title" value={formData[titleKey]} onChange={v => set({ [titleKey]: v })} placeholder={titlePlaceholder} />}
                    <TextArea
                        label="Box text"
                        rows={3}
                        value={formData[textKey]}
                        onChange={v => set({ [textKey]: v })}
                        placeholder={textPlaceholder}
                        onRefine={onRefine ? () => onRefine({ label, value: formData[textKey], apply: (t) => set({ [textKey]: t }) }) : undefined}
                    />
                </>
            )}
        </OptionalBlock>
    );
};

// ── Cover page ───────────────────────────────────────────────────────────────
export function V2CoverEditor({ formData, setFormData, onRefine }) {
    const { set, setList } = useSetters(setFormData);
    const cards = formData.whatsInside || [];
    return (
        <div className="space-y-5">
            <BuilderCard title="Campaign" hint="The project this proposal is for">
                <PageToggle label="Show the cover page" checked={formData.showCover !== false} onChange={v => set({ showCover: v })} />
                <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <TextInput label="Campaign or project name" value={formData.campaignName} onChange={v => set({ campaignName: v })} placeholder="e.g. Revolution India Tour" />
                        <TextInput label="Subtitle" optional value={formData.campaignSubtitle} onChange={v => set({ campaignSubtitle: v })} placeholder="e.g. India Tour 2026–27" />
                    </div>
                    <Toggle label="Show the duration badge" checked={formData.showDuration !== false} onChange={v => set({ showDuration: v })} />
                    {formData.showDuration !== false && (
                        <TextInput label="Duration" value={formData.campaignDuration} onChange={v => set({ campaignDuration: v })} placeholder="e.g. Oct '26 – Mar '27" />
                    )}
                </div>
            </BuilderCard>

            <BuilderCard title="Cover text" hint="What the client reads first">
                <div className="space-y-3">
                    <OptionalBlock on={formData.showCoverPill !== false}>
                        <Toggle label="Label at the top of the cover" checked={formData.showCoverPill !== false} onChange={v => set({ showCoverPill: v })} />
                        {formData.showCoverPill !== false && (
                            <TextInput aria-label="Cover label" value={formData.coverPillText} onChange={v => set({ coverPillText: v })} placeholder="OFFICIAL STRATEGIC PROPOSAL" />
                        )}
                    </OptionalBlock>
                    <TextArea
                        label="Introduction"
                        rows={5}
                        value={formData.introParagraph}
                        onChange={v => set({ introParagraph: v })}
                        placeholder="Newbi Entertainment & Marketing LLP is pleased to present…"
                        onRefine={() => onRefine?.({ label: 'Introduction', value: formData.introParagraph, apply: (t) => set({ introParagraph: t }) })}
                        hint="Use **double stars** for bold."
                    />
                </div>
            </BuilderCard>

            <BuilderCard title="What's inside" hint="The numbered contents cards on the cover">
                <Toggle label="Show the contents cards" checked={formData.showWhatsInside !== false} onChange={v => set({ showWhatsInside: v })} />
                {formData.showWhatsInside !== false && (
                    <div className="mt-3 space-y-2">
                        {cards.map((card, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <input aria-label={`Card ${idx + 1} number`} className={cn(fieldCls, 'w-16 shrink-0 px-2 text-center tabular-nums')} value={card.num || ''} onChange={e => setList('whatsInside', l => l.map((c, i) => (i === idx ? { ...c, num: e.target.value } : c)))} placeholder={pad2(idx + 1)} />
                                <input aria-label={`Card ${idx + 1} title`} className={cn(fieldCls, 'min-w-0 flex-1')} value={card.title || ''} onChange={e => setList('whatsInside', l => l.map((c, i) => (i === idx ? { ...c, title: e.target.value } : c)))} placeholder="Section title" />
                                <RowActions index={idx} count={cards.length} onRemove={(i) => setList('whatsInside', l => l.filter((_, j) => j !== i))} />
                            </div>
                        ))}
                        <AddButton onClick={() => setList('whatsInside', l => [...l, { num: pad2(l.length + 1), title: '' }])}>Add a card</AddButton>
                    </div>
                )}
            </BuilderCard>

            <BuilderCard title="Prepared for" hint="A short note on who the proposal is for">
                <Callout
                    formData={formData} set={set} onRefine={onRefine}
                    showKey="showPreparedFor" textKey="preparedForText"
                    label="Show the prepared-for box"
                    hint="Leave the text empty to use a standard line with the client's name"
                    textPlaceholder="This quotation has been prepared exclusively for…"
                />
            </BuilderCard>
        </div>
    );
}

// ── Executive summary ────────────────────────────────────────────────────────
export function V2StrategyEditor({ formData, setFormData, onRefine }) {
    const { set, setList } = useSetters(setFormData);
    const paragraphs = formData.executiveParagraphs || [];
    const markets = formData.anchorMarkets || [];
    const [market, setMarket] = useState('');
    const a = useAccent();

    const addMarket = () => {
        const names = market.split(',').map(s => s.trim()).filter(Boolean);
        if (!names.length) return;
        setList('anchorMarkets', l => [...l, ...names.filter(n => !l.some(m => m.toLowerCase() === n.toLowerCase()))]);
        setMarket('');
    };

    return (
        <div className="space-y-5">
            <BuilderCard title="Executive summary">
                <PageToggle checked={formData.showExecutiveSummary !== false} onChange={v => set({ showExecutiveSummary: v })} />
                <div className="space-y-3">
                    <KickerTitle formData={formData} set={set} kickerKey="strategySub" titleKey="strategyTitle" kickerPlaceholder="STRATEGIC OUTLINE" titlePlaceholder="Executive Summary" />
                    {paragraphs.map((para, idx) => (
                        <ListCard key={idx} badge={idx + 1} title="Paragraph" actions={<RowActions index={idx} count={paragraphs.length} onMove={(i, d) => setList('executiveParagraphs', l => moveItem(l, i, d))} onRemove={paragraphs.length > 1 ? (i) => setList('executiveParagraphs', l => l.filter((_, j) => j !== i)) : undefined} />}>
                            <TextArea
                                aria-label={`Paragraph ${idx + 1}`}
                                rows={4}
                                value={para}
                                onChange={v => setList('executiveParagraphs', l => l.map((p, i) => (i === idx ? v : p)))}
                                onRefine={() => onRefine?.({ label: `Summary paragraph ${idx + 1}`, value: para, apply: (t) => setList('executiveParagraphs', l => l.map((p, i) => (i === idx ? t : p))) })}
                            />
                        </ListCard>
                    ))}
                    <AddButton onClick={() => setList('executiveParagraphs', l => [...l, ''])}>Add a paragraph</AddButton>
                </div>
            </BuilderCard>

            <BuilderCard title="Objective and approach">
                <div className="space-y-3">
                    <Callout formData={formData} set={set} onRefine={onRefine} showKey="showPrimaryObjective" titleKey="primaryObjectiveTitle" textKey="primaryObjectiveText" label="Primary objective box" titlePlaceholder="PRIMARY OBJECTIVE" textPlaceholder="To build a local fan and audience base…" />
                    <Callout formData={formData} set={set} onRefine={onRefine} showKey="showWhyThisApproach" titleKey="whyThisApproachTitle" textKey="whyThisApproachText" label="Why this approach box" titlePlaceholder="WHY THIS APPROACH" textPlaceholder="Why this plan will work…" />
                </div>
            </BuilderCard>

            <BuilderCard title="Key markets" hint="Cities or markets shown as a grid">
                <OptionalBlock on={formData.showAnchorMarkets !== false}>
                    <Toggle label="Show key markets" checked={formData.showAnchorMarkets !== false} onChange={v => set({ showAnchorMarkets: v })} />
                    {formData.showAnchorMarkets !== false && (
                        <>
                            <TextInput label="Box title" value={formData.anchorMarketsTitle} onChange={v => set({ anchorMarketsTitle: v })} placeholder="KEY ANCHOR MARKETS" />
                            <div className="flex flex-wrap gap-1.5">
                                {markets.map((m, idx) => (
                                    <span key={`${m}-${idx}`} className={cn('inline-flex h-9 items-center gap-1 rounded-full pl-3 pr-1 text-[13px] font-semibold', a.chip)}>
                                        {m}
                                        <button type="button" aria-label={`Remove ${m}`} onClick={() => setList('anchorMarkets', l => l.filter((_, i) => i !== idx))} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"><X size={13} /></button>
                                    </span>
                                ))}
                                {!markets.length && <span className="text-[13px] text-gray-500">No markets yet.</span>}
                            </div>
                            <div className="flex gap-2">
                                <input aria-label="Add a market" className={cn(fieldCls, 'min-w-0 flex-1')} value={market} onChange={e => setMarket(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMarket(); } }} placeholder="Type a city, then Add" enterKeyHint="done" />
                                <button type="button" onClick={addMarket} disabled={!market.trim()} className="flex h-12 shrink-0 items-center gap-1 rounded-xl border border-black/10 px-4 text-[13px] font-bold disabled:opacity-40 dark:border-white/10"><Plus size={14} /> Add</button>
                            </div>
                            <TextInput label="Caption" optional value={formData.anchorMarketsCaption} onChange={v => set({ anchorMarketsCaption: v })} placeholder="These markets anchor the campaign…" />
                        </>
                    )}
                </OptionalBlock>
            </BuilderCard>

            <BuilderCard title="More on this page" hint="Campaign phases, another box or a table, after the summary">
                <BlocksEditor blocks={formData.executiveBlocks} onChange={(next) => set({ executiveBlocks: next })} />
            </BuilderCard>
        </div>
    );
}

// ── Execution plan (timeline) ────────────────────────────────────────────────
export function V2BlueprintEditor({ formData, setFormData, onRefine }) {
    const { set, setList } = useSetters(setFormData);
    const steps = formData.blueprintSteps || [];
    const updateStep = (idx, patch) => setList('blueprintSteps', l => l.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
    const updateBullets = (idx, fn) => setList('blueprintSteps', l => l.map((s, i) => (i === idx ? { ...s, bullets: fn(Array.isArray(s.bullets) ? s.bullets : []) } : s)));
    // Steps are numbered by position, so reordering keeps 1, 2, 3…
    const renumber = (list) => list.map((s, i) => ({ ...s, stepNumber: i + 1, number: pad2(i + 1) }));

    return (
        <BuilderCard title="How we'll execute" hint="Phases and actions, in order. Steps 1–3 go on one page, the rest on the next.">
            <PageToggle label="Show the execution plan" checked={formData.showBlueprint !== false} onChange={v => set({ showBlueprint: v })} />
            {formData.showBlueprint !== false && (
                <div className="space-y-3">
                    <KickerTitle formData={formData} set={set} kickerKey="blueprintSub" titleKey="blueprintTitle" kickerPlaceholder="HOW WE'LL EXECUTE" titlePlaceholder="Process & Execution Blueprint" />
                    {steps.map((step, idx) => {
                        const bullets = Array.isArray(step.bullets) ? step.bullets : [];
                        return (
                            <ListCard
                                key={idx}
                                badge={step.stepNumber || idx + 1}
                                title={`Step ${idx + 1}`}
                                actions={<RowActions index={idx} count={steps.length} onMove={(i, d) => setList('blueprintSteps', l => renumber(moveItem(l, i, d)))} onRemove={(i) => setList('blueprintSteps', l => renumber(l.filter((_, j) => j !== i)))} removeLabel="Remove step" />}
                            >
                                <TextInput label="Step title" value={step.title} onChange={v => updateStep(idx, { title: v })} placeholder="e.g. Campus and youth outreach" />
                                <div className="space-y-2">
                                    <span className="block text-[12px] font-bold text-gray-500">Actions</span>
                                    {bullets.map((b, bIdx) => (
                                        <div key={bIdx} className="flex items-start gap-1">
                                            <textarea
                                                aria-label={`Step ${idx + 1} action ${bIdx + 1}`}
                                                rows={2}
                                                className="min-h-12 w-full min-w-0 flex-1 resize-y rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[14px] font-medium leading-snug text-gray-900 outline-none focus:border-neon-green/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                                                value={b}
                                                onChange={e => updateBullets(idx, l => l.map((x, i) => (i === bIdx ? e.target.value : x)))}
                                                placeholder="What happens in this step"
                                            />
                                            <RowActions index={bIdx} count={bullets.length} onRemove={(i) => updateBullets(idx, l => l.filter((_, j) => j !== i))} removeLabel="Remove action" />
                                        </div>
                                    ))}
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => updateBullets(idx, l => [...l, ''])} className="flex h-10 items-center gap-1.5 rounded-xl border border-black/10 px-3 text-[12px] font-bold dark:border-white/10"><Plus size={14} /> Add action</button>
                                        {onRefine && (
                                            <button type="button" onClick={() => onRefine({ label: `Step ${idx + 1}: ${step.title || 'actions'}`, value: bullets.join('\n'), apply: (t) => updateBullets(idx, () => String(t).split('\n').map(s => s.replace(/^[-•*\d.\s]+/, '').trim()).filter(Boolean)) })} className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold text-gray-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10">
                                                Improve with AI
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </ListCard>
                        );
                    })}
                    <AddButton onClick={() => setList('blueprintSteps', l => [...l, { stepNumber: l.length + 1, number: pad2(l.length + 1), title: '', bullets: [''] }])}>Add a step</AddButton>
                </div>
            )}
        </BuilderCard>
    );
}

// ── Deliverables ─────────────────────────────────────────────────────────────
export function V2DeliverablesEditor({ formData, setFormData, onRefine }) {
    const { set, setList } = useSetters(setFormData);
    const rows = formData.deliverablesTable || [];
    const update = (idx, patch) => setList('deliverablesTable', l => l.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    const renumber = (list) => list.map((r, i) => ({ ...r, id: pad2(i + 1) }));
    return (
        <div className="space-y-5">
            <BuilderCard title="Deliverables" hint="What the client gets, how many and when">
                <PageToggle label="Show the deliverables page" checked={formData.showDeliverables !== false} onChange={v => set({ showDeliverables: v })} />
                {formData.showDeliverables !== false && (
                    <div className="space-y-3">
                        <KickerTitle formData={formData} set={set} kickerKey="deliverablesSub" titleKey="deliverablesTitle" kickerPlaceholder="SCOPE SUMMARY" titlePlaceholder="Per City Deliverables" />
                        {rows.map((row, idx) => (
                            <ListCard key={idx} badge={row.id || pad2(idx + 1)} actions={<RowActions index={idx} count={rows.length} onMove={(i, d) => setList('deliverablesTable', l => renumber(moveItem(l, i, d)))} onRemove={(i) => setList('deliverablesTable', l => renumber(l.filter((_, j) => j !== i)))} removeLabel="Remove deliverable" />}>
                                <TextInput label="Deliverable" value={row.deliverable ?? row.item} onChange={v => update(idx, { deliverable: v })} placeholder="e.g. Campus creators" />
                                <TextInput label="Detail" optional value={row.description} onChange={v => update(idx, { description: v })} placeholder="e.g. (1 Reel + 3 Stories)" hint="A small grey line under the deliverable." />
                                <div className="grid grid-cols-2 gap-3">
                                    <TextInput label="Qty / unit" value={row.qty} onChange={v => update(idx, { qty: v })} placeholder="e.g. 20–30" />
                                    <TextInput label="Timeline" value={row.timeline} onChange={v => update(idx, { timeline: v })} placeholder="e.g. Week 1–2" />
                                </div>
                            </ListCard>
                        ))}
                        <AddButton onClick={() => setList('deliverablesTable', l => [...l, { id: pad2(l.length + 1), deliverable: '', qty: '', timeline: '' }])}>Add a deliverable</AddButton>
                        <TextInput label="Note under the table" optional value={formData.deliverablesTableNote} onChange={v => set({ deliverablesTableNote: v })} placeholder="Figures are indicative…" />
                    </div>
                )}
            </BuilderCard>
            <BuilderCard title="Market note" hint="A highlighted note about a lead city or market">
                <Callout formData={formData} set={set} onRefine={onRefine} showKey="showCityNote" titleKey="cityNoteTitle" textKey="cityNoteText" label="Show the note" titlePlaceholder="NOTE ON BENGALURU" textPlaceholder="Bengaluru is treated as the primary market…" />
            </BuilderCard>
            <BuilderCard title="More on this page" hint="For example a box of what is still to confirm">
                <BlocksEditor blocks={formData.deliverablesBlocks} onChange={(next) => set({ deliverablesBlocks: next })} />
            </BuilderCard>
        </div>
    );
}

// ── Pricing and payment terms ────────────────────────────────────────────────
export function V2PricingEditor({ formData, setFormData, onRefine, totals }) {
    const { set, setList } = useSetters(setFormData);
    const rows = formData.pricingTable || [];
    const update = (idx, patch) => setList('pricingTable', l => l.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    const renumber = (list) => list.map((r, i) => ({ ...r, id: pad2(i + 1) }));
    return (
        <div className="space-y-5">
            <BuilderCard title="Pricing" hint="Packages or line items as printed on the pricing page">
                <PageToggle label="Show the pricing page" checked={formData.showCommercials !== false} onChange={v => set({ showCommercials: v })} />
                {formData.showCommercials !== false && (
                    <div className="space-y-3">
                        <KickerTitle formData={formData} set={set} kickerKey="commercialsSub" titleKey="commercialsTitle" kickerPlaceholder="COMMERCIALS" titlePlaceholder="04 · Pricing Structure" />
                        <TextArea label="Intro line" optional rows={2} value={formData.commercialsSubtitle} onChange={v => set({ commercialsSubtitle: v })} placeholder="The pricing below covers…" />
                        {rows.map((row, idx) => (
                            <ListCard key={idx} badge={row.id || pad2(idx + 1)} actions={<RowActions index={idx} count={rows.length} onMove={(i, d) => setList('pricingTable', l => renumber(moveItem(l, i, d)))} onRemove={(i) => setList('pricingTable', l => renumber(l.filter((_, j) => j !== i)))} removeLabel="Remove line" />}>
                                <TextInput label="Package or item" value={row.deliverable} onChange={v => update(idx, { deliverable: v })} placeholder="e.g. Digital promotion package" />
                                <TextInput label="What's included" optional value={row.description} onChange={v => update(idx, { description: v })} placeholder="Short description" />
                                <div className="grid grid-cols-2 gap-3">
                                    <TextInput label="Qty / price" value={row.qtyPrice} onChange={v => update(idx, { qtyPrice: v })} placeholder="e.g. ₹75,000 / city" hint="Printed as you type it" />
                                    <TextInput label="Timeline" optional value={row.timeline} onChange={v => update(idx, { timeline: v })} placeholder="—" />
                                </div>
                            </ListCard>
                        ))}
                        <AddButton onClick={() => setList('pricingTable', l => [...l, { id: pad2(l.length + 1), deliverable: '', description: '', qtyPrice: '', timeline: '' }])}>Add a price line</AddButton>
                        <TextInput label="Note under the table" optional value={formData.pricingTableNote} onChange={v => set({ pricingTableNote: v })} placeholder="Pricing is indicative…" />
                    </div>
                )}
            </BuilderCard>

            <BuilderCard title="Deal value and GST" hint="For your pipeline and the invoice. Not printed on the proposal.">
                <div className="space-y-3">
                    <MoneyInput label="Deal value before GST" value={formData.dealValue} onChange={v => set({ dealValue: v })} placeholder="0" hint="Counts in your proposals pipeline." />
                    <Toggle label="Add GST" hint="Used when you turn the proposal into an invoice" checked={Boolean(formData.showGst)} onChange={v => set({ showGst: v })} />
                    {formData.showGst && (
                        <div className="space-y-2">
                            <MoneyInput label="GST rate (%)" prefix="" value={formData.gstRate ?? 18} onChange={v => set({ gstRate: v === '' ? '' : Math.max(0, Math.min(100, v)) })} max="100" />
                            <Chips options={[5, 12, 18, 28].map(r => ({ label: `${r}%`, value: r }))} value={Number(formData.gstRate)} onPick={v => set({ gstRate: v })} />
                        </div>
                    )}
                    {totals && (
                        <div className="rounded-xl bg-black/[0.03] p-3 text-[13px] dark:bg-white/[0.03]">
                            <div className="flex justify-between py-0.5"><span className="text-gray-500">Value</span><span className="font-semibold tabular-nums">{rupees(totals.subtotal)}</span></div>
                            {formData.showGst && <div className="flex justify-between py-0.5"><span className="text-gray-500">GST {totals.gstRate}%</span><span className="font-semibold tabular-nums">{rupees(totals.gstAmount)}</span></div>}
                            <div className="mt-1 flex justify-between border-t border-black/[0.06] pt-1.5 text-[15px] dark:border-white/[0.08]"><span className="font-bold">Total</span><span className="font-extrabold tabular-nums">{rupees(totals.totalAmount)}</span></div>
                        </div>
                    )}
                </div>
            </BuilderCard>

            <BuilderCard title="Inclusions and payment terms">
                <div className="space-y-3">
                    <Callout formData={formData} set={set} onRefine={onRefine} showKey="showWhatsIncluded" titleKey="whatsIncludedTitle" textKey="whatsIncludedText" label="What's included box" titlePlaceholder="WHAT'S INCLUDED" textPlaceholder="The fee covers…" />
                    <Callout formData={formData} set={set} onRefine={onRefine} showKey="showPaymentScaling" titleKey="paymentScalingTitle" textKey="paymentScalingText" label="Payment terms box" hint="Advance, milestones and how cost scales" titlePlaceholder="PAYMENT & SCALING" textPlaceholder="50% advance on signing, balance on delivery…" />
                </div>
            </BuilderCard>
        </div>
    );
}

// ── City deep-dive ───────────────────────────────────────────────────────────
export function V2DeepDiveEditor({ formData, setFormData, onRefine }) {
    const { set, setList } = useSetters(setFormData);
    const subs = formData.deepDiveSubsections || [];
    const update = (idx, patch) => setList('deepDiveSubsections', l => l.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
    const updateBullets = (idx, fn) => setList('deepDiveSubsections', l => l.map((s, i) => (i === idx ? { ...s, bullets: fn(Array.isArray(s.bullets) ? s.bullets : []) } : s)));
    return (
        <BuilderCard title="City deep-dive" hint="A page on the lead market and how we'll manage it">
            <PageToggle checked={formData.showDeepDive !== false} onChange={v => set({ showDeepDive: v })} />
            {formData.showDeepDive !== false && (
                <div className="space-y-3">
                    <KickerTitle formData={formData} set={set} kickerKey="deepDiveSub" titleKey="deepDiveTitle" kickerPlaceholder="CITY DEEP-DIVE · BENGALURU" titlePlaceholder="05 · Bengaluru Management" />
                    <TextArea label="Introduction" rows={3} value={formData.deepDiveIntro} onChange={v => set({ deepDiveIntro: v })} onRefine={() => onRefine?.({ label: 'Deep-dive introduction', value: formData.deepDiveIntro, apply: (t) => set({ deepDiveIntro: t }) })} />
                    {subs.map((sub, idx) => {
                        const bullets = Array.isArray(sub.bullets) ? sub.bullets : [];
                        return (
                            <ListCard key={idx} badge={sub.badge || `${idx + 1}`} actions={<RowActions index={idx} count={subs.length} onMove={(i, d) => setList('deepDiveSubsections', l => moveItem(l, i, d))} onRemove={(i) => setList('deepDiveSubsections', l => l.filter((_, j) => j !== i))} removeLabel="Remove part" />}>
                                <div className="grid grid-cols-[88px_1fr] gap-3">
                                    <TextInput label="Badge" value={sub.badge} onChange={v => update(idx, { badge: v })} placeholder="5.1" />
                                    <TextInput label="Title" value={sub.title} onChange={v => update(idx, { title: v })} placeholder="Direct management" />
                                </div>
                                <div className="space-y-2">
                                    <span className="block text-[12px] font-bold text-gray-500">Points</span>
                                    {bullets.map((b, bIdx) => (
                                        <div key={bIdx} className="flex items-start gap-1">
                                            <textarea aria-label={`Point ${bIdx + 1}`} rows={2} className="min-h-12 w-full min-w-0 flex-1 resize-y rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[14px] font-medium leading-snug outline-none focus:border-neon-green/60 dark:border-white/10 dark:bg-white/[0.04]" value={b} onChange={e => updateBullets(idx, l => l.map((x, i) => (i === bIdx ? e.target.value : x)))} />
                                            <RowActions index={bIdx} count={bullets.length} onRemove={(i) => updateBullets(idx, l => l.filter((_, j) => j !== i))} removeLabel="Remove point" />
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => updateBullets(idx, l => [...l, ''])} className="flex h-10 items-center gap-1.5 rounded-xl border border-black/10 px-3 text-[12px] font-bold dark:border-white/10"><Plus size={14} /> Add point</button>
                                </div>
                            </ListCard>
                        );
                    })}
                    <AddButton onClick={() => setList('deepDiveSubsections', l => [...l, { badge: `5.${l.length + 1}`, title: '', bullets: [''] }])}>Add a part</AddButton>
                </div>
            )}
        </BuilderCard>
    );
}

// ── Closing page ─────────────────────────────────────────────────────────────
export function V2ClosingEditor({ formData, setFormData, onRefine }) {
    const { set } = useSetters(setFormData);
    return (
        <BuilderCard title="Closing page" hint="Next steps and who prepared the proposal">
            <PageToggle checked={formData.showClosing !== false} onChange={v => set({ showClosing: v })} />
            {formData.showClosing !== false && (
                <div className="space-y-3">
                    <KickerTitle formData={formData} set={set} kickerKey="closingSub" titleKey="closingTitle" kickerPlaceholder="CLOSING" titlePlaceholder="06 · Next Steps" />
                    <TextArea label="Closing note" rows={4} value={formData.closingText} onChange={v => set({ closingText: v })} placeholder="We'd welcome the opportunity to walk you through…" onRefine={() => onRefine?.({ label: 'Closing note', value: formData.closingText, apply: (t) => set({ closingText: t }) })} />
                    <TextInput label="Prepared by" value={formData.preparedBy} onChange={v => set({ preparedBy: v })} placeholder="Newbi Entertainment & Marketing LLP" />
                </div>
            )}
        </BuilderCard>
    );
}
