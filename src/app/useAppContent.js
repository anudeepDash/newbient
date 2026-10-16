import { useEffect } from 'react';
import { useAppStore } from '../lib/store/appStore';
import { appPath } from './host';

/*
 * Loads the public content the app pages show (open campaigns and the
 * community feed). Each is one cached read; calling this from several pages
 * doesn't refetch. The feed reloads after sign-in, when guestlists open up.
 */
export function useAppContent({ campaigns = true, feed = true } = {}) {
    const uid = useAppStore(s => s.authUser?.uid || null);
    const authReady = useAppStore(s => s.authReady);
    useEffect(() => {
        if (campaigns) useAppStore.getState().loadOpenCampaigns();
    }, [campaigns]);
    useEffect(() => {
        if (feed && authReady) useAppStore.getState().loadCommunityFeed(appPath);
    }, [feed, uid, authReady]);
}
