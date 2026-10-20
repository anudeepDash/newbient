import React, { useMemo, useState } from 'react';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Sheet from '../../Sheet';
import { Button, Badge } from '../../ui';
import { useStore } from '../../../../lib/store';
import { copyToClipboard } from '../../../../lib/clipboard';
import { matchPastedHandles, matchPastedPhones } from '../../../../lib/outreach/match';
import { canTransition } from '../../../../lib/outreach/status';
import { StatusBadge } from './parts';

/*
 * Bulk paste, two ways (source "bulk_paste" in the audit log):
 *   mode 'handles'  Instagram handles from a sheet or chat → matched applicants go on the shortlist.
 *   mode 'phones'   numbers from the WhatsApp group's member list → matched people are marked joined
 *                   (WhatsApp never tells us who joined).
 * Anything with no application is listed so someone can follow it up by hand.
 */
const MODES = {
    handles: {
        title: 'Paste handles', subtitle: 'One per line: @handle, handle or profile link. Matched applicants go on the shortlist.',
        to: 'shortlisted', match: matchPastedHandles, key: 'handle', show: (k) => `@${k}`, verb: 'to shortlist', label: 'Instagram handles',
        placeholder: '@riya.sharma\nhttps://instagram.com/arjun.k\nmeera_blr', already: 'already on the shortlist or past it',
    },
    phones: {
        title: 'Paste group members', subtitle: 'Copy the member numbers from the WhatsApp group (Group info → members). Matched people are marked joined.',
        to: 'joined', match: matchPastedPhones, key: 'phone', show: (k) => k, verb: 'as joined', label: 'Phone numbers',
        placeholder: '+91 98765 43210\n~Riya +91 91234 56789', already: 'already joined, or not messaged yet',
    },
};

const PasteSheet = ({ open, onClose, applications, onShortlist, onMark, mode = 'handles' }) => {
    const addToast = useStore(s => s.addToast);
    const m = MODES[mode] || MODES.handles;
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const result = useMemo(() => m.match(text, applications), [text, applications, m]);
    const addable = result.matched.filter(x => canTransition(x.application.status || 'applied', m.to));
    const already = result.matched.filter(x => !addable.includes(x));

    const close = () => { setText(''); onClose(); };
    const add = async () => {
        setBusy(true);
        const ids = addable.map(x => x.application.id);
        const ok = mode === 'phones' ? await onMark(ids, 'joined', 'bulk_paste') : await onShortlist(ids, 'bulk_paste');
        setBusy(false);
        if (ok) close();
    };
    const copyUnmatched = async () => {
        const ok = await copyToClipboard(result.unmatched.map(m.show).join('\n'));
        if (ok) addToast('Unmatched entries copied.', 'success');
        else addToast('Select the list and copy it yourself.', 'error', { title: 'Couldn’t copy the list' });
    };

    return (
        <Sheet
            open={open}
            onClose={close}
            title={m.title}
            subtitle={m.subtitle}
            size="lg"
            footer={(
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={close}>Cancel</Button>
                    <Button variant="accent" disabled={!addable.length || busy} onClick={add}>
                        {busy ? 'Saving…' : addable.length ? `Mark ${addable.length} ${m.verb}` : `Mark ${m.verb}`}
                    </Button>
                </div>
            )}
        >
            <div className="space-y-4">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={8}
                    autoFocus
                    placeholder={m.placeholder}
                    className="w-full rounded-2xl border border-black/10 bg-white p-3 font-mono text-[13px] outline-none focus:border-emerald-500/60 dark:border-white/10 dark:bg-white/[0.03]"
                    aria-label={m.label}
                />
                {text.trim() && (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <section className="space-y-2 rounded-2xl border border-black/[0.06] p-3 dark:border-white/[0.08]">
                            <p className="flex items-center gap-2 text-[13px] font-bold">Matched <Badge tone="green">{result.matched.length}</Badge></p>
                            <ul className="max-h-60 space-y-1.5 overflow-y-auto text-[13px]">
                                {result.matched.map((x) => (
                                    <li key={x[m.key]} className="flex items-center justify-between gap-2">
                                        <span className="min-w-0 truncate"><span className="font-semibold">{x.application.fullName}</span> <span className="text-gray-500">{m.show(x[m.key])}</span></span>
                                        <StatusBadge status={x.application.status} />
                                    </li>
                                ))}
                                {!result.matched.length && <li className="text-gray-500">No applications match yet.</li>}
                            </ul>
                            {already.length > 0 && <p className="text-[12px] text-gray-500">{already.length} {m.already}; they stay as they are.</p>}
                        </section>
                        <section className="space-y-2 rounded-2xl border border-black/[0.06] p-3 dark:border-white/[0.08]">
                            <div className="flex items-center justify-between gap-2">
                                <p className="flex items-center gap-2 text-[13px] font-bold">No application <Badge tone="amber">{result.unmatched.length}</Badge></p>
                                {result.unmatched.length > 0 && <Button size="sm" variant="ghost" onClick={copyUnmatched}><Copy size={13} /> Copy</Button>}
                            </div>
                            <ul className="max-h-60 space-y-1 overflow-y-auto text-[13px]">
                                {result.unmatched.map(h => <li key={h}>{m.show(h)}</li>)}
                                {!result.unmatched.length && <li className="text-gray-500">Everything matched.</li>}
                            </ul>
                            <p className="text-[12px] text-gray-500">{mode === 'phones' ? 'In the group but not in this campaign’s applications.' : 'Follow these up by hand: send them the form link.'}</p>
                        </section>
                        {result.invalid.length > 0 && (
                            <section className="space-y-1 rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-3 sm:col-span-2">
                                <p className="text-[13px] font-bold">Couldn’t read {result.invalid.length} line{result.invalid.length === 1 ? '' : 's'}</p>
                                <ul className="text-[12px] text-gray-600 dark:text-zinc-400">{result.invalid.slice(0, 20).map((l, i) => <li key={i} className="truncate">{l}</li>)}</ul>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </Sheet>
    );
};

export default PasteSheet;
