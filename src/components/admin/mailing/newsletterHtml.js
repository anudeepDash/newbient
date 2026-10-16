import { generateWeeklyHTML } from '../../../lib/email';

/*
 * The weekly newsletter email (Weekly by Concert Zone). The markup below is the
 * product's email design, moved here unchanged from the old studio page so the
 * studio, its preview and "retry failed" all build the same email.
 */

const trimDescription = (text, limit = 160) => {
    if (!text) return "";
    const cleanText = text.replace(/<[^>]*>?/gm, '');
    return cleanText.length > limit ? cleanText.substring(0, limit) + '...' : cleanText;
};

export const defaultNewsletterSummary = (selectedPosts = []) => (selectedPosts[0]
    ? `FEATURING: ${String(selectedPosts[0].title || '').toUpperCase()}`
    : "THE DEFINITIVE WEEKLY BRIEFING");

/**
 * selectedPosts: published posts, the first is the featured story.
 * isPreview: true for the in-app preview (no dark-mode media queries).
 */
export const buildNewsletterHtml = ({ selectedPosts = [], theme = 'light', editorialText = '', commercialContent = '', summary = '', isPreview = false }) => {
    const mainPost = selectedPosts[0];
    const otherPosts = selectedPosts.slice(1);
    const isDark = theme === 'dark';
    const accent = isDark ? '#00f2ff' : '#008899';
    const borderColor = isDark ? '#1e293b' : '#e5e7eb';
    const cardBg = isDark ? '#111111' : '#ffffff';
    const textColor = isDark ? '#f8fafc' : '#111111';
    const subTextColor = isDark ? '#94a3b8' : '#4b5563';

    const innerContent = `
        <!-- Lead Editorial Briefing -->
        ${editorialText ? `
            <div class="responsive-px mobile-mx-10" style="margin-bottom: 30px; padding-top: 30px; padding-bottom: 30px; background: ${isDark ? '#0a0a0a' : '#f9fafb'}; border-radius: 24px; border: 1px solid ${borderColor};">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
                    <h3 style="font-size: 10px; font-weight: 900; color: ${accent}; text-transform: uppercase; letter-spacing: 4px; margin: 0;">EDITORIAL BRIEFING</h3>
                    <div style="flex: 1; height: 1px; background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};"></div>
                </div>
                <div style="font-size: 15px; line-height: 1.8; color: ${textColor} !important; font-family: Georgia, serif;">
                    ${editorialText}
                </div>
            </div>
        ` : ''}

        <!-- Primary Featured Story -->
        ${mainPost ? `
            <div class="responsive-px mobile-mx-10" style="margin-bottom: 30px;">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
                    <h3 style="font-size: 10px; font-weight: 900; color: ${accent}; text-transform: uppercase; letter-spacing: 4px; margin: 0;">FEATURED STORY</h3>
                    <div style="flex: 1; height: 1px; background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};"></div>
                </div>
                <div class="story-card" style="background: ${cardBg}; border: 1px solid ${borderColor}; border-radius: 24px; overflow: hidden; display: block; text-decoration: none;">
                    <div style="position: relative; height: 200px; overflow: hidden; background: #000;">
                        <img src="${mainPost.coverImage}" style="width: 100%; height: 100%; object-fit: cover; filter: ${isDark ? 'brightness(0.85)' : 'none'};" />
                        <div style="position: absolute; top: 15px; left: 15px;">
                            <span style="background: ${accent}; padding: 4px 10px; font-size: 9px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: 2px; border-radius: 6px;">${mainPost.category || 'FEATURE'}</span>
                        </div>
                    </div>
                    <div style="padding: 24px;">
                        <h2 style="font-size: 24px; font-weight: 900; margin: 0 0 12px 0; line-height: 1.2; text-transform: uppercase; font-style: italic; letter-spacing: -0.5px; color: ${textColor} !important;">${mainPost.title}</h2>
                        <p style="font-size: 14px; line-height: 1.6; color: ${subTextColor} !important; margin: 0 0 20px 0;">${trimDescription(mainPost.shortDescription || mainPost.content || "Experience the latest news from Concert Zone.", 160)}</p>
                        <a href="https://newbi.live/concertzone/${mainPost.category?.toLowerCase().replace(' ', '-')}/${mainPost.slug}" style="display: inline-block; color: ${accent}; text-decoration: none; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid ${accent}; padding-bottom: 2px;">READ STORY →</a>
                    </div>
                </div>
            </div>
        ` : ''}

        <!-- Other Stories Stack -->
        ${otherPosts.length > 0 ? `
            <div class="responsive-px mobile-mx-10" style="margin-bottom: 30px;">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
                    <h3 style="font-size: 10px; font-weight: 900; color: ${accent}; text-transform: uppercase; letter-spacing: 4px; margin: 0;">WEEKLY HIGHLIGHTS</h3>
                    <div style="flex: 1; height: 1px; background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};"></div>
                </div>
                
                ${otherPosts.map(post => `
                    <div class="story-card" style="background: ${cardBg}; border: 1px solid ${borderColor}; border-radius: 16px; margin-bottom: 16px; overflow: hidden;">
                        <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                            <tr>
                                <!-- Thumbnail Column -->
                                <td width="90" style="vertical-align: middle; padding: 12px; width: 90px; height: 90px;">
                                    <div style="width: 80px; height: 80px; border-radius: 10px; overflow: hidden; background: #000;">
                                        <img src="${post.coverImage}" style="width: 100%; height: 100%; object-fit: cover; display: block; filter: ${isDark ? 'brightness(0.85)' : 'none'};" />
                                    </div>
                                </td>
                                <!-- Details Column -->
                                <td style="vertical-align: middle; padding: 12px 16px 12px 4px;">
                                    <div style="font-size: 8px; font-weight: 900; color: ${accent}; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">${post.category || 'HIGHLIGHT'}</div>
                                    <h4 style="font-size: 15px; font-weight: 800; margin: 0 0 8px 0; line-height: 1.25; color: ${textColor} !important; text-transform: uppercase; font-style: italic;">${post.title}</h4>
                                    <a href="https://newbi.live/concertzone/${post.category?.toLowerCase().replace(' ', '-')}/${post.slug}" style="font-size: 10px; font-weight: 800; color: ${accent}; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px;">EXPLORE →</a>
                                </td>
                            </tr>
                        </table>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <!-- Interactive details FAQ/Feedback block -->
        <div class="responsive-px mobile-mx-10" style="margin-bottom: 30px;">
            <details style="background: ${isDark ? '#0a0a0a' : '#f9fafb'}; border: 1px solid ${borderColor}; border-radius: 16px; padding: 16px; margin: 0;">
                <summary style="font-weight: 800; font-size: 11px; letter-spacing: 2px; color: ${accent}; text-transform: uppercase; cursor: pointer;">COULD CONCERT ZONE IMPROVE?</summary>
                <p style="font-size: 13px; line-height: 1.6; color: ${subTextColor} !important; margin: 12px 0 0 0;">
                    We want to hear from you. Reply directly to this briefing or email us at <a href="mailto:weekly@newbi.live" style="color: ${accent}; font-weight: 700; text-decoration: none;">weekly@newbi.live</a> with your feedback or stories you want us to cover.
                </p>
            </details>
        </div>

        <!-- Commercial Ad -->
        ${commercialContent ? `
            <div class="responsive-px mobile-mx-10" style="padding: 30px 24px; background: ${isDark ? '#0a0a0a' : '#f9fafb'}; border-radius: 24px; border: 1px solid ${borderColor}; text-align: center; margin-bottom: 20px;">
                <div style="font-size: 8px; font-weight: 900; color: ${isDark ? '#444' : '#bbb'}; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 16px;">SPONSORED BRIEFING</div>
                <div style="font-size: 13px; line-height: 1.7; color: ${subTextColor}; font-style: italic; max-width: 480px; margin: 0 auto;">
                    ${commercialContent}
                </div>
            </div>
        ` : ''}
    `;

    return generateWeeklyHTML({
        summary: (summary || '').trim() || defaultNewsletterSummary(selectedPosts),
        messageBody: innerContent,
        theme,
        isPreview,
    });
};
