import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Merge from 'lucide-react/dist/esm/icons/merge';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Check from 'lucide-react/dist/esm/icons/check';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Sheet from '../Sheet';
import ConfirmDialog from './ConfirmDialog';
import { Avatar, Badge, Button } from '../ui';
import { accent } from '../theme';
import { Field, Section, Toggle, fieldCls, areaCls } from '../uploads/UploadKit';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import { inr } from '../ticketing/format';
import {
    PAYEE_TYPES, payeeType, destinationFor, findDuplicatePayees, spendsForPayee, isSpendPaid, isSpendPending,
    amountOf, spendDay, formatDay, SPEND_TYPES, spendType,
} from './money';
import ThemedSelect from '../ThemedSelect';

const toast = (msg, type = 'success') => useStore.getState().addToast?.(msg, type);

export const copyText = async (text, label = 'Details') => {
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        toast(`${label} copied.`);
    } catch {
        toast("Couldn't copy. Please copy it by hand.", 'error');
    }
};

/** Read UPI / bank parts back out of a saved payee (old records only have destinationDetails). */
export const payeeAccount = (p) => {
    const dest = p?.destinationDetails || '';
    const part = (re) => (re.exec(dest)?.[1] || '').trim();
    return {
        upiId: p?.upiId || part(/UPI:\s*([^|]+)/i),
        bankName: p?.bankDetails?.bankName || part(/Bank:\s*([^|]+)/i),
        accountNumber: p?.bankDetails?.accountNumber || part(/A\/C:\s*([^|]+)/i),
        ifscCode: p?.bankDetails?.ifscCode || part(/IFSC:\s*([^|]+)/i),
    };
};

const MODES = ['UPI', 'Bank Transfer', 'Other'];

export { ConfirmDialog };

// ---------- Add / edit ----------

const emptyForm = {
    name: '', email: '', phone: '', type: 'Volunteer', paymentMode: 'UPI', upiId: '', bankName: '', accountNumber: '',
    ifscCode: '', otherDetails: '', notes: '', linkedGig: '',
};

