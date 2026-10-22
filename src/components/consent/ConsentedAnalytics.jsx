import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { getConsent, useConsent } from '../../lib/consent';

/*
 * Vercel Web Analytics and Speed Insights (they only report on Vercel deployments),
 * loaded only once the visitor allows analytics. Each event checks again, so a "no"
 * given later stops reporting straight away, and URLs go without their query string
 * and hash (links can carry referral codes, pass refs or sign-in codes).
 */

const scrub = (event) => {
    if (!getConsent()?.analytics) return null;
    try {
        const url = new URL(event.url);
        url.search = '';
        url.hash = '';
        return { ...event, url: url.toString() };
    } catch {
        return event;
    }
};

export default function ConsentedAnalytics() {
    const consent = useConsent();
    if (!consent?.analytics) return null;
    return (
        <>
            <Analytics beforeSend={scrub} />
            <SpeedInsights beforeSend={scrub} />
        </>
    );
}
