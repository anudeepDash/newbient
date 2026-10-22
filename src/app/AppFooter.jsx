import React from 'react';
import { landingUrl } from './host';
import { openConsentSettings } from '../lib/consent';
import { useT } from '../i18n';

/*
 * The app's small footer, under every page: who runs Newbi and the legal links
 * (the policies live on newbi.live), plus a way back into the cookie settings.
 */

const link = 'inline-flex min-h-[44px] items-center px-2 text-[13px] font-semibold text-gray-500 transition-colors hover:text-gray-900 dark:text-zinc-500 dark:hover:text-white';

const AppFooter = () => {
    const t = useT();
    return (
        <footer className="mx-auto mt-12 max-w-6xl px-4 lg:px-8">
            <div className="flex flex-col items-center gap-1 border-t border-black/[0.06] pt-4 text-center dark:border-white/[0.06] sm:flex-row sm:justify-between sm:text-left">
                <div className="text-[12px] text-gray-500 dark:text-zinc-500">
                    <p>© {new Date().getFullYear()} newbi.live. All rights reserved. {t('We never sell your data.')}</p>
                    <p>newbi.live is owned and operated by Newbi Entertainment &amp; Marketing LLP.</p>
                </div>
                <nav aria-label={t('Legal')} className="-mx-2 flex flex-wrap justify-center">
                    <a href={landingUrl('/privacy')} className={link}>{t('Privacy')}</a>
                    <a href={landingUrl('/terms')} className={link}>{t('Terms')}</a>
                    <button type="button" onClick={openConsentSettings} className={link}>{t('Cookie settings')}</button>
                    <a href={landingUrl('/contact')} className={link}>{t('Contact')}</a>
                </nav>
            </div>
        </footer>
    );
};

export default AppFooter;
