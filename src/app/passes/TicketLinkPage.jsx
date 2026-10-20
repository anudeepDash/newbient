import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { passesGet } from '../../lib/passesApi';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { PageBody } from '../pages/PageHeader';
import PassView from './PassView';
import { AddToHomeHint, PassMissing, PassSkeleton } from './PassPage';
import { warmOfflineCache } from './offline';
import { useT } from '../../i18n';

/*
 * /t/:token: the "View ticket" link from WhatsApp and email. The signed token
 * opens that one ticket without signing in, and expires after a few weeks
 * (the ticket stays in the app, inside the campaign).
 */
const TicketLinkPage = () => {
    const t = useT();
    const { token } = useParams();
    const [pass, setPass] = useState(null);
    const [error, setError] = useState('');

    useDynamicMeta({ page: 'pass', title: t('Your ticket'), noindex: true });

    useEffect(() => {
        let cancelled = false;
        passesGet('open-token', { token }).then((res) => {
            if (cancelled) return;
            if (res.ok) setPass(res.data.pass);
            else setError(res.error);
        });
        return () => { cancelled = true; };
    }, [token]);

    useEffect(() => { if (pass) warmOfflineCache(); }, [pass]);

    return (
        <PageBody>
            {pass ? (
                <>
                    <PassView pass={pass} token={token} />
                    <AddToHomeHint />
                </>
            ) : error ? <PassMissing message={error} /> : <PassSkeleton />}
        </PageBody>
    );
};

export default TicketLinkPage;
