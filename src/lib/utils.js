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

export function normalizePhoneNumber(phone) {
    if (!phone) return '';
    const digits = phone.toString().replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function getCampaignSpotsInfo(campaign, creators = []) {
    if (!campaign) {
        return {
            hasSpots: false,
            totalSpots: null,
            spotsLeft: null,
            appliedCount: 0,
            isFull: false
        };
    }

    const appliedCount = Array.isArray(creators)
        ? creators.filter(c => (c.joinedCampaigns || []).includes(campaign.id)).length
        : (campaign.appliedCount || 0);

    const hasExplicitSpotsLeft = campaign.spotsLeft !== undefined && campaign.spotsLeft !== '' && campaign.spotsLeft !== null && !isNaN(Number(campaign.spotsLeft));
    const hasTotalSpots = campaign.totalSpots !== undefined && campaign.totalSpots !== '' && campaign.totalSpots !== null && !isNaN(Number(campaign.totalSpots)) && Number(campaign.totalSpots) > 0;

    if (!hasExplicitSpotsLeft && !hasTotalSpots) {
        return {
            hasSpots: false,
            totalSpots: null,
            spotsLeft: null,
            appliedCount,
            isFull: false
        };
    }

    const totalSpots = hasTotalSpots ? Number(campaign.totalSpots) : null;
    let spotsLeft;

    if (hasExplicitSpotsLeft) {
        spotsLeft = Math.max(0, Number(campaign.spotsLeft));
    } else {
        spotsLeft = Math.max(0, totalSpots - appliedCount);
    }

    return {
        hasSpots: true,
        totalSpots,
        spotsLeft,
        appliedCount,
        isFull: spotsLeft <= 0
    };
}


