import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function markdownToHtml(str) {
    if (!str) return '';
    
    // If it's already HTML, don't convert it
    if (/<[a-z/][\s\S]*>/i.test(str)) {
        return str;
    }
    
    // Split into lines
    const lines = str.split('\n');
    let html = '';
    let inList = false;
    let listType = null; // 'ul' or 'ol'

    const closeList = () => {
        if (inList) {
            html += `</${listType}>`;
            inList = false;
            listType = null;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        if (!line) {
            closeList();
            continue;
        }

        // Headings
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            closeList();
            const level = headingMatch[1].length;
            const headingText = headingMatch[2];
            // Map markdown headings to standard HTML tags h2, h3, etc.
            const tag = `h${Math.min(level + 1, 6)}`;
            html += `<${tag}>${inlineMarkdownToHtml(headingText)}</${tag}>`;
            continue;
        }

        // Bullet Lists
        const bulletMatch = line.match(/^([•\-\*])\s+(.*)$/);
        if (bulletMatch) {
            if (!inList || listType !== 'ul') {
                closeList();
                html += '<ul>';
                inList = true;
                listType = 'ul';
            }
            html += `<li>${inlineMarkdownToHtml(bulletMatch[2])}</li>`;
            continue;
        }

        // Numbered Lists
        const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
            if (!inList || listType !== 'ol') {
                closeList();
                html += '<ol>';
                inList = true;
                listType = 'ol';
            }
            html += `<li>${inlineMarkdownToHtml(numberedMatch[2])}</li>`;
            continue;
        }

        // Horizontal Rule
        if (line.match(/^[-*_]{3,}$/)) {
            closeList();
            html += '<hr />';
            continue;
        }

        // Regular Paragraph
        closeList();
        html += `<p>${inlineMarkdownToHtml(line)}</p>`;
    }
    
    closeList();
    return html;
}

function inlineMarkdownToHtml(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>');
}