export const PayeeEditorSheet = ({ open, onClose, payee, payees, onSaved, onOpenPayee }) => {
    const { addFinancePayee, updateFinancePayee } = useStore();
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const isEdit = Boolean(payee?.id);

    useEffect(() => {
        if (!open) return;
        setSaving(false);
        if (payee) {
            const acct = payeeAccount(payee);
            setForm({
                ...emptyForm,
                name: payee.name || '', email: payee.email || '', phone: payee.phone || '',
                type: PAYEE_TYPES[payee.type] ? payee.type : 'Vendor',
                paymentMode: MODES.includes(payee.paymentMode) ? payee.paymentMode : 'Other',
                ...acct,
                otherDetails: payee.paymentMode !== 'UPI' && payee.paymentMode !== 'Bank Transfer' ? (payee.destinationDetails || '') : '',
                notes: payee.notes || '', linkedGig: payee.linkedGig || '',
            });
        } else setForm(emptyForm);
    }, [open, payee]);

    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e?.target ? e.target.value : e }));

    // Someone with the same email, phone or account is probably already here.
    const match = useMemo(() => {
        if (!open) return null;
        const draft = { id: '__draft', email: form.email, phone: form.phone, upiId: form.paymentMode === 'UPI' ? form.upiId : '', bankDetails: form.paymentMode === 'Bank Transfer' ? { accountNumber: form.accountNumber } : null };
        const groups = findDuplicatePayees([...(payees || []).filter(p => p.id !== payee?.id), draft]);
        const root = groups.get('__draft');
        if (!root) return null;
        return (payees || []).find(p => p.id !== payee?.id && groups.get(p.id) === root) || null;
    }, [open, form.email, form.phone, form.upiId, form.accountNumber, form.paymentMode, payees, payee?.id]);

    const save = async (e) => {
        e?.preventDefault();
        if (saving) return;
        if (!form.name.trim()) { toast('Add a name first.', 'error'); return; }
        if (form.paymentMode === 'UPI' && form.upiId.trim() && !form.upiId.includes('@')) { toast('That UPI ID looks incomplete. It should have an @ in it.', 'error'); return; }
        if (form.paymentMode === 'Bank Transfer' && form.ifscCode.trim() && !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(form.ifscCode.trim())) {
            toast('That IFSC code looks wrong. It is 11 characters, like HDFC0001234.', 'error'); return;
        }
        const data = {
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            type: form.type,
            paymentMode: form.paymentMode,
            upiId: form.paymentMode === 'UPI' ? form.upiId.trim() : '',
            bankDetails: form.paymentMode === 'Bank Transfer'
                ? { bankName: form.bankName.trim(), accountNumber: form.accountNumber.trim(), ifscCode: form.ifscCode.trim().toUpperCase() }
                : null,
            destinationDetails: destinationFor(form),
            notes: form.notes.trim(),
            linkedGig: form.linkedGig.trim(),
        };
        setSaving(true);
        try {
            if (isEdit) {
                await updateFinancePayee(payee.id, { ...data, updatedAt: new Date().toISOString() });
                toast('Payee saved.');
                onSaved?.(payee.id);
            } else {
                const ref = await addFinancePayee({ ...data, status: 'Approved', source: 'admin', createdAt: new Date().toISOString() });
                toast('Payee added.');
                onSaved?.(ref?.id);
            }
            onClose();
        } catch (err) {
            console.error(err);
            toast("Couldn't save the payee. Please try again.", 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title={isEdit ? 'Edit payee' : 'Add a payee'}
            subtitle={isEdit ? payee.name : 'Someone you pay: team, volunteer, vendor or artist'}
            size="md"
            footer={(
                <div className="flex gap-2">
                    <Button variant="ghost" className="h-12" onClick={onClose}>Cancel</Button>
                    <Button variant="accent" type="submit" form="payee-form" className="h-12 flex-1" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add payee'}</Button>
                </div>
            )}
        >
            <form id="payee-form" onSubmit={save} className="space-y-7">
                <Section title="Who they are">
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(PAYEE_TYPES).map(([value, t]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => set('type')(value)}
                                aria-pressed={form.type === value}
                                className={cn('min-h-[56px] rounded-xl border px-3 py-2 text-left transition-colors',
                                    form.type === value ? cn(accent(t.tone).border, accent(t.tone).soft) : 'border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20')}
                            >
                                <span className="flex items-center gap-2 text-[13px] font-bold"><span className={cn('h-2 w-2 rounded-full', accent(t.tone).dot)} />{t.label}</span>
                                <span className="block text-[11.5px] text-gray-500">{t.hint}</span>
                            </button>
                        ))}
                    </div>
                    <Field label="Name">
                        <input className={fieldCls} value={form.name} onChange={set('name')} placeholder="Full name or business name" required autoComplete="off" />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Email" optional>
                            <input className={fieldCls} type="email" inputMode="email" autoCapitalize="off" value={form.email} onChange={set('email')} placeholder="name@example.com" />
                        </Field>
                        <Field label="Phone" optional>
                            <input className={fieldCls} type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" />
                        </Field>
                    </div>
                    {form.type === 'Volunteer' && (
                        <Field label="Event or gig" optional hint="Bulk volunteer payouts pick people by this name.">
                            <input className={fieldCls} value={form.linkedGig} onChange={set('linkedGig')} placeholder="e.g. Arena concert gate" />
                        </Field>
                    )}
                </Section>

                {match && (
                    <div className={cn('flex items-start gap-3 rounded-2xl border p-3.5', accent('amber').border, accent('amber').soft)}>
                        <AlertTriangle size={17} className={cn('mt-0.5 shrink-0', accent('amber').text)} />
                        <div className="min-w-0 flex-1 text-[13px]">
                            <p className="font-bold">{match.name || 'Someone'} has the same email, phone or account.</p>
                            <p className="text-gray-600 dark:text-zinc-400">{isEdit ? 'You can merge them from the payee details.' : 'They may already be saved. Check before adding them again.'}</p>
                            {onOpenPayee && <button type="button" onClick={() => onOpenPayee(match.id)} className={cn('mt-1 inline-flex min-h-[40px] items-center gap-1 font-bold', accent('amber').text)}>Open {match.name || 'payee'} <ChevronRight size={13} /></button>}
                        </div>
                    </div>
                )}

                <Section title="How to pay them">
                    <div className="grid grid-cols-3 gap-2">
                        {MODES.map(m => (
                            <button key={m} type="button" onClick={() => set('paymentMode')(m)} aria-pressed={form.paymentMode === m}
                                className={cn('h-11 rounded-xl border text-[13px] font-semibold transition-colors',
                                    form.paymentMode === m ? cn(accent('teal').border, accent('teal').soft, 'text-gray-900 dark:text-white') : 'border-black/10 text-gray-600 hover:border-black/20 dark:border-white/10 dark:text-zinc-300')}>
                                {m === 'Bank Transfer' ? 'Bank' : m}
                            </button>
                        ))}
                    </div>
                    {form.paymentMode === 'UPI' && (
                        <Field label="UPI ID">
                            <input className={cn(fieldCls, 'font-mono')} value={form.upiId} onChange={set('upiId')} placeholder="name@okaxis" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
                        </Field>
                    )}
                    {form.paymentMode === 'Bank Transfer' && (
                        <div className="space-y-3">
                            <Field label="Bank">
                                <input className={fieldCls} value={form.bankName} onChange={set('bankName')} placeholder="e.g. HDFC Bank" />
                            </Field>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Account number">
                                    <input className={cn(fieldCls, 'font-mono')} inputMode="numeric" value={form.accountNumber} onChange={set('accountNumber')} placeholder="Account number" autoComplete="off" />
                                </Field>
                                <Field label="IFSC">
                                    <input className={cn(fieldCls, 'font-mono')} value={form.ifscCode} onChange={set('ifscCode')} placeholder="HDFC0001234" autoCapitalize="characters" autoComplete="off" />
                                </Field>
                            </div>
                        </div>
                    )}
                    {form.paymentMode === 'Other' && (
                        <Field label="Payment details" optional>
                            <input className={fieldCls} value={form.otherDetails} onChange={set('otherDetails')} placeholder="e.g. Cash at the venue" />
                        </Field>
                    )}
                </Section>

                <Section title="Notes">
                    <textarea className={cn(areaCls, 'min-h-[88px] resize-y')} value={form.notes} onChange={set('notes')} placeholder="Anything worth remembering" />
                </Section>
            </form>
        </Sheet>
    );
};

