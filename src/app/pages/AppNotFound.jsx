import React from 'react';
import { Button } from '../../components/app';
import { appPath } from '../host';
import { PageBody } from './PageHeader';
import { useT } from '../../i18n';

const AppNotFound = () => {
    const t = useT();
    return (
    <PageBody>
        <div className="mx-auto max-w-md space-y-4 py-16 text-center">
            <p className="font-heading text-6xl font-black">404</p>
            <p className="text-[15px] text-gray-600 dark:text-zinc-400">{t('We couldn’t find that page. It may have moved.')}</p>
            <Button to={appPath('/')}>{t('Go to Home')}</Button>
        </div>
    </PageBody>
    );
};

export default AppNotFound;
