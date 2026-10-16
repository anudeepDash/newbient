/* Text helpers for proposal content: HTML/markdown detection and the page-height estimates used to paginate classic proposals. */

export const inlineFmt = (text) => {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black">$1</strong>')
        .replace(/__(.*?)__/g, '<strong class="font-black">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
        .replace(/_(.*?)_/g, '<em class="italic">$1</em>');
};

export const htmlToPlainText = (html) => {
    if (!html) return '';
    if (!html.includes('<') || !html.includes('>')) return html;
    let text = html;
    text = text.replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|ul|ol)>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/&nbsp;|\u00a0/g, ' ');
    text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    return text;
};

export const getHtmlBlocks = (html) => {
    const regex = /<(p|div|ul|ol|h[1-6])\b[^>]*?>([\s\S]*?)<\/\1>/gi;
    const blocks = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        blocks.push(match[0]);
    }
    if (blocks.length === 0) return [html];
    return blocks;
};

export const processHtmlHeadings = (html) => {
    if (!html) return html;
    return html.replace(/<(p|div)\b([^>]*?)>(#{1,6})(?:\s|&nbsp;|\u00a0)+(.*?)<\/\1>/gi, (match, tag, attrs, hashes, content) => {
        const level = hashes.length;
        const headingClass = level === 1
            ? "text-[18px] font-black text-black border-b border-black/10 pb-1 mt-6 mb-2 block"
            : level === 2
            ? "text-[15px] font-bold text-black border-b border-black/10 pb-1 mt-5 mb-2 block"
            : "text-[13.5px] font-bold text-gray-800 mt-4 mb-1 block";
        const headingTag = `h${Math.min(level + 1, 6)}`;
        return `<${headingTag} class="${headingClass}" ${attrs}>${content}</${headingTag}>`;
    });
};

export const isHtmlEmpty = (html) => {
    if (!html) return true;
    const clean = String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    return clean.length === 0;
};

