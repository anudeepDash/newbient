import React from 'react';
import { cityGroupFor } from '../../../lib/outreach/cityGroups';
import { usePublicFeed } from '../../usePublicFeed';
import WhatsAppGroupCard, { useJoinedGroups } from '../../community/WhatsAppGroupCard';
import { creatorCity } from '../useCreatorData';
import { useT } from '../../../i18n';

/*
 * The creator's city WhatsApp community on the Openings tab, from the
 * admin's Groups page (via the public feed). Hidden once they say they joined.
 */
const CityGroupBanner = ({ creator, profile }) => {
    const t = useT();
    const feed = usePublicFeed();
    const { isJoined, markJoined } = useJoinedGroups();
    if (!feed || creator.profileStatus === 'rejected' || creator.profileStatus === 'suspended') return null;
    const group = cityGroupFor(feed.creatorGroups, creatorCity(creator, profile));
    if (!group || isJoined(group.url)) return null;
    return (
        <WhatsAppGroupCard
            url={group.url}
            eyebrow={t('Your city group')}
            title={t('Join the {city} creators community', { city: group.city })}
            body={t('Paid gigs, guestlist passes and meetups in {city} drop there first.', { city: group.city })}
            onJoined={markJoined}
        />
    );
};

export default CityGroupBanner;
