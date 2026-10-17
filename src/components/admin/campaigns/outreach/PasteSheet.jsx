import React, { useMemo, useState } from 'react';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Sheet from '../../Sheet';
import { Button, Badge } from '../../ui';
import { useStore } from '../../../../lib/store';
import { copyToClipboard } from '../../../../lib/clipboard';
import { matchPastedHandles } from '../../../../lib/outreach/match';
import { canTransition } from '../../../../lib/outreach/status';
import { StatusBadge } from './parts';

/*
 * Bulk paste: handles from a sheet or a chat → matched applications go on the
 * shortlist (source "bulk_paste" in the audit log); handles with no
 * application are listed so someone can follow them up by hand.
 */
const PasteSheet = ({ open, onClose, applications, onShortlist }) => {
    const addToast = useStore(s => s.addToast);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const result = useMemo(() => matchPastedHandles(text, applications), [text, applications]);
    const addable = result.matched.filter(m => canTransition(m.application.status || 'applied', 'shortlisted'));
    const already = result.matched.filter(m => !addable.includes(m));

    const close = () => { setText(''); onClose(); };
    const add = async () => {
        setBusy(true);
        const ok = await onShortlist(addable.map(m => m.application.id), 'bulk_paste');
        setBusy(false);
        if (ok) close();
    };
    const copyUnmatched = async () => {
        const ok = await copyToClipboard(result.unmatched.map(h => `@${h}`).join('\n'));
        addToast(ok ? 'Unmatched handles copied.' : 'Couldn’t copy.', ok ? 'success' : 'error');
    };

    return (
        <Sheet
            open={open}
            onClose={close}
            title="Paste handles"
            subtitle="One per line: @handle, handle or profile link. Matched applicants go on the shortlist."
            size="lg"
            footer={(
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={close}>Cancel</Button>
                    <Button variant="accent" disabled={!addable.length || busy} onClick={add}>
                        {busy ? 'Adding…' : addable.length ? `Add ${addable.length} to shortlist` : 'Add to shortlist'}
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
                    placeholder={'@riya.sharma\nhttps://instagram.com/arjun.k\nmeera_blr'}
                    className="w-full rounded-2xl border border-black/10 bg-white p-3 font-mono text-[13px] outline-none focus:border-emerald-500/60 dark:border-white/10 dark:bg-white/[0.03]"
                    aria-label="Instagram handles"
                />
                {text.trim() && (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <section className="space-y-2 rounded-2xl border border-black/[0.06] p-3 dark:border-white/[0.08]">
                            <p className="flex items-center gap-2 text-[13px] font-bold">Matched <Badge tone="green">{result.matched.length}</Badge></p>
                            <ul className="max-h-60 space-y-1.5 overflow-y-auto text-[13px]">
                                {result.matched.map(({ handle, application }) => (
                                    <li key={handle} className="flex items-center justify-between gap-2">
                                        <span className="min-w-0 truncate"><span className="font-semibold">{application.fullName}</span> <span className="text-gray-500">@{handle}</span></span>
                                        <StatusBadge status={application.status} />
                                    </li>
                                ))}
                                {!result.matched.length && <li className="text-gray-500">No applications match yet.</li>}
                            </ul>
                            {already.length > 0 && <p className="text-[12px] text-gray-500">{already.length} already on the shortlist or past it; they stay as they are.</p>}
                        </section>
                        <section className="space-y-2 rounded-2xl border border-black/[0.06] p-3 dark:border-white/[0.08]">
                            <div className="flex items-center justify-between gap-2">
                                <p className="flex items-center gap-2 text-[13px] font-bold">No application <Badge tone="amber">{result.unmatched.length}</Badge></p>
                                {result.unmatched.length > 0 && <Button size="sm" variant="ghost" onClick={copyUnmatched}><Copy size={13} /> Copy</Button>}
                            </div>
                            <ul className="max-h-60 space-y-1 overflow-y-auto text-[13px]">
                                {result.unmatched.map(h => <li key={h}>@{h}</li>)}
                                {!result.unmatched.length && <li className="text-gray-500">Every handle matched.</li>}
                            </ul>
                            <p className="text-[12px] text-gray-500">Follow these up by hand: send them the form link.</p>
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
