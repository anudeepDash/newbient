import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Layers from 'lucide-react/dist/esm/icons/layers';
import { Card, Button } from '../../../components/app';
import { campaignCard } from '../../cards';
import { appPath } from '../../host';
import { CardGrid, EmptyState } from '../../pages/parts';
import { ChoiceChip } from '../ui';
import { useT } from '../../../i18n';
import { useLocalizedCampaigns } from '../../../i18n/useHinglish';

/*
 * Deliverables: campaigns you applied to or were picked for.
 *   In progress  picked, required tasks not all approved
 *   Applied      waiting to hear back
 *   Completed    every required task approved
 */

const stageOf = ({ shortlisted, progress }) => (progress.requiredDone ? 'done' : shortlisted ? 'active' : 'applied');

const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'In progress' },
    { id: 'applied', label: 'Applied' },
    { id: 'done', label: 'Completed' },
];

const DeliverablesTab = ({ mine }) => {
    const t = useT();
    const location = useLocation();
    const [filter, setFilter] = useState('all');
    const counts = useMemo(() => mine.reduce((acc, m) => ({ ...acc, [stageOf(m)]: (acc[stageOf(m)] || 0) + 1 }), {}), [mine]);
    // Your turn first: picked campaigns with tasks to do, then the rest.
    const sorted = useMemo(() => [...mine].sort((a, b) => {
        const order = { active: 0, applied: 1, done: 2 };
        return (order[stageOf(a)] - order[stageOf(b)]) || (b.progress.todo - a.progress.todo);
    }), [mine]);
    const shownRaw = filter === 'all' ? sorted : sorted.filter(m => stageOf(m) === filter);
    const shownCampaigns = useLocalizedCampaigns(shownRaw.map(m => m.campaign), { fields: ['title', 'reward', 'description'] });
    const shown = shownRaw.map((m, i) => (shownCampaigns[i] === m.campaign ? m : { ...m, campaign: shownCampaigns[i] }));

    if (!mine.length) {
        return (
            <EmptyState
                icon={Layers}
                title={t('No campaigns yet')}
                message={t('Apply to an open campaign and its deliverables show up here.')}
                action={<Button variant="secondary" to={appPath('/creator')}>{t('See openings')}</Button>}
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
                {FILTERS.filter(f => f.id === 'all' || counts[f.id]).map(f => (
                    <ChoiceChip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)} className="shrink-0 whitespace-nowrap py-2">
                        {t(f.label)}{f.id !== 'all' && counts[f.id] ? ` · ${counts[f.id]}` : ''}
                    </ChoiceChip>
                ))}
            </div>
            <CardGrid>
                {shown.map(({ campaign, progress, shortlisted }) => {
                    const card = campaignCard(campaign, { applied: true, from: location, progress: shortlisted ? progress : null });
                    const stage = stageOf({ shortlisted, progress });
                    const label = stage === 'done' ? t('Completed')
                        : stage === 'active' ? (progress.todo ? t('{n} to do', { n: progress.todo }) : progress.submitted ? t('In review') : t('In progress'))
                            : t('Waiting to hear back');
                    return <Card key={campaign.id} {...card} cta={{ label }} />;
                })}
            </CardGrid>
        </div>
    );
};

export default DeliverablesTab;
