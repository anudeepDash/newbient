import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Search from 'lucide-react/dist/esm/icons/search';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import { useAppStore } from '../../../lib/store/appStore';
import { isCampaignCityMatch } from '../../../lib/constants';
import { Card } from '../../../components/app';
import { campaignCard } from '../../cards';
import { CardGrid, CardSkeleton, EmptyState } from '../../pages/parts';
import { ChoiceChip } from '../ui';
import { isInCampaign, matchesCollege, creatorCity } from '../useCreatorData';
import { isTesterRole } from '../../../constants/roles';
import { useT } from '../../../i18n';
import { useLocalizedCampaigns } from '../../../i18n/useHinglish';

/* Openings: open campaigns you can apply to. Campaigns for another college are left out. */
const OpeningsTab = ({ creator }) => {
    const t = useT();
    const location = useLocation();
    const openCampaigns = useAppStore(s => s.openCampaigns);
    const campaigns = useLocalizedCampaigns(openCampaigns, { fields: ['title', 'reward', 'description'] });
    const loaded = useAppStore(s => s.campaignsLoaded);
    const profile = useAppStore(s => s.profile);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');

    const tester = isTesterRole(useAppStore(s => s.authUser?.role));
    const available = useMemo(() => campaigns.filter(c => tester || matchesCollege(c, creator, profile)), [campaigns, creator, profile, tester]);
    const city = creatorCity(creator, profile);
    const filters = [
        { id: 'all', label: t('All') },
        { id: 'new', label: t('Not applied') },
        city ? { id: 'city', label: t('In {city}', { city }) } : null,
    ].filter(Boolean);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return available.filter((c) => {
            if (filter === 'new' && isInCampaign(creator, c.id)) return false;
            // Campaigns aimed at your city (not the anywhere ones).
            if (filter === 'city' && (isCampaignCityMatch(c.targetCity, '') || !isCampaignCityMatch(c.targetCity, city))) return false;
            if (!q) return true;
            return [c.title, c.brand, c.targetCity, c.reward, c.description].some(v => String(v || '').toLowerCase().includes(q));
        });
    }, [available, filter, query, creator, city]);

    if (!loaded) return <CardGrid><CardSkeleton /><CardSkeleton /></CardGrid>;
    if (!available.length) {
        return <EmptyState icon={Megaphone} title={t('No open campaigns right now')} message={t('New brand and event campaigns show up here first.')} />;
    }

    return (
        <div className="space-y-4">
            {available.length > 4 && (
                <label className="flex h-12 items-center gap-2 rounded-2xl border border-black/[0.08] bg-white px-4 dark:border-white/[0.1] dark:bg-white/[0.04]">
                    <Search size={17} className="shrink-0 text-gray-400" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('Search campaigns')}
                        aria-label={t('Search campaigns')}
                        className="h-full w-full bg-transparent text-[16px] outline-none placeholder:text-gray-400"
                    />
                </label>
            )}
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
                {filters.map(f => (
                    <ChoiceChip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)} className="shrink-0 whitespace-nowrap py-2">{f.label}</ChoiceChip>
                ))}
            </div>
            {shown.length ? (
                <CardGrid>
                    {shown.map(c => <Card key={c.id} {...campaignCard(c, { applied: isInCampaign(creator, c.id), from: location })} />)}
                </CardGrid>
            ) : (
                <EmptyState icon={Search} title={t('Nothing matches')} message={t('Try another search or filter.')} />
            )}
        </div>
    );
};

export default OpeningsTab;
