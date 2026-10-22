import React, { useEffect, useMemo, useState } from 'react';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import Sheet from '../Sheet';
import { Button } from '../ui';
import { WhatsAppLogo } from '../../app';
import { copyToClipboard } from '../../../lib/clipboard';
import { cn } from '../../../lib/utils';
import { shareDrafts } from './shareDrafts';

/*
 * Share a guestlist or ticket sale in communities and groups: drafts written
 * from its details, each editable, with Copy and Open in WhatsApp (which
 * opens WhatsApp with the text filled in; you pick the chat and send).
 */

const DraftCard = ({ draft }) => {
    const [text, setText] = useState(draft.text);
    const [copied, setCopied] = useState(false);
    useEffect(() => { setText(draft.text); }, [draft.text]);

    const copy = async () => {
        if (await copyToClipboard(text)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        }
    };

    return (
        <section className="space-y-2 rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.08]">
            <div>
                <p className="text-[14px] font-bold">{draft.label}</p>
                <p className="text-[12px] text-gray-500">{draft.hint}</p>
            </div>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={Math.min(14, Math.max(4, text.split('\n').length + 1))}
                className="w-full resize-y rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2.5 text-[14px] leading-relaxed outline-none focus:border-black/30 dark:border-white/10 dark:bg-white/[0.03] dark:focus:border-white/30"
            />
            <div className="flex flex-wrap gap-2">
                <Button variant="secondary" className="h-11" onClick={copy}>
                    {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
                </Button>
                {draft.whatsapp && (
                    <Button as="a" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" variant="secondary" className="h-11">
                        <WhatsAppLogo size={15} /> Open in WhatsApp
                    </Button>
                )}
            </div>
        </section>
    );
};

const ShareDraftsSheet = ({ open, onClose, item }) => {
    const drafts = useMemo(() => (item ? shareDrafts(item) : []), [item]);
    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Share it"
            subtitle="Drafts for your communities and groups. Edit, then copy or open in WhatsApp."
            size="lg"
            bodyClassName={cn('space-y-4')}
        >
            {drafts.map(d => <DraftCard key={d.key} draft={d} />)}
        </Sheet>
    );
};

export default ShareDraftsSheet;
