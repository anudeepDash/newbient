import React, { useMemo } from 'react';
import Sheet from '../Sheet';
import { Button } from '../ui';
import RichEditor from '../RichEditor';
import ClauseMarketplace from '../ClauseMarketplace';
import { Field, SignatureField, Toggle, fieldCls } from '../uploads/UploadKit';
import { SheetSection, TextArea, TextInput } from './EditFields';
import ThemedSelect from '../ThemedSelect';

/*
 * Edit the generated contract by hand: parties, scope, money, clauses (with
 * the clause library) and signing. Edits show in the preview as you type.
 */

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];
const TYPES = ['Service Agreement', 'Artist Agreement', 'Influencer Agreement', 'Event Agreement', 'Non-Disclosure Agreement', 'Memorandum of Understanding', 'Freelancer Agreement', 'Licensing Agreement'];

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// The AI writes plain text; the editor works in HTML paragraphs.
const asHtml = (text) => {
    const t = String(text || '');
    if (!t.trim() || /<\/?[a-z][\s\S]*>/i.test(t)) return t;
    return t.split(/\n+/).map(p => p.trim()).filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join('');
};

const ContractEditSheet = ({ open, onClose, contract, onRefine }) => {
    const { formData: doc, updateField, setFormData, toggleClause, updateClause, removeClause, addCustomClause } = contract;
    const purposeHtml = useMemo(() => asHtml(doc?.details?.purpose), [open]); // eslint-disable-line react-hooks/exhaustive-deps
    if (!doc) return null;
    const set = (path) => (v) => updateField(path, v);
    const first = doc.parties?.firstParty || {};
    const second = doc.parties?.secondParty || {};

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Edit contract"
            subtitle="Changes show in the preview straight away."
            size="lg"
            footer={<Button variant="accent" className="h-11 w-full" onClick={onClose}>Done</Button>}
        >
            <div className="space-y-6">
                <SheetSection title="Basics">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Contract number"><TextInput value={doc.agreementNumber} onChange={set('agreementNumber')} /></Field>
                        <Field label="Type">
                            <TextInput list="ai-contract-types" value={doc.template} onChange={(v) => setFormData(prev => ({ ...prev, template: v, type: v }))} />
                            <datalist id="ai-contract-types">{TYPES.map(t => <option key={t} value={t} />)}</datalist>
                        </Field>
                        <Field label="Effective date"><TextInput type="date" value={doc.effectiveDate} onChange={set('effectiveDate')} /></Field>
                        <Field label="Strictness of library clauses" hint="Used when you add a clause from the library.">
                            <ThemedSelect value={doc.risk || 'Medium'} onChange={(e) => updateField('risk', e.target.value)} className={fieldCls}>
                                <option value="Low">Relaxed</option>
                                <option value="Medium">Balanced</option>
                                <option value="High">Strict</option>
                            </ThemedSelect>
                        </Field>
                    </div>
                </SheetSection>

                <SheetSection title="Client" hint="The other party.">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Name"><TextInput value={second.name} onChange={set('parties.secondParty.name')} placeholder="Company or person" /></Field>
                        <Field label="Role"><TextInput value={second.role} onChange={set('parties.secondParty.role')} placeholder="Client" /></Field>
                        <Field label="Email" optional><TextInput type="email" inputMode="email" value={second.email} onChange={set('parties.secondParty.email')} /></Field>
                    </div>
                    <Field label="Address" optional><TextArea rows={2} value={second.address} onChange={set('parties.secondParty.address')} /></Field>
                </SheetSection>

                <SheetSection title="Newbi" hint="Our side of the contract.">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Name"><TextInput value={first.name} onChange={set('parties.firstParty.name')} /></Field>
                        <Field label="Role"><TextInput value={first.role} onChange={set('parties.firstParty.role')} /></Field>
                        <Field label="Email" optional><TextInput type="email" inputMode="email" value={first.email} onChange={set('parties.firstParty.email')} /></Field>
                    </div>
                    <Field label="Address" optional><TextArea rows={2} value={first.address} onChange={set('parties.firstParty.address')} /></Field>
                </SheetSection>

                <SheetSection title="Scope">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Project name" className="sm:col-span-2"><TextInput value={doc.details?.projectName} onChange={set('details.projectName')} /></Field>
                        <Field label="Duration"><TextInput value={doc.details?.duration} onChange={set('details.duration')} placeholder="e.g. 12 months" /></Field>
                        <Field label="Territory"><TextInput value={doc.details?.territory} onChange={set('details.territory')} placeholder="India" /></Field>
                    </div>
                    <div>
                        <p className="mb-1 text-[12px] font-bold text-gray-500">Purpose</p>
                        <RichEditor key={open ? 'open' : 'closed'} label="Purpose" value={purposeHtml} onChange={set('details.purpose')} minHeight={160} placeholder="What this contract covers" />
                    </div>
                </SheetSection>

                <SheetSection title="Money">
                    <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                        <Field label="Total value">
                            <TextInput type="number" inputMode="decimal" min="0" value={doc.commercials?.totalValue} onChange={set('commercials.totalValue')} placeholder="0" />
                        </Field>
                        <Field label="Currency">
                            <ThemedSelect value={doc.commercials?.currency || 'INR'} onChange={(e) => updateField('commercials.currency', e.target.value)} className={fieldCls}>
                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </ThemedSelect>
                        </Field>
                    </div>
                    <Field label="Payment schedule"><TextArea rows={3} value={doc.commercials?.paymentSchedule} onChange={set('commercials.paymentSchedule')} placeholder="e.g. 50% on signing, 50% on delivery" /></Field>
                    <Toggle label="GST included in the value" checked={doc.commercials?.gstIncluded !== false} onChange={(v) => updateField('commercials.gstIncluded', v)} />
                </SheetSection>

                <SheetSection title="Clauses" hint="Reorder, open a clause to change its wording, or add more from the library.">
                    <ClauseMarketplace
                        activeClauses={doc.clauses || []}
                        onToggleClause={toggleClause}
                        onUpdateClause={updateClause}
                        onRemoveClause={removeClause}
                        onAddCustom={addCustomClause}
                        onRefineClick={onRefine ? (_path, title) => onRefine(title) : undefined}
                    />
                </SheetSection>

                <SheetSection title="Signing">
                    <Toggle label="Show signature block" checked={Boolean(doc.showSignatures)} onChange={(v) => updateField('showSignatures', v)} />
                    <Toggle label="Show company seal" checked={Boolean(doc.showSeal)} onChange={(v) => updateField('showSeal', v)} />
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Signed by"><TextInput value={doc.providerName} onChange={set('providerName')} /></Field>
                        <Field label="Designation"><TextInput value={doc.providerDesignation} onChange={set('providerDesignation')} /></Field>
                    </div>
                    <SignatureField
                        value={doc.providerSignature}
                        onChange={(v) => setFormData(prev => ({ ...prev, providerSignature: v, showSignatures: v ? true : prev.showSignatures }))}
                        hint="The client signs on the link you share."
                    />
                </SheetSection>
            </div>
        </Sheet>
    );
};

export default ContractEditSheet;
