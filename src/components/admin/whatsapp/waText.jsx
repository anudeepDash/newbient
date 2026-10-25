import React from 'react';

/*
 * WhatsApp's own formatting, for the inbox and template previews: *bold*,
 * _italic_, ~strike~, ```mono``` and `code`, with links made clickable.
 */

const TOKEN = /(```[\s\S]+?```|`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

export const waText = (text) => String(text || '').split(TOKEN).map((part, i) => {
    if (!part) return null;
    if (/^```[\s\S]+```$/.test(part)) return <code key={i} className="font-mono text-[0.92em]">{part.slice(3, -3)}</code>;
    if (/^`[^`]+`$/.test(part)) return <code key={i} className="rounded bg-black/[0.06] px-1 font-mono text-[0.9em] dark:bg-white/10">{part.slice(1, -1)}</code>;
    if (/^\*[^*]+\*$/.test(part)) return <strong key={i}>{part.slice(1, -1)}</strong>;
    if (/^_[^_]+_$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    if (/^~[^~]+~$/.test(part)) return <s key={i}>{part.slice(1, -1)}</s>;
    if (/^https?:\/\//.test(part)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#027eb5] underline-offset-2 hover:underline dark:text-[#53bdeb]" onClick={(e) => e.stopPropagation()}>{part}</a>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
});

export default waText;
