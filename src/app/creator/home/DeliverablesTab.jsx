import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Layers from 'lucide-react/dist/esm/icons/layers';
import { Card, Button } from '../../../components/app';
import { campaignCard } from '../../cards';
import { appPath } from '../../host';
import { CardGrid, EmptyState } from '../../pages/parts';
import { ChoiceChip } from '../ui';

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
    const location = useLocation();
    const [filter, setFilter] = useState('all');
    const counts = useMemo(() => mine.reduce((acc, m) => ({ ...acc, [stageOf(m)]: (acc[stageOf(m)] || 0) + 1 }), {}), [mine]);
    // Your turn first: picked campaigns with tasks to do, then the rest.
    const sorted = useMemo(() => [...mine].sort((a, b) => {
        const order = { active: 0, applied: 1, done: 2 };
        return (order[stageOf(a)] - order[stageOf(b)]) || (b.progress.todo - a.progress.todo);
    }), [mine]);
    const shown = filter === 'all' ? sorted : sorted.filter(m => stageOf(m) === filter);

    if (!mine.length) {
        return (
            <EmptyState
                icon={Layers}
                title="No campaigns yet"
                message="Apply to an open campaign and its deliverables show up here."
                action={<Button variant="secondary" to={appPath('/creator')}>See openings</Button>}
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
                {FILTERS.filter(f => f.id === 'all' || counts[f.id]).map(f => (
                    <ChoiceChip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)} className="shrink-0 whitespace-nowrap py-2">
                        {f.label}{f.id !== 'all' && counts[f.id] ? ` · ${counts[f.id]}` : ''}
                    </ChoiceChip>
                ))}
            </div>
            <CardGrid>
                {shown.map(({ campaign, progress, shortlisted }) => {
                    const card = campaignCard(campaign, { applied: true, from: location, progress: shortlisted ? progress : null });
                    const stage = stageOf({ shortlisted, progress });
                    const label = stage === 'done' ? 'Completed'
                        : stage === 'active' ? (progress.todo ? `${progress.todo} to do` : progress.submitted ? 'In review' : 'In progress')
                            : 'Waiting to hear back';
                    return <Card key={campaign.id} {...card} cta={{ label }} />;
                })}
            </CardGrid>
        </div>
    );
};

export default DeliverablesTab;
