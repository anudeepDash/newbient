import React, { useState } from 'react';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Download from 'lucide-react/dist/esm/icons/download';
import Globe from 'lucide-react/dist/esm/icons/globe';
import FileUp from 'lucide-react/dist/esm/icons/file-up';
import { cn } from '../../../lib/utils';
import { isPresent } from '../../../lib/present';
import { copyToClipboard } from '../../../lib/clipboard';
import { Button } from '../../../components/app';

/*
 * A deliverable's links (from lib/taskLinks extractTaskActionLinks), in the
 * app look. A Google Form is where creators upload their files, so it gets
 * the accent card: what it's for, where it opens, and a big Open button.
 * Other links are quiet rows. Every row can copy its link.
 */

const KINDS = {
    google_form: { icon: FileUp, open: 'Open form', note: 'Upload your files here' },
    ticket: { icon: Ticket, open: 'Open ticket' },
    repost: { icon: Instagram, open: 'View post' },
    creative: { icon: Download, open: 'Get assets' },
    link: { icon: Globe, open: 'Open' },
};

const CopyButton = ({ url, accent }) => {
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            onClick={async (e) => {
                e.stopPropagation();
                if (await copyToClipboard(url)) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                }
            }}
            aria-label={copied ? 'Link copied' : 'Copy link'}
            className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors',
                accent
                    ? 'border-emerald-900/10 bg-white/70 text-gray-700 hover:bg-white dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-zinc-200 dark:hover:bg-white/[0.1]'
                    : 'border-black/[0.08] text-gray-600 hover:bg-black/[0.04] dark:border-white/[0.1] dark:text-zinc-300 dark:hover:bg-white/[0.06]'
            )}
        >
            {copied ? <Check size={18} className="text-emerald-600 dark:text-neon-green" /> : <Copy size={17} />}
        </button>
    );
};

const FormCard = ({ item }) => {
    const { icon: Icon, open, note } = KINDS.google_form;
    return (
        <div className="relative isolate overflow-hidden rounded-3xl border border-emerald-900/10 bg-emerald-50/60 p-4 dark:border-neon-green/20 dark:bg-neon-green/[0.05]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10"
                style={{ background: 'radial-gradient(90% 120% at 100% 0%, rgba(57,255,20,0.22), transparent 60%)' }} />
            <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-neon-green dark:bg-neon-green dark:text-black">
                    <Icon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-neon-green">Submit on Google Form</p>
                    <p className="mt-0.5 text-[16px] font-bold leading-snug">{isPresent(item.label) && !/google form/i.test(item.label) ? item.label : note}</p>
                    <p className="mt-0.5 truncate text-[13px] text-gray-600 dark:text-zinc-400">Opens in a new tab{isPresent(item.domain) ? ` · ${item.domain}` : ''}</p>
                </div>
            </div>
            <div className="mt-4 flex gap-2">
                <Button href={item.url} target="_blank" rel="noopener noreferrer" icon={ExternalLink} className="flex-1" onClick={(e) => e.stopPropagation()}>
                    {open}
                </Button>
                <CopyButton url={item.url} accent />
            </div>
        </div>
    );
};

const LinkRow = ({ item }) => {
    const kind = KINDS[item.type] || KINDS.link;
    const Icon = kind.icon;
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-black/[0.06] p-2 pl-3 dark:border-white/[0.08]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-gray-600 dark:bg-white/[0.06] dark:text-zinc-300">
                <Icon size={17} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold">{item.label}</p>
                {isPresent(item.domain) && <p className="truncate text-[12px] text-gray-500 dark:text-zinc-500">{item.domain}</p>}
            </div>
            <CopyButton url={item.url} />
            <Button href={item.url} target="_blank" rel="noopener noreferrer" variant="secondary" className="shrink-0 px-4" onClick={(e) => e.stopPropagation()}>
                {kind.open}
            </Button>
        </div>
    );
};

const TaskLinks = ({ links }) => {
    if (!links?.length) return null;
    return (
        <div className="space-y-2">
            {links.map((item, i) => (item.type === 'google_form'
                ? <FormCard key={`${item.url}-${i}`} item={item} />
                : <LinkRow key={`${item.url}-${i}`} item={item} />))}
        </div>
    );
};

export default TaskLinks;