// ---------- Details ----------

const Row = ({ label, children, onCopy, mono }) => (
    <div className="flex items-center justify-between gap-4 py-2.5">
        <span className="shrink-0 text-[13px] text-gray-500">{label}</span>
        <span className="flex min-w-0 items-center gap-1">
            <span className={cn('min-w-0 break-words text-right text-[13.5px] font-semibold', mono && 'break-all font-mono text-[13px]')}>{children}</span>
            {onCopy && (
                <button type="button" onClick={onCopy} aria-label={`Copy ${label}`} className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white">
                    <Copy size={14} />
                </button>
            )}
        </span>
    </div>
);

export const PayeeDetailSheet = ({ payee, open, onClose, payees, spends, canDelete, onEdit, onDelete, onOpenPayee }) => {
    const { updateFinancePayee, deleteFinancePayee } = useStore();
    const [mergeOpen, setMergeOpen] = useState(false);

    const history = useMemo(() => (payee ? spendsForPayee(payee, spends)
        .slice().sort((a, b) => (spendDay(b) || '').localeCompare(spendDay(a) || '')) : []), [payee, spends]);
    const paid = history.filter(isSpendPaid).reduce((a, s) => a + amountOf(s.amount), 0);
    const pending = history.filter(isSpendPending).reduce((a, s) => a + amountOf(s.amount), 0);

    const twins = useMemo(() => {
        if (!payee) return [];
        const groups = findDuplicatePayees(payees || []);
        const root = groups.get(payee.id);
        return root ? (payees || []).filter(p => p.id !== payee.id && groups.get(p.id) === root) : [];
    }, [payee, payees]);

    if (!payee) return <Sheet open={false} onClose={onClose} />;
    const t = PAYEE_TYPES[payeeType(payee)];
    const acct = payeeAccount(payee);

    // Keep this record, fill its blanks from the others, then remove the others.
    const merge = async () => {
        const fill = (key) => payee[key] || twins.map(x => x[key]).find(Boolean) || '';
        const notes = [payee.notes, ...twins.map(x => x.notes)].filter(Boolean);
        const updates = {
            email: fill('email'), phone: fill('phone'), linkedGig: fill('linkedGig'),
            notes: [...new Set(notes)].join('\n'),
            updatedAt: new Date().toISOString(),
            mergedFrom: [...(payee.mergedFrom || []), ...twins.map(x => ({ id: x.id, name: x.name || '', email: x.email || '', phone: x.phone || '' }))],
        };
        if (!payee.destinationDetails) {
            const donor = twins.find(x => x.destinationDetails);
            if (donor) Object.assign(updates, { paymentMode: donor.paymentMode, destinationDetails: donor.destinationDetails, upiId: donor.upiId || '', bankDetails: donor.bankDetails || null });
        }
        await updateFinancePayee(payee.id, updates);
        for (const x of twins) await deleteFinancePayee(x.id);
        toast(`Merged ${twins.length} into ${payee.name}.`);
    };

    return (
        <>
            <Sheet
                open={open}
                onClose={onClose}
                size="md"
                header={(
                    <div className="flex items-center gap-3">
                        <Avatar name={payee.name} size={44} />
                        <div className="min-w-0">
                            <h2 className="truncate text-lg font-extrabold tracking-tight">{payee.name || 'Unnamed payee'}</h2>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                <Badge tone={t.tone}>{PAYEE_TYPES[payee.type]?.label || payee.type || 'Payee'}</Badge>
                                {payee.linkedGig && <Badge tone="gray">{payee.linkedGig}</Badge>}
                                {twins.length > 0 && <Badge tone="amber">Possible duplicate</Badge>}
                            </div>
                        </div>
                    </div>
                )}
                footer={(
                    <div className="flex gap-2">
                        {canDelete && <Button variant="ghost" className="h-12 text-red-500 hover:text-red-600" onClick={() => onDelete(payee)}><Trash2 size={15} /> Delete</Button>}
                        <Button variant="secondary" className="h-12 flex-1" onClick={() => copyText(payee.destinationDetails, 'Payment details')} disabled={!payee.destinationDetails}><Copy size={15} /> Copy details</Button>
                        <Button variant="accent" className="h-12 flex-1" onClick={() => onEdit(payee)}><Edit size={15} /> Edit</Button>
                    </div>
                )}
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-2">
                        <div className={cn('rounded-xl p-3', accent('teal').soft)}>
                            <p className="text-[12px] font-bold text-gray-500">Paid so far</p>
                            <p className={cn('text-[17px] font-extrabold tabular-nums', accent('teal').text)}>{inr(paid)}</p>
                        </div>
                        <div className={cn('rounded-xl p-3', pending ? accent('orange').soft : 'bg-black/[0.03] dark:bg-white/[0.03]')}>
                            <p className="text-[12px] font-bold text-gray-500">To pay</p>
                            <p className={cn('text-[17px] font-extrabold tabular-nums', pending ? accent('orange').text : 'text-gray-400')}>{inr(pending)}</p>
                        </div>
                        <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.03]">
                            <p className="text-[12px] font-bold text-gray-500">Payouts</p>
                            <p className="text-[17px] font-extrabold tabular-nums">{history.length}</p>
                        </div>
                    </div>

                    {twins.length > 0 && (
                        <div className={cn('rounded-2xl border p-4', accent('amber').border, accent('amber').soft)}>
                            <p className="flex items-center gap-2 text-[14px] font-bold"><AlertTriangle size={16} className={accent('amber').text} /> Looks like the same person as</p>
                            <ul className="mt-2 space-y-1">
                                {twins.map(x => (
                                    <li key={x.id}>
                                        <button type="button" onClick={() => onOpenPayee?.(x.id)} className="flex min-h-[40px] w-full items-center justify-between gap-3 rounded-lg text-left text-[13px] hover:underline">
                                            <span className="min-w-0 truncate"><b>{x.name || 'Unnamed'}</b> <span className="text-gray-500">· {[x.email, x.phone].filter(Boolean).join(' · ') || x.destinationDetails}</span></span>
                                            <ChevronRight size={14} className="shrink-0 text-gray-400" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {canDelete && (
                                <Button variant="secondary" size="sm" className="mt-3 h-10" onClick={() => setMergeOpen(true)}><Merge size={14} /> Keep this one and merge</Button>
                            )}
                        </div>
                    )}

                    <Section title="Payment details">
                        <div className="divide-y divide-black/[0.06] rounded-2xl border border-black/[0.08] px-4 dark:divide-white/[0.06] dark:border-white/[0.08]">
                            <Row label="Method">{payee.paymentMode || 'Not set'}</Row>
                            {acct.upiId && <Row label="UPI ID" mono onCopy={() => copyText(acct.upiId, 'UPI ID')}>{acct.upiId}</Row>}
                            {acct.bankName && <Row label="Bank">{acct.bankName}</Row>}
                            {acct.accountNumber && <Row label="Account no." mono onCopy={() => copyText(acct.accountNumber, 'Account number')}>{acct.accountNumber}</Row>}
                            {acct.ifscCode && <Row label="IFSC" mono onCopy={() => copyText(acct.ifscCode, 'IFSC')}>{acct.ifscCode}</Row>}
                            {!acct.upiId && !acct.accountNumber && <Row label="Details">{payee.destinationDetails || 'Not given yet'}</Row>}
                        </div>
                    </Section>

                    <Section title="Contact">
                        <div className="divide-y divide-black/[0.06] rounded-2xl border border-black/[0.08] px-4 dark:divide-white/[0.06] dark:border-white/[0.08]">
                            <Row label="Email" onCopy={payee.email ? () => copyText(payee.email, 'Email') : undefined}>{payee.email || '—'}</Row>
                            <Row label="Phone" onCopy={payee.phone ? () => copyText(payee.phone, 'Phone') : undefined}>{payee.phone || '—'}</Row>
                            <Row label="Added">{formatDay(payee.createdAt) || '—'}{payee.source === 'admin' ? ' · by the team' : payee.createdAt ? ' · self-registered' : ''}</Row>
                        </div>
                        {(payee.email || payee.phone) && (
                            <div className="flex gap-2">
                                {payee.phone && <Button as="a" href={`tel:${payee.phone}`} variant="secondary" size="sm" className="h-10"><Phone size={14} /> Call</Button>}
                                {payee.phone && <Button as="a" href={`https://wa.me/${String(payee.phone).replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}`} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm" className="h-10"><MessageCircle size={14} /> WhatsApp</Button>}
                                {payee.email && <Button as="a" href={`mailto:${payee.email}`} variant="secondary" size="sm" className="h-10"><Mail size={14} /> Email</Button>}
                            </div>
                        )}
                    </Section>

                    {payee.notes && (
                        <Section title="Notes">
                            <p className="whitespace-pre-wrap rounded-2xl bg-black/[0.03] p-4 text-[13.5px] leading-relaxed dark:bg-white/[0.03]">{payee.notes}</p>
                        </Section>
                    )}

                    <Section title="Payouts" hint="Spends logged under this name.">
                        {history.length === 0 ? (
                            <p className="rounded-2xl bg-black/[0.03] p-4 text-[13px] text-gray-500 dark:bg-white/[0.03]">Nothing paid to {payee.name || 'them'} yet.</p>
                        ) : (
                            <ul className="divide-y divide-black/[0.05] rounded-2xl border border-black/[0.08] dark:divide-white/[0.05] dark:border-white/[0.08]">
                                {history.slice(0, 20).map(sp => {
                                    const st = SPEND_TYPES[spendType(sp)];
                                    return (
                                        <li key={sp.id} className="flex items-center gap-3 px-4 py-3">
                                            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', accent(st.tone).dot)} />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[13.5px] font-semibold">{sp.title || st.label}</span>
                                                <span className="block truncate text-[12px] text-gray-500">{formatDay(spendDay(sp)) || 'No date'} · {sp.paymentMode || '—'}</span>
                                            </span>
                                            <span className="shrink-0 text-right">
                                                <span className="block text-[13.5px] font-bold tabular-nums">{inr(amountOf(sp.amount))}</span>
                                                {isSpendPaid(sp) ? <Badge tone="green">Paid</Badge> : <Badge tone="amber">To pay</Badge>}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        <Button as={Link} to={`/admin/spends?month=all&q=${encodeURIComponent(payee.name || '')}`} variant="ghost" size="sm" className="h-10">See in spends <ChevronRight size={13} /></Button>
                    </Section>
                </div>
            </Sheet>

            <ConfirmDialog
                open={mergeOpen}
                onClose={() => setMergeOpen(false)}
                title={`Merge into ${payee.name || 'this payee'}?`}
                confirmLabel="Merge"
                tone="accent"
                body={(
                    <>
                        <p>We keep <b>{payee.name}</b>, copy any email, phone or payment details it is missing from {twins.map(x => x.name || 'the other record').join(', ')}, then remove {twins.length === 1 ? 'that record' : 'those records'}.</p>
                        <p className="mt-2 text-gray-500">Past payouts are not changed.</p>
                    </>
                )}
                onConfirm={merge}
            />
        </>
    );
};

// ---------- Registration link ----------

export const RegistrationLinkSheet = ({ open, onClose, events = [] }) => {
    const { addUpcomingEvent } = useStore();
    const [type, setType] = useState('Volunteer');
    const [eventName, setEventName] = useState('');
    const [custom, setCustom] = useState('');
    const [addEvent, setAddEvent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [link, setLink] = useState('');

    useEffect(() => { if (open) { setLink(''); setBusy(false); } }, [open]);
    useEffect(() => { setLink(''); }, [type, eventName, custom]);

    const gig = type === 'Volunteer' ? (custom.trim() || eventName) : '';
    const isNewEvent = Boolean(gig) && !events.some(ev => (ev.title || '').toLowerCase() === gig.toLowerCase());

    const build = async () => {
        if (busy) return;
        const url = new URL('/register-payment', window.location.origin);
        url.searchParams.set('type', type);
        if (gig) url.searchParams.set('event', gig);
        setBusy(true);
        try {
            if (gig && isNewEvent && addEvent) {
                try {
                    await addUpcomingEvent({
                        title: gig,
                        date: new Date().toISOString().split('T')[0],
                        location: 'TBD',
                        description: `Created for volunteer registration: ${gig}`,
                        status: 'Upcoming',
                        category: 'Volunteer Event',
                        image: '', hubImage: '', venueLayout: '', videoUrl: '',
                        buttonText: 'Learn more',
                        updatedAt: new Date().toISOString(),
                    });
                    toast(`Added "${gig}" to events.`);
                } catch (err) {
                    console.error(err);
                    toast("Couldn't add the event, but the link still works.", 'error');
                }
            }
            const text = url.toString();
            setLink(text);
            try { await navigator.clipboard.writeText(text); toast('Link created and copied.'); } catch { toast('Link created.'); }
        } finally {
            setBusy(false);
        }
    };

    const share = async () => {
        if (!link) return;
        const message = `Please add your payment details for Newbi${gig ? ` (${gig})` : ''}: ${link}`;
        if (navigator.share) {
            try { await navigator.share({ title: 'Newbi payment details', text: message }); return; } catch (err) { if (err?.name === 'AbortError') return; }
        }
        copyText(message, 'Message');
    };

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Registration link"
            subtitle="Send this so people can add their own UPI or bank details"
            size="md"
            footer={(
                <Button variant="accent" className="h-12 w-full" onClick={build} disabled={busy}><LinkIcon size={15} /> {busy ? 'Creating…' : link ? 'Create again' : 'Create and copy link'}</Button>
            )}
        >
            <div className="space-y-7">
                <Section title="Who is it for">
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(PAYEE_TYPES).map(([value, t]) => (
                            <button key={value} type="button" onClick={() => { setType(value); setEventName(''); setCustom(''); }} aria-pressed={type === value}
                                className={cn('min-h-[56px] rounded-xl border px-3 py-2 text-left transition-colors',
                                    type === value ? cn(accent(t.tone).border, accent(t.tone).soft) : 'border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20')}>
                                <span className="flex items-center gap-2 text-[13px] font-bold"><span className={cn('h-2 w-2 rounded-full', accent(t.tone).dot)} />{t.label}</span>
                                <span className="block text-[11.5px] text-gray-500">{t.hint}</span>
                            </button>
                        ))}
                    </div>
                </Section>

                {type === 'Volunteer' && (
                    <Section title="Event" hint="Optional. Volunteers who use the link are tagged with it, so bulk payouts can find them.">
                        <Field label="Pick an event">
                            <ThemedSelect className={cn(fieldCls, 'cursor-pointer [&>option]:bg-white dark:[&>option]:bg-[#0d0f15]')} value={eventName} onChange={(e) => { setEventName(e.target.value); if (e.target.value) setCustom(''); }}>
                                <option value="">No event</option>
                                {events.map(ev => <option key={ev.id} value={ev.title}>{ev.title}</option>)}
                            </ThemedSelect>
                        </Field>
                        <Field label="Or type a gig name">
                            <input className={fieldCls} value={custom} onChange={(e) => { setCustom(e.target.value); if (e.target.value) setEventName(''); }} placeholder="e.g. Summer fest gate team" />
                        </Field>
                        {isNewEvent && (
                            <Toggle checked={addEvent} onChange={setAddEvent} label={`Also add "${gig}" to events`} hint="Lets you pick it in bulk volunteer payouts. It will also show in your events list." />
                        )}
                    </Section>
                )}

                {link && (
                    <div className={cn('space-y-3 rounded-2xl border p-4', accent('teal').border, accent('teal').soft)}>
                        <p className="flex items-center gap-2 text-[13px] font-bold"><Check size={15} className={accent('teal').text} /> Copied to your clipboard</p>
                        <p className="break-all rounded-xl bg-white p-3 font-mono text-[12.5px] dark:bg-black/30">{link}</p>
                        <div className="grid grid-cols-3 gap-2">
                            <Button variant="secondary" className="h-11" onClick={() => copyText(link, 'Link')}><Copy size={14} /> Copy</Button>
                            <Button as="a" variant="secondary" className="h-11" href={`https://wa.me/?text=${encodeURIComponent(`Please add your payment details for Newbi${gig ? ` (${gig})` : ''}: ${link}`)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> WhatsApp</Button>
                            <Button variant="secondary" className="h-11" onClick={share}><Share2 size={14} /> Share</Button>
                        </div>
                    </div>
                )}
            </div>
        </Sheet>
    );
};
