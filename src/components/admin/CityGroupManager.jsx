import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { PREDEFINED_CITIES } from '../../lib/constants';
import { cn } from '../../lib/utils';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Eye from 'lucide-react/dist/esm/icons/eye';
import { accent } from './theme';
import { Button, Select } from './ui';
import CreatorGroupsPage from '../../pages/Admin/CreatorGroupsPage';
import CreatorCityGroupCard from '../creator/CreatorCityGroupCard';

/*
 * City creator groups, as a section (Site content uses it). The groups list,
 * invites and broadcasts are the same screen as Creators → Groups; below it is
 * a preview of the banner a creator sees for their city.
 *
 * Site content renders this inside its own <form>. Submits from the group
 * sheets are stopped here so they never save (or reload) that page.
 */
const CityGroupManager = () => {
    useStoreSubscription(['creatorGroups']);
    const groups = useStore(s => s.creatorGroups);
    const [previewCity, setPreviewCity] = useState('Bengaluru');

    const cityOptions = useMemo(() => {
        const set = new Set(PREDEFINED_CITIES.filter(c => c !== 'Others'));
        (groups || []).forEach(g => { if (g.city) set.add(g.city); });
        return [...set].map(c => ({ value: c, label: c }));
    }, [groups]);

    return (
        <section
            className="space-y-5"
            onSubmit={(e) => e.stopPropagation()}
            // Enter in the search box shouldn't submit a surrounding form.
            onKeyDown={(e) => { if (e.key === 'Enter' && e.target?.tagName === 'INPUT' && e.currentTarget.contains(e.target)) e.preventDefault(); }}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent('teal').chip)}><MessageCircle size={18} /></span>
                    <div className="min-w-0">
                        <h2 className="text-[17px] font-extrabold">City creator groups</h2>
                        <p className="text-[13px] text-gray-500">Shown when creators finish applying and in their dashboard until they join.</p>
                    </div>
                </div>
                <Button as={Link} to="/admin/creators/groups" variant="secondary" className="h-11"><ExternalLink size={14} /> Open in Creators</Button>
            </div>

            <CreatorGroupsPage />

            <div className="space-y-3 rounded-2xl border border-black/[0.06] bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-[15px] font-bold"><Eye size={15} className={accent('teal').text} /> What a creator sees</h3>
                        <p className="text-[12px] text-gray-500">The banner for a creator in the city you pick.</p>
                    </div>
                    <Select label="Preview city" value={previewCity} onChange={setPreviewCity} options={cityOptions} className="w-full sm:w-52" />
                </div>
                <CreatorCityGroupCard initialCity={previewCity} />
            </div>
        </section>
    );
};

export default CityGroupManager;