export const estimateBlockHeight = (rawText) => {
    if (!rawText) return 0;
    const isHtml = rawText.includes('<') && rawText.includes('>');
    
    const estimateTextNodeHeight = (text) => {
        if (!text) return 0;
        const paragraphs = text.split('\n');
        let h = 0;
        paragraphs.forEach(p => {
            const trimmed = p.trim();
            if (!trimmed) {
                h += 28; // Empty paragraph height (1.2rem + margin)
            } else if (trimmed.match(/^[-*_]{3,}$/)) {
                h += 40; // Horizontal rule
            } else {
                const headingMatch = trimmed.match(/^(#{1,6})(?:\s|&nbsp;|\u00a0)+(.*)$/);
                if (headingMatch) {
                    const level = headingMatch[1].length;
                    const hText = headingMatch[2];
                    const lineCount = Math.max(1, Math.ceil(hText.length / 85));
                    h += level <= 2 ? (lineCount * 22 + 28) : (lineCount * 18 + 16);
                } else if (trimmed.match(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/)) {
                    const liText = trimmed.replace(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/, '');
                    const lineCount = Math.max(1, Math.ceil(liText.length / 90));
                    h += (lineCount * 20) + 4;
                } else {
                    const lineCount = Math.max(1, Math.ceil(trimmed.length / 95));
                    h += (lineCount * 21) + 8;
                }
            }
        });
        return h;
    };

    if (!isHtml) {
        return estimateTextNodeHeight(rawText);
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${rawText}</div>`, 'text/html');
        const container = doc.body.firstElementChild || doc.body;
        let totalH = 0;

        const processNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                if (text) {
                    totalH += estimateTextNodeHeight(text);
                }
                return;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) return;

            const tag = node.tagName.toLowerCase();
            if (tag === 'p' || tag === 'div') {
                const html = node.innerHTML.trim();
                if (!html || html === '<br>' || html === '<br/>' || html === '<br />') {
                    totalH += 28;
                } else {
                    const parts = html.split(/<br\s*\/?>/gi);
                    parts.forEach((part, partIdx) => {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = part;
                        const text = tempDiv.textContent.trim();
                        if (text) {
                            const lineCount = Math.max(1, Math.ceil(text.length / 95));
                            totalH += (lineCount * 21);
                        } else {
                            if (partIdx > 0 || parts.length > 1) {
                                totalH += 21; // Empty line via br
                            }
                        }
                    });
                    totalH += 8; // Margin bottom
                }
            } else if (tag.startsWith('h') && tag.length === 2) {
                const level = parseInt(tag.substring(1)) || 2;
                const text = node.textContent.trim();
                const lineCount = Math.max(1, Math.ceil(text.length / 85));
                totalH += level <= 2 ? (lineCount * 22 + 28) : (lineCount * 18 + 16);
            } else if (tag === 'ul' || tag === 'ol') {
                totalH += 12; // Wrapper margin
                const lis = node.querySelectorAll('li');
                if (lis.length > 0) {
                    lis.forEach(li => {
                        const liText = li.textContent.trim();
                        const lineCount = Math.max(1, Math.ceil(liText.length / 90));
                        totalH += (lineCount * 20) + 4;
                    });
                } else {
                    const text = node.textContent.trim();
                    const lineCount = Math.max(1, Math.ceil(text.length / 90));
                    totalH += (lineCount * 20) + 4;
                }
            } else if (tag === 'br') {
                totalH += 21;
            } else {
                const hasBlockChildren = Array.from(node.children).some(c => 
                    ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol'].includes(c.tagName.toLowerCase())
                );
                if (hasBlockChildren) {
                    Array.from(node.childNodes).forEach(processNode);
                } else {
                    const text = node.textContent.trim();
                    if (text) {
                        const lineCount = Math.max(1, Math.ceil(text.length / 95));
                        totalH += (lineCount * 21) + 8;
                    }
                }
            }
        };

        Array.from(container.childNodes).forEach(processNode);
        return totalH;
    } catch (e) {
        console.error("HTML estimation failed, fallback:", e);
        return estimateTextNodeHeight(htmlToPlainText(rawText));
    }
};

export const splitTextIntoPages = (rawText, maxPageHeight = 800) => {
    if (!rawText) return [''];
    
    // First, split by manual page breaks
    const pageBreakRegex = /<div[^>]*class="[^"]*page-break[^"]*"[^>]*><\/div>/gi;
    const manualPages = rawText.split(pageBreakRegex);
    
    const finalPages = [];
    
    const splitSinglePageByHeight = (pageContent) => {
        if (!pageContent) return [''];
        if (estimateBlockHeight(pageContent) <= maxPageHeight) {
            return [pageContent];
        }
        
        const isHtml = pageContent.includes('<') && pageContent.includes('>');
        
        if (!isHtml) {
            const lines = pageContent.split('\n');
            const pages = [];
            let currentPageText = '';
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const testText = currentPageText ? currentPageText + '\n' + line : line;
                if (estimateBlockHeight(testText) > maxPageHeight) {
                    if (currentPageText) {
                        pages.push(currentPageText);
                        currentPageText = line;
                    } else {
                        pages.push(line);
                        currentPageText = '';
                    }
                } else {
                    currentPageText = testText;
                }
            }
            if (currentPageText) {
                pages.push(currentPageText);
            }
            return pages;
        }
        
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(`<div>${pageContent}</div>`, 'text/html');
            const container = doc.body.firstElementChild || doc.body;
            const blocks = Array.from(container.childNodes);
            
            const pages = [];
            let currentPageDiv = document.createElement('div');
            
            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i].cloneNode(true);
                const testDiv = currentPageDiv.cloneNode(true);
                testDiv.appendChild(block.cloneNode(true));
                
                if (estimateBlockHeight(testDiv.innerHTML) > maxPageHeight) {
                    const blockTag = block.nodeType === Node.ELEMENT_NODE ? block.tagName.toLowerCase() : '';
                    if (blockTag === 'p' || blockTag === 'div') {
                        const html = block.innerHTML;
                        const brParts = html.split(/<br\s*\/?>/gi);
                        
                        if (brParts.length > 1) {
                            let partDiv = document.createElement(blockTag);
                            for (let j = 0; j < brParts.length; j++) {
                                const part = brParts[j];
                                const lineTestDiv = currentPageDiv.cloneNode(true);
                                const lineTestBlock = partDiv.cloneNode(true);
                                if (j > 0) lineTestBlock.innerHTML += '<br>' + part;
                                else lineTestBlock.innerHTML = part;
                                lineTestDiv.appendChild(lineTestBlock);
                                
                                if (estimateBlockHeight(lineTestDiv.innerHTML) > maxPageHeight) {
                                    if (currentPageDiv.innerHTML.trim()) {
                                        pages.push(currentPageDiv.innerHTML);
                                    }
                                    currentPageDiv = document.createElement('div');
                                    partDiv = document.createElement(blockTag);
                                    partDiv.innerHTML = part;
                                    currentPageDiv.appendChild(partDiv);
                                } else {
                                    partDiv.innerHTML = lineTestBlock.innerHTML;
                                }
                            }
                            if (partDiv.innerHTML.trim()) {
                                if (currentPageDiv.innerHTML.indexOf(partDiv.outerHTML) === -1) {
                                    currentPageDiv.appendChild(partDiv);
                                }
                            }
                            continue;
                        }
                    }
                    
                    if (currentPageDiv.innerHTML.trim()) {
                        pages.push(currentPageDiv.innerHTML);
                    }
                    currentPageDiv = document.createElement('div');
                    currentPageDiv.appendChild(block);
                } else {
                    currentPageDiv.appendChild(block);
                }
            }
            if (currentPageDiv.innerHTML.trim()) {
                pages.push(currentPageDiv.innerHTML);
            }
            return pages;
        } catch (e) {
            console.error("Error splitting HTML by height:", e);
            return [pageContent];
        }
    };
    
    manualPages.forEach(p => {
        const subPages = splitSinglePageByHeight(p);
        finalPages.push(...subPages);
    });
    
    return finalPages;
};
