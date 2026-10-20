import React, { useEffect, useState } from 'react';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import { Button, Sheet } from '../../../components/app';
import { useT } from '../../../i18n';

/*
 * A campaign's Google Form, with the creator's details already filled in
 * where the form asks for them.
 *
 *   Embedded   inside the app (Google's embedded view), with a link out in
 *              case it doesn't load.
 *   External   for forms that need a Google sign-in (file uploads), which
 *              Google won't show inside another site: the form opens in a new
 *              tab and this sheet waits for "I've sent the form".
 *
 * After sending it, a creator taps "I've sent the form" so the campaign shows
 * them as applied.
 */
const GoogleFormSheet = ({ open, onClose, title, embedUrl, openUrl, external = false, canMarkApplied, marking, onSent }) => {
    const t = useT();
    const [loaded, setLoaded] = useState(false);
    useEffect(() => { if (open) setLoaded(false); }, [open, embedUrl]);

    const footer = (
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
            {canMarkApplied ? (
                <Button className="w-full sm:flex-1" size="lg" icon={CircleCheck} loading={marking} onClick={onSent}>{t('I’ve sent the form')}</Button>
            ) : (
                <Button className="w-full sm:flex-1" size="lg" onClick={onClose}>{t('Done')}</Button>
            )}
            {openUrl && !external && (
                <Button className="w-full sm:w-auto" size="lg" variant="secondary" icon={ExternalLink} href={openUrl} target="_blank" rel="noopener noreferrer">{t('Open in Google Forms')}</Button>
            )}
        </div>
    );

    if (external) {
        return (
            <Sheet open={open} onClose={onClose} width="sm" title={t('Apply with the form')} subtitle={title} footer={footer}>
                <div className="space-y-4 py-2 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neon-green text-black shadow-[0_8px_24px_-8px_rgba(57,255,20,0.8)]"><FileText size={24} /></span>
                    <p className="text-[15px] text-gray-700 dark:text-zinc-300">{t('The form opened in a new tab. It needs a Google sign-in. Come back here once you’ve sent it.')}</p>
                    {openUrl && <Button variant="secondary" icon={ExternalLink} href={openUrl} target="_blank" rel="noopener noreferrer">{t('Open the form again')}</Button>}
                </div>
            </Sheet>
        );
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            size="full"
            width="lg"
            title={t('Apply with the form')}
            subtitle={title}
            bodyClassName="px-0 pb-0 sm:px-0"
            footer={footer}
        >
            <div className="flex h-full min-h-[60dvh] flex-col md:min-h-[62dvh]">
                {openUrl && (
                    <p className="shrink-0 border-b border-black/[0.06] px-5 py-2 text-[12px] text-gray-500 dark:border-white/[0.06] dark:text-zinc-400">
                        {t('Not loading?')} <a href={openUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-gray-900 underline decoration-neon-green decoration-2 underline-offset-2 dark:text-white">{t('Open it in Google Forms')}</a>
                    </p>
                )}
                <div className="relative flex-1 bg-white">
                    {!loaded && (
                        <div className="absolute inset-0 space-y-4 p-6" aria-hidden="true">
                            <div className="h-24 animate-pulse rounded-2xl bg-black/[0.05]" />
                            <div className="h-16 animate-pulse rounded-2xl bg-black/[0.04]" />
                            <div className="h-16 animate-pulse rounded-2xl bg-black/[0.04]" />
                        </div>
                    )}
                    {open && embedUrl && (
                        <iframe
                            title={t('Application form: {title}', { title: title || t('campaign') })}
                            src={embedUrl}
                            onLoad={() => setLoaded(true)}
                            className="absolute inset-0 h-full w-full border-0"
                        />
                    )}
                </div>
            </div>
        </Sheet>
    );
};

export default GoogleFormSheet;
