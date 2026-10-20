import React, { useEffect, useRef, useState } from 'react';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import Edit from 'lucide-react/dist/esm/icons/edit-3';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import { useStore } from '../../../lib/store';
import { useStoreSubscription } from '../../../hooks/useStoreSubscription';
import Sheet from '../Sheet';
import { Button, Badge, Menu, MenuItem } from '../ui';
import { fieldCls, Field } from '../uploads/UploadKit';
import { BuilderCard } from '../events/EditorParts';
import { ConfirmSheet, ImagePicker } from './ContentKit';

/** The "brands we've worked with" strip on the home and creator pages. */
const PartnerBrandsCard = ({ visible }) => {
    useStoreSubscription(['pastClients']);
    const { pastClients = [], addPastClient, updatePastClient, deletePastClient, reorderPastClients, addToast } = useStore();
    const [editor, setEditor] = useState(null); // { id?, name, logoUrl }
    const [removing, setRemoving] = useState(null);
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);

    const run = async (fn, okMsg, failMsg) => {
        if (lock.current) return false;
        lock.current = true;
        setBusy(true);
        try {
            await fn();
            if (okMsg) addToast(okMsg, 'success');
            return true;
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', { title: failMsg });
            return false;
        } finally {
            lock.current = false;
            setBusy(false);
        }
    };

    const save = async () => {
        const name = editor.name.trim();
        if (!name) return;
        const ok = await run(
            () => editor.id ? updatePastClient(editor.id, { name, logoUrl: editor.logoUrl || '' }) : addPastClient({ name, logoUrl: editor.logoUrl || '' }),
            editor.id ? 'Brand updated.' : 'Brand added.',
            "Couldn't save the brand"
        );
        if (ok) setEditor(null);
    };

    const move = (index, dir) => {
        const list = [...pastClients];
        const j = index + dir;
        if (j < 0 || j >= list.length) return;
        [list[index], list[j]] = [list[j], list[index]];
        run(() => reorderPastClients(list), null, "Couldn't save the new order");
    };

    return (
        <BuilderCard
            id="brands"
            title="Partner brands"
            hint={`The logo strip on the home and creator pages${visible ? '' : ' (hidden right now)'}`}
            action={<Button size="sm" variant="accent" onClick={() => setEditor({ name: '', logoUrl: '' })} className="h-10"><Plus size={14} /> Add brand</Button>}
        >
            {pastClients.length === 0 ? (
                <p className="rounded-xl bg-black/[0.03] p-4 text-[13px] text-gray-500 dark:bg-white/[0.03]">No brands yet, so the site shows a default list of names. Add your first brand to replace it.</p>
            ) : (
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {pastClients.map((c, i) => (
                        <li key={c.id} className="flex items-center gap-3 rounded-xl border border-black/[0.06] p-2.5 dark:border-white/[0.08]">
                            <span className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/[0.06] bg-white p-1 dark:border-white/10">
                                {c.logoUrl ? <img src={c.logoUrl} alt="" className="max-h-full max-w-full object-contain" /> : <Building2 size={16} className="text-gray-400" />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[14px] font-bold">{c.name}</span>
                                {!c.logoUrl && <Badge tone="gray">Name only</Badge>}
                            </span>
                            <Menu trigger={({ toggle }) => (
                                <Button size="sm" variant="ghost" onClick={toggle} aria-label={`Actions for ${c.name}`} className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
                            )}>
                                <MenuItem icon={Edit} onClick={() => setEditor({ id: c.id, name: c.name || '', logoUrl: c.logoUrl || '' })}>Edit</MenuItem>
                                {i > 0 && <MenuItem icon={ArrowUp} onClick={() => move(i, -1)}>Move earlier</MenuItem>}
                                {i < pastClients.length - 1 && <MenuItem icon={ArrowDown} onClick={() => move(i, 1)}>Move later</MenuItem>}
                                <MenuItem icon={Trash2} danger onClick={() => setRemoving(c)}>Remove</MenuItem>
                            </Menu>
                        </li>
                    ))}
                </ul>
            )}

            <Sheet
                open={Boolean(editor)}
                onClose={busy ? () => {} : () => setEditor(null)}
                size="sm"
                title={editor?.id ? 'Edit brand' : 'Add a brand'}
                subtitle="A logo on a transparent or white background looks best"
                footer={(
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setEditor(null)} disabled={busy} className="h-12 flex-1">Cancel</Button>
                        <Button variant="accent" onClick={save} disabled={busy || !editor?.name?.trim()} className="h-12 flex-[2]">{busy ? 'Saving…' : editor?.id ? 'Save' : 'Add brand'}</Button>
                    </div>
                )}
            >
                {editor && <BrandForm editor={editor} setEditor={setEditor} />}
            </Sheet>

            <ConfirmSheet open={Boolean(removing)} onClose={() => setRemoving(null)} title="Remove this brand?" confirmLabel="Remove" busy={busy}
                onConfirm={async () => { const ok = await run(() => deletePastClient(removing.id), 'Brand removed.', "Couldn't remove the brand"); if (ok) setRemoving(null); }}>
                <p><span className="font-semibold text-gray-900 dark:text-white">{removing?.name}</span> will disappear from the logo strip.{pastClients.length === 1 ? ' With no brands left, the site goes back to its default list of names.' : ''}</p>
            </ConfirmSheet>
        </BuilderCard>
    );
};

const BrandForm = ({ editor, setEditor }) => {
    const inputRef = useRef(null);
    useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 250); return () => clearTimeout(t); }, []);
    return (
        <div className="space-y-4">
            <Field label="Brand name">
                <input ref={inputRef} className={fieldCls} value={editor.name} onChange={(e) => setEditor(v => ({ ...v, name: e.target.value }))} placeholder="Red Bull" />
            </Field>
            <ImagePicker label="Logo" optional value={editor.logoUrl} onChange={(url) => setEditor(v => ({ ...v, logoUrl: url }))} aspect="aspect-[3/1]" contain hint="PNG or SVG with a clear background · up to 10 MB" />
        </div>
    );
};

export default PartnerBrandsCard;
