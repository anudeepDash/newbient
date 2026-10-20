import { useEffect } from 'react';
import { useAppStore } from '../lib/store/appStore';
import { appPath } from './host';
import { fetchAppFeed } from '../lib/appFeed';

/*
 * Loads the public content the app pages show (open campaigns and the
 * community feed). Each is one cached read; calling this from several pages
 * doesn't refetch. The feed reloads after sign-in, when guestlists open up.
 * Both come from the server's cached app feed, requested straight away so it
 * doesn't wait for sign-in to settle.
 */
export function useAppContent({ campaigns = true, feed = true } = {}) {
    const uid = useAppStore(s => s.authUser?.uid || null);
    const authReady = useAppStore(s => s.authReady);
    useEffect(() => {
        if (feed && !useAppStore.getState().communityFeedLoaded) fetchAppFeed();
    }, [feed]);
    useEffect(() => {
        if (campaigns) useAppStore.getState().loadOpenCampaigns();
    }, [campaigns]);
    useEffect(() => {
        if (feed && authReady) useAppStore.getState().loadCommunityFeed(appPath);
    }, [feed, uid, authReady]);
}
