import React from 'react';
import Sheet from '../Sheet';
import { Button } from '../ui';
import { Field, fieldCls } from '../uploads/UploadKit';
import { CommaInput, LinesArea, RowList, SheetSection, TextArea, TextInput } from './EditFields';
import { LOGOS } from './DocumentPreview';
import { syncProposalSections } from './studioDocuments';
import ThemedSelect from '../ThemedSelect';

/*
 * Edit the generated proposal by hand. Changes apply to the preview as you
 * type; deeper layout work (custom pages, attachments, signatures) happens in
 * the full proposal editor after saving.
 */

const pad2 = (n) => String(n).padStart(2, '0');
const renumber = (rows) => rows.map((r, i) => ({ ...r, id: pad2(i + 1) }));

const ProposalEditSheet = ({ open, onClose, doc, onChange }) => {
    if (!doc) return null;
    const set = (patch) => onChange(syncProposalSections({ ...doc, ...patch }));

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Edit proposal"
            subtitle="Changes show in the preview straight away."
            size="lg"
            footer={<Button variant="accent" className="h-11 w-full" onClick={onClose}>Done</Button>}
        >
            <div className="space-y-6">
                <SheetSection title="Cover" hint="Who it's for and what it's about.">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Client name"><TextInput value={doc.clientName} onChange={v => set({ clientName: v })} placeholder="e.g. Sunrise Studios" /></Field>
                        <Field label="In association with" optional><TextInput value={doc.clientSubtitle} onChange={v => set({ clientSubtitle: v })} /></Field>
                        <Field label="Campaign or project"><TextInput value={doc.campaignName} onChange={v => set({ campaignName: v })} /></Field>
                        <Field label="Campaign subtitle" optional><TextInput value={doc.campaignSubtitle} onChange={v => set({ campaignSubtitle: v })} /></Field>
                        <Field label="Duration" optional><TextInput value={doc.campaignDuration} onChange={v => set({ campaignDuration: v })} placeholder="e.g. Oct 2026 – Mar 2027" /></Field>
                        <Field label="Proposal number" optional hint="Leave empty to get the next NBQ number when you save.">
                            <TextInput value={doc.proposalNumber} onChange={v => set({ proposalNumber: v })} placeholder="Automatic" />
                        </Field>
                        <Field label="Logo">
                            <ThemedSelect value={doc.selectedLogo || 'entertainment'} onChange={e => set({ selectedLogo: e.target.value })} className={fieldCls}>
                                {LOGOS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                            </ThemedSelect>
                        </Field>
                        <Field label="Deal value (₹)" optional hint="Used for totals in the proposals list.">
                            <TextInput type="number" inputMode="decimal" min="0" value={doc.dealValue ?? ''} onChange={v => set({ dealValue: v === '' ? '' : Number(v) })} placeholder="0" />
                        </Field>
                    </div>
                    <Field label="Client address" optional><TextArea rows={2} value={doc.clientAddress} onChange={v => set({ clientAddress: v })} /></Field>
                    <Field label="Introduction"><TextArea rows={4} value={doc.introParagraph} onChange={v => set({ introParagraph: v })} /></Field>
                    <Field label="Prepared-for note" optional><TextArea rows={3} value={doc.preparedForText} onChange={v => set({ preparedForText: v })} /></Field>
                </SheetSection>

                <SheetSection title="Summary" hint="The executive summary page.">
                    <Field label="Summary paragraphs" hint="Leave a blank line between paragraphs.">
                        <LinesArea paragraphs rows={7} value={doc.executiveParagraphs} onChange={v => set({ executiveParagraphs: v })} />
                    </Field>
                    <Field label="Main objective" optional><TextArea rows={3} value={doc.primaryObjectiveText} onChange={v => set({ primaryObjectiveText: v })} /></Field>
                    <Field label="Key markets" optional hint="Separate with commas.">
                        <CommaInput value={doc.anchorMarkets} onChange={v => set({ anchorMarkets: v })} placeholder="Bengaluru, Pune, Mumbai" />
                    </Field>
                    <Field label="Markets caption" optional><TextInput value={doc.anchorMarketsCaption} onChange={v => set({ anchorMarketsCaption: v })} /></Field>
                    <Field label="Why this approach" optional><TextArea rows={4} value={doc.whyThisApproachText} onChange={v => set({ whyThisApproachText: v })} /></Field>
                </SheetSection>

                <SheetSection title="Plan" hint="How the work gets done, step by step.">
                    <RowList
                        items={doc.blueprintSteps}
                        itemLabel="step"
                        addLabel="Add a step"
                        emptyText="No steps yet. The plan pages are hidden until you add one."
                        makeItem={(n) => ({ stepNumber: n + 1, title: '', bullets: [] })}
                        onChange={rows => set({ blueprintSteps: rows.map((r, i) => ({ ...r, stepNumber: i + 1 })) })}
                        renderItem={(row, patch) => (
                            <div className="space-y-2">
                                <TextInput value={row.title} onChange={v => patch({ title: v })} placeholder="Step title" aria-label="Step title" />
                                <LinesArea rows={3} value={row.bullets} onChange={v => patch({ bullets: v })} placeholder="One point per line" aria-label="Step points" />
                            </div>
                        )}
                    />
                </SheetSection>

                <SheetSection title="Deliverables" hint="What the client gets.">
                    <RowList
                        items={doc.deliverablesTable}
                        itemLabel="deliverable"
                        addLabel="Add a deliverable"
                        emptyText="No deliverables yet."
                        makeItem={(n) => ({ id: pad2(n + 1), deliverable: '', qty: '', timeline: '' })}
                        onChange={rows => set({ deliverablesTable: renumber(rows) })}
                        renderItem={(row, patch) => (
                            <div className="grid gap-2 sm:grid-cols-[1fr_8rem_8rem]">
                                <TextInput value={row.deliverable} onChange={v => patch({ deliverable: v })} placeholder="Deliverable" aria-label="Deliverable" />
                                <TextInput value={row.qty} onChange={v => patch({ qty: v })} placeholder="Qty" aria-label="Quantity" />
                                <TextInput value={row.timeline} onChange={v => patch({ timeline: v })} placeholder="Timeline" aria-label="Timeline" />
                            </div>
                        )}
                    />
                </SheetSection>

                <SheetSection title="Pricing" hint="Packages and prices, written as they should appear.">
                    <Field label="Pricing intro" optional><TextArea rows={2} value={doc.commercialsSubtitle} onChange={v => set({ commercialsSubtitle: v })} /></Field>
                    <RowList
                        items={doc.pricingTable}
                        itemLabel="price line"
                        addLabel="Add a price line"
                        emptyText="No price lines yet."
                        makeItem={(n) => ({ id: pad2(n + 1), deliverable: '', description: '', qtyPrice: '', timeline: '—' })}
                        onChange={rows => set({ pricingTable: renumber(rows) })}
                        renderItem={(row, patch) => (
                            <div className="space-y-2">
                                <div className="grid gap-2 sm:grid-cols-[1fr_11rem]">
                                    <TextInput value={row.deliverable} onChange={v => patch({ deliverable: v })} placeholder="Package" aria-label="Package" />
                                    <TextInput value={row.qtyPrice} onChange={v => patch({ qtyPrice: v })} placeholder="₹75,000 / city" aria-label="Price" />
                                </div>
                                <TextInput value={row.description} onChange={v => patch({ description: v })} placeholder="What's covered" aria-label="What's covered" />
                                <TextInput value={row.timeline} onChange={v => patch({ timeline: v })} placeholder="Timeline" aria-label="Timeline" />
                            </div>
                        )}
                    />
                    <Field label="What's included" optional><TextArea rows={3} value={doc.whatsIncludedText} onChange={v => set({ whatsIncludedText: v })} /></Field>
                    <Field label="Payment terms" optional><TextArea rows={3} value={doc.paymentScalingText} onChange={v => set({ paymentScalingText: v })} /></Field>
                </SheetSection>

                <SheetSection title="Primary market" hint="Optional deep-dive page for the main city or market.">
                    <Field label="Page title" optional><TextInput value={doc.deepDiveTitle} onChange={v => set({ deepDiveTitle: v })} /></Field>
                    <Field label="Introduction" optional><TextArea rows={3} value={doc.deepDiveIntro} onChange={v => set({ deepDiveIntro: v })} /></Field>
                    <RowList
                        items={doc.deepDiveSubsections}
                        itemLabel="part"
                        addLabel="Add a part"
                        emptyText="Nothing here, so this page is hidden."
                        makeItem={(n) => ({ badge: `5.${n + 1}`, title: '', bullets: [] })}
                        onChange={rows => set({ deepDiveSubsections: rows.map((r, i) => ({ ...r, badge: `5.${i + 1}` })) })}
                        renderItem={(row, patch) => (
                            <div className="space-y-2">
                                <TextInput value={row.title} onChange={v => patch({ title: v })} placeholder="Title" aria-label="Part title" />
                                <LinesArea rows={3} value={row.bullets} onChange={v => patch({ bullets: v })} placeholder="One point per line" aria-label="Part points" />
                            </div>
                        )}
                    />
                </SheetSection>

                <SheetSection title="Closing">
                    <Field label="Next steps"><TextArea rows={4} value={doc.closingText} onChange={v => set({ closingText: v })} /></Field>
                </SheetSection>
            </div>
        </Sheet>
    );
};

export default ProposalEditSheet;
