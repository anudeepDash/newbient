import React, { useMemo, useState } from 'react';
import LayoutTemplate from 'lucide-react/dist/esm/icons/layout-template';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import PenLine from 'lucide-react/dist/esm/icons/pen-line';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Send from 'lucide-react/dist/esm/icons/send';
import { Badge, Button, Card, EmptyState, Menu, MenuItem, SearchInput } from '../ui';
import { CATEGORY_LABEL, CATEGORY_TONE, formatWhen, stripHtml } from './mailingApi';

/* Saved templates: open one in the composer, or delete it. */

const TemplatesPanel = ({ templates, activeId, onUse, onDelete, onCompose }) => {
    const [search, setSearch] = useState('');
    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (templates || []).filter(t => !q || [t.subject, t.headerText, t.category, stripHtml(t.messageBody)].some(v => String(v || '').toLowerCase().includes(q)));
    }, [templates, search]);

    if (!(templates || []).length) {
        return (
            <Card className="rounded-2xl">
                <EmptyState
                    icon={LayoutTemplate}
                    title="No templates yet"
                    description="Write an email in the composer and choose “Save as template” to reuse it later."
                    action={<Button variant="accent" onClick={onCompose}><Send size={14} /> Open the composer</Button>}
                />
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Search templates" className="lg:w-96" />
            {rows.length === 0 ? (
                <Card className="rounded-2xl"><EmptyState icon={LayoutTemplate} title="No matching templates" description="Try another word." /></Card>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {rows.map(t => {
                        const cat = t.category || 'OFFICIAL';
                        return (
                            <Card key={t.id} className="relative flex flex-col rounded-2xl p-4 transition-colors hover:border-black/15 dark:hover:border-white/15">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge tone={CATEGORY_TONE[cat] || 'fuchsia'}>{CATEGORY_LABEL[cat] || cat.charAt(0) + cat.slice(1).toLowerCase()}</Badge>
                                    {t.id === activeId && <Badge tone="green">In the composer</Badge>}
                                    {(t.isLocalFallback || String(t.id).startsWith('tpl_local_')) && <Badge tone="amber">This device only</Badge>}
                                </div>
                                <button type="button" onClick={() => onUse(t)} className="mt-3 min-w-0 text-left after:absolute after:inset-0">
                                    <p className="line-clamp-2 text-[16px] font-extrabold leading-snug">{t.subject || 'Untitled template'}</p>
                                    {t.headerText && <p className="mt-0.5 truncate text-[13px] font-semibold text-gray-600 dark:text-zinc-300">{t.headerText}</p>}
                                    <p className="mt-1 line-clamp-2 text-[13px] text-gray-500">{stripHtml(t.messageBody) || 'No message yet'}</p>
                                </button>
                                <div className="relative z-10 mt-4 flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                    <span className="min-w-0 flex-1 truncate text-[12px] text-gray-500">{t.updatedAt ? `Updated ${formatWhen(t.updatedAt)}` : ''}</span>
                                    <Button size="sm" variant="secondary" className="h-10" onClick={() => onUse(t)}><PenLine size={13} /> Use</Button>
                                    <Menu trigger={({ toggle }) => (
                                        <Button size="sm" variant="ghost" onClick={toggle} aria-label="More actions" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
                                    )}>
                                        <MenuItem icon={PenLine} onClick={() => onUse(t)}>Open in composer</MenuItem>
                                        <MenuItem icon={Trash2} danger onClick={() => onDelete(t)}>Delete template</MenuItem>
                                    </Menu>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TemplatesPanel;
