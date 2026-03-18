/**
 * Generates structured meta tags for an event.
 * @param {Object} event - The event data from Firestore.
 * @param {string} baseUrl - The base URL of the site (e.g., https://newbi.live).
 * @returns {Object} Structured meta tags.
 */
export const generateMetaTags = (event, baseUrl = 'https://newbi.live') => {
    const title = event?.title || 'Newbi Entertainment & Marketing';
    const city = event?.city || '';
    const fullTitle = city ? `${title} | ${city}` : title;
    
    // Description: Truncate to ~150 chars
    const rawDesc = event?.description || 'Experience the pulse of entertainment with Newbi.';
    const artists = Array.isArray(event?.artists) ? event.artists.join(', ') : '';
    const date = event?.date ? new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
    
    let description = rawDesc;
    if (artists && date) {
        description = `Featuring ${artists} on ${date}. ${rawDesc}`;
    }
    
    if (description.length > 155) {
        description = description.substring(0, 152) + '...';
    }

    const image = event?.image || `${baseUrl}/logo.png`; // Fallback to logo
    const url = event?.id ? `${baseUrl}/?event=${event.id}` : baseUrl;

    return {
        title: fullTitle,
        description,
        image: image.startsWith('http') ? image : `${baseUrl}${image}`,
        url,
        type: 'website',
        twitterCard: 'summary_large_image'
    };
};
