import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { appPath } from '../host';
import { callCreatorApi } from './api';
import { handleOf } from './format';
import { oauthErrorMessage } from './apply/instagramCopy';
import { useT } from '../../i18n';

/*
 * Connecting Instagram from a creator page: `connect` sends the creator to
 * Instagram and back to `returnPath`, and on the way back the ?ig=… result
 * becomes `message` (then leaves the URL). `available` is false when connecting
 * is switched off or this creator is already connected.
 */
export function useInstagramConnect({ creator, settings, returnPath }) {
    const t = useT();
    const [params, setParams] = useSearchParams();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const ig = params.get('ig');
        if (!ig) return;
        setMessage(ig !== 'connected'
            ? { tone: 'error', text: oauthErrorMessage(params.get('reason'), params.get('handle')) }
            : params.get('approved')
                ? { tone: 'success', text: t('Instagram connected, and you’re verified. Your creator profile is live.') }
                : { tone: 'success', text: t('Instagram connected. Your follower count now comes straight from Instagram.') });
        const next = new URLSearchParams(params);
        ['ig', 'reason', 'handle', 'approved'].forEach(k => next.delete(k));
        setParams(next, { replace: true });
        // eslint-disable-next-line
    }, [params]);

    const connect = async () => {
        setBusy(true);
        const res = await callCreatorApi('ig-connect', { handle: handleOf(creator?.instagram), returnTo: appPath(returnPath), origin: window.location.origin });
        if (res.ok && res.data?.url) return window.location.assign(res.data.url);
        setBusy(false);
        setMessage({ tone: 'error', text: res.error });
        return undefined;
    };

    const available = Boolean(settings?.metaVerification) && creator?.instagramVerifiedVia !== 'oauth';
    return { available, connect, busy, message };
}
