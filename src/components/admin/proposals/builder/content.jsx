import React from 'react';
import { cn } from '../../../../lib/utils';
import { inlineFmt, processHtmlHeadings } from './text';

/* Renders proposal text (HTML from the editor, or older markdown-like text) on the document paper. */

export const renderFormatted = (text, baseClass = '') => {
    if (!text) return null;
    const rawLines = text.split('\n');
    const lines = [];
    rawLines.forEach(rl => {
        const parts = rl.split(/\s(?=\d+\.\s)/);
        if (parts.length > 1) lines.push(...parts);
        else lines.push(rl);
    });

    const elements = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (!line && i < lines.length - 1) {
            const lastElement = elements[elements.length - 1];
            const isLastSpacer = lastElement && lastElement.key && String(lastElement.key).startsWith('spacer-');
            if (!isLastSpacer) {
                elements.push(<div key={`spacer-${i}`} className="h-3" />);
            }
            i++;
            continue;
        }

        if (line.match(/^[-*_]{3,}$/)) {
            elements.push(<div key={`hr-${i}`} className="h-[1.5px] bg-white dark:bg-black/10 my-8 w-full" />);
            i++;
            continue;
        }

        const headingMatch = line.match(/^(#{1,6})(?:\s|&nbsp;|\u00a0)+(.*)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const headingText = headingMatch[2];
            const headingClass = level === 1
                ? "text-[18px] font-black text-black border-b border-black/10 pb-1 mt-6 mb-2 block"
                : level === 2
                ? "text-[15px] font-bold text-black border-b border-black/10 pb-1 mt-5 mb-2 block"
                : "text-[13.5px] font-bold text-gray-800 mt-4 mb-1 block";
            const headingTag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
            const Tag = headingTag;
            elements.push(<Tag key={i} className={headingClass} dangerouslySetInnerHTML={{ __html: inlineFmt(headingText) }} />);
        } else if (line.match(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/)) {
            const items = [];
            while (i < lines.length && lines[i].trim().match(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/)) {
                items.push(lines[i].trim().replace(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/, ''));
                i++;
            }
            elements.push(
                <div key={`ul-${i}`} className="pl-4 space-y-1.5 my-3">
                    {items.map((item, j) => (
                        <div key={j} className="flex items-start gap-3">
                            <span className="text-neon-green mt-[7px] text-[8px] select-none shrink-0">●</span>
                            <span className={cn("text-[13px] font-medium text-black leading-[1.9]", baseClass)} dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} />
                        </div>
                    ))}
                </div>
            );
            continue;
        } else if (line.match(/^\d+\.(?:\s|&nbsp;|\u00a0)+/)) {
            const items = [];
            while (i < lines.length && lines[i].trim().match(/^\d+\.(?:\s|&nbsp;|\u00a0)+/)) {
                const l = lines[i].trim();
                const match = l.match(/^(\d+)\.(?:\s|&nbsp;|\u00a0)+(.*)/);
                if (match) {
                    items.push({ num: match[1], text: match[2].trim() });
                } else {
                    items.push({ num: '•', text: l.replace(/^\d+\.(?:\s|&nbsp;|\u00a0)+/, '').trim() });
                }
                i++;
            }
            elements.push(
                <div key={`ol-${i}`} className="pl-4 space-y-2 my-4">
                    {items.map((item, j) => (
                        <div key={j} className="flex items-start gap-3">
                            <span className="text-[11px] font-black text-gray-600 dark:text-gray-400 mt-0.5 w-6 shrink-0">{item.num}.</span>
                            <span className={cn("text-[13px] font-medium text-black leading-[1.9]", baseClass)} dangerouslySetInnerHTML={{ __html: inlineFmt(item.text) }} />
                        </div>
                    ))}
                </div>
            );
            continue;
        } else if (line) {
            elements.push(<p key={i} className={cn("text-[13px] font-medium text-black leading-[1.9] text-justify", baseClass)} dangerouslySetInnerHTML={{ __html: inlineFmt(line) }} />);
        }
        i++;
    }
    return <div>{elements}</div>;
};

export const renderContent = (content, baseClass = '') => {
    if (!content) return null;
    const isHtml = content.includes('<') && content.includes('>');
    
    if (isHtml) {
        return (
            <div 
                className={cn("article-content", baseClass)} 
                dangerouslySetInnerHTML={{ __html: processHtmlHeadings(content) }} 
            />
        );
    }
    
    return renderFormatted(content, baseClass);
};
