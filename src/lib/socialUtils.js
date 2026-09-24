/**
 * Social Handle & Username Utilities
 * Enforces username-only submissions for creators across all platforms.
 * Creators are NEVER allowed to submit links themselves.
 */

/**
 * Extracts a clean username/handle from any input or pasted URL.
 * Strips protocols, domains, subpaths, query parameters, leading '@', and trailing slashes.
 * 
 * Examples:
 * - 'https://instagram.com/johndoe/?hl=en' -> 'johndoe'
 * - '@johndoe' -> 'johndoe'
 * - 'https://www.linkedin.com/in/johndoe/' -> 'johndoe'
 * - 'https://youtube.com/@channelname' -> 'channelname'
 * - 'https://x.com/handle?s=20' -> 'handle'
 */
export function extractSocialUsername(input, platform = 'general') {
    if (!input || typeof input !== 'string') return '';
    let val = input.trim();
    if (!val) return '';

    // Strip leading @ or /
    val = val.replace(/^[@/\s]+/, '');

    // If it's a URL or contains domain/slashes
    if (
        val.includes('/') || 
        val.includes('http://') || 
        val.includes('https://') || 
        val.includes('.com') || 
        val.includes('.be') || 
        val.includes('www.') ||
        val.includes('.in/') ||
        val.includes('?')
    ) {
        try {
            const urlStr = val.startsWith('http://') || val.startsWith('https://') ? val : `https://${val}`;
            const url = new URL(urlStr);
            const pathname = url.pathname.replace(/^\/+|\/+$/g, '');
            const segments = pathname.split('/').filter(Boolean);

            if (segments.length > 0) {
                let candidate = segments[segments.length - 1];

                // For LinkedIn: /in/username
                if (segments.length >= 2 && segments[0] === 'in') {
                    candidate = segments[1];
                }
                // For YouTube: /@channel or /c/channel or /user/channel
                if (segments.length >= 2 && (segments[0] === 'c' || segments[0] === 'user')) {
                    candidate = segments[1];
                }
                val = candidate;
            }
        } catch {
            // Fallback: strip query params, split by slashes
            const noQuery = val.split('?')[0].split('#')[0].replace(/\/+$/, '');
            const parts = noQuery.split('/').filter(Boolean);
            if (parts.length > 0) {
                val = parts[parts.length - 1];
            }
        }
    }

    // Clean up trailing characters, leading @, trailing slashes, query params
    val = val.split('?')[0].split('#')[0].replace(/^[@/\s]+|[/@#\s]+$/g, '').trim();

    return val;
}

/**
 * Checks if a string contains link/URL artifacts (http, https, www, domain extensions, or slashes)
 */
export function hasDisallowedLink(input) {
    if (!input || typeof input !== 'string') return false;
    const str = input.trim().toLowerCase();
    return str.startsWith('http://') || 
           str.startsWith('https://') || 
           str.startsWith('www.') || 
           str.includes('http:') ||
           str.includes('https:') ||
           str.includes('.com') || 
           str.includes('.net') || 
           str.includes('.org') || 
           str.includes('.io') || 
           str.includes('.me') || 
           str.includes('.in/') || 
           str.includes('/') ||
           str.includes('://');
}

/**
 * Validates that the username conforms to standard platform handle characters
 */
export function isValidUsername(username) {
    if (!username || typeof username !== 'string') return false;
    const clean = username.trim().replace(/^@/, '');
    // Standard alphanumeric, underscore, dot, hyphen (1 to 35 chars)
    return /^[a-zA-Z0-9._-]{1,35}$/.test(clean);
}

/**
 * Builds the canonical public URL for a platform using the verified username.
 * Creators never enter links; the system generates links from their username.
 */
export function buildSocialUrl(handleOrUrl, platform) {
    if (!handleOrUrl) return '';
    const clean = extractSocialUsername(handleOrUrl, platform);
    if (!clean) return '';
    
    switch (platform?.toLowerCase()) {
        case 'instagram':
            return `https://instagram.com/${clean}`;
        case 'youtube':
            return `https://youtube.com/@${clean}`;
        case 'linkedin':
            return `https://linkedin.com/in/${clean}`;
        case 'twitter':
        case 'x':
            return `https://x.com/${clean}`;
        default:
            return '';
    }
}
