import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../../lib/store/appStore';
import { appPath } from '../host';
import { callCreatorApi } from './api';
import { handleOf } from './format';
import { oauthErrorMessage } from './apply/instagramCopy';
import { useT } from '../../i18n';

/*
 * Whether the signed-in person can connect Instagram: everyone once the Meta
 * switch is on, before that only the accounts on the early-access list. The
 * server decides (ig-lookup's `oauthReady`); asked once per account.
 */
const readyByUid = new Map();
export function useConnectReady() {
    const uid = useAppStore(s => s.authUser?.uid || null);
    const [ready, setReady] = useState(() => Boolean(uid && readyByUid.get(uid)));
    useEffect(() => {
        if (!uid) { setReady(false); return undefined; }
        if (readyByUid.has(uid)) { setReady(readyByUid.get(uid)); return undefined; }
        let live = true;
        callCreatorApi('ig-lookup', {}, { timeoutMs: 8000 }).then((res) => {
            const ok = Boolean(res.ok && res.data?.oauthReady);
            if (res.ok) readyByUid.set(uid, ok);
            if (live) setReady(ok);
        });
        return () => { live = false; };
    }, [uid]);
    return ready;
}

/*
 * Connecting Instagram from a creator page: `connect` sends the creator to
 * Instagram and back to `returnPath`, and on the way back the ?ig=… result
 * becomes `message` (then leaves the URL). `available` is false when this
 * person can't connect yet or is already connected.
 */
export function useInstagramConnect({ creator, returnPath }) {
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

    const ready = useConnectReady();
    const available = ready && creator?.instagramVerifiedVia !== 'oauth';
    return { available, connect, busy, message };
}
