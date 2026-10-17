import React, { useEffect, useRef, useState } from 'react';
import Bold from 'lucide-react/dist/esm/icons/bold';
import Italic from 'lucide-react/dist/esm/icons/italic';
import List from 'lucide-react/dist/esm/icons/list';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import { cn } from '../../lib/utils';
import { stripPastedStyles } from '../../lib/taskLinks';

/**
 * Small HTML editor for admin emails: bold, italic, bullets, links, images.
 * stripStyles (campaign briefs, task descriptions): pasted text loses its
 * colours, backgrounds and font sizes (Docs and web pages paste black text,
 * unreadable in dark mode), and so does an existing brief when it loads.
 */
const RichEditor = ({ value, onChange, placeholder, minHeight = 180, label = 'Email message', stripStyles = false }) => {
    const editorRef = useRef(null);
    const savedRange = useRef(null);
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    // Only push outside changes in (a reset or a template); never while typing.
    useEffect(() => {
        const el = editorRef.current;
        if (!el || document.activeElement === el) return;
        const html = stripStyles ? stripPastedStyles(value || '') : (value || '');
        if (html !== el.innerHTML) el.innerHTML = html;
    }, [value, stripStyles]);

    const onPaste = (e) => {
        if (!stripStyles) return;
        const data = e.clipboardData;
        const html = data?.getData('text/html');
        if (!html) return; // plain text pastes as it is
        e.preventDefault();
        // Keep the content, not the source page's head, scripts or styles.
        const body = html.replace(/^[\s\S]*<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '')
            .replace(/<(script|style|meta|link|title)\b[\s\S]*?(<\/\1>|>)/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/\sclass\s*=\s*("[^"]*"|'[^']*')/gi, '');
        document.execCommand('insertHTML', false, stripPastedStyles(body));
        onChange(editorRef.current.innerHTML);
    };

    const exec = (cmd, val = null) => {
        editorRef.current.focus();
        document.execCommand(cmd, false, val);
        onChange(editorRef.current.innerHTML);
    };
    // Links: remember the selection, ask for the address inline (no browser pop-up),
    // then put the selection back and link it.
    const openLink = () => {
        const sel = window.getSelection();
        savedRange.current = sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
        setLinkUrl('');
        setLinkOpen(true);
    };
    const applyLink = () => {
        const raw = linkUrl.trim();
        setLinkOpen(false);
        if (!raw) return;
        const url = /^(https?:|mailto:|tel:)/i.test(raw) ? raw : `https://${raw}`;
        editorRef.current.focus();
        const sel = window.getSelection();
        if (savedRange.current) { sel.removeAllRanges(); sel.addRange(savedRange.current); }
        if (sel && !sel.isCollapsed) exec('createLink', url);
        else exec('insertHTML', `<a href="${url.replace(/"/g, '&quot;')}">${raw.replace(/[<>&]/g, '')}</a>`);
    };

    const tool = 'flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10';
    return (
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center gap-0.5 border-b border-black/[0.06] bg-black/[0.02] p-1 dark:border-white/[0.06] dark:bg-white/[0.02]">
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')} className={tool} aria-label="Bold"><Bold size={14} /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')} className={tool} aria-label="Italic"><Italic size={14} /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')} className={tool} aria-label="Bulleted list"><List size={14} /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={openLink} className={cn(tool, linkOpen && 'bg-black/5 dark:bg-white/10')} aria-label="Insert link"><Link2 size={14} /></button>
                <label className={cn(tool, 'cursor-pointer')} aria-label="Insert image">
                    <ImageIcon size={14} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { const r = new FileReader(); r.onload = (ev) => exec('insertImage', ev.target.result); r.readAsDataURL(f); } }} />
                </label>
            </div>
            {linkOpen && (
                <div className="flex gap-2 border-b border-black/[0.06] p-2 dark:border-white/[0.06]">
                    <input
                        autoFocus
                        type="url"
                        inputMode="url"
                        autoCapitalize="off"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } if (e.key === 'Escape') { e.stopPropagation(); setLinkOpen(false); } }}
                        placeholder="Paste a link, e.g. newbi.live/events"
                        className="h-10 min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 text-[15px] outline-none focus:border-emerald-500/60 dark:border-white/10 dark:bg-white/[0.04] sm:text-[13px]"
                    />
                    <button type="button" onClick={applyLink} className="h-10 rounded-lg bg-gray-900 px-3 text-[13px] font-semibold text-white dark:bg-white dark:text-black">Add</button>
                    <button type="button" onClick={() => setLinkOpen(false)} className="h-10 rounded-lg px-2 text-[13px] font-semibold text-gray-500">Cancel</button>
                </div>
            )}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                aria-label={label}
                onInput={(e) => onChange(e.currentTarget.innerHTML)}
                onPaste={onPaste}
                data-placeholder={placeholder}
                style={{ minHeight }}
                className="p-3.5 text-[15px] leading-relaxed text-gray-900 outline-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)] dark:text-zinc-100 [&_a]:text-sky-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5"
            />
        </div>
    );
};

export default RichEditor;
