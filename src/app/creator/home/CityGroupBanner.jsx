import React from 'react';
import { isPresent } from '../../../lib/present';
import { cityGroupFor } from '../../../lib/outreach/cityGroups';
import { usePublicFeed } from '../../usePublicFeed';
import WhatsAppGroupCard, { useJoinedGroups } from '../../community/WhatsAppGroupCard';
import { creatorCity } from '../useCreatorData';
import { useT } from '../../../i18n';

/*
 * The creator's city WhatsApp community, above the dashboard tabs, from the
 * admin's Groups page (via the public feed) or the built-in groups. A city
 * without a group yet gets the Newbi WhatsApp community instead. Hidden once
 * they say they joined.
 */
const CityGroupBanner = ({ creator, profile }) => {
    const t = useT();
    const feed = usePublicFeed();
    const { isJoined, markJoined } = useJoinedGroups();
    if (!feed || creator.profileStatus === 'rejected' || creator.profileStatus === 'suspended') return null;
    const city = creatorCity(creator, profile);
    const group = cityGroupFor(feed.creatorGroups, city, { withDefaults: true });
    const community = feed.contact?.whatsappCommunity;

    const card = group ? {
        url: group.url,
        eyebrow: t('Your city group'),
        title: t('Join the {city} creators community', { city: group.city }),
        body: t('Paid gigs, guestlist passes and meetups in {city} drop there first.', { city: group.city }),
    } : isPresent(community) ? {
        url: community,
        eyebrow: t('Newbi on WhatsApp'),
        title: t('Join the Newbi creators community'),
        body: city
            ? t('There’s no {city} group yet. Campaigns, passes and meetups are shared here until there is.', { city })
            : t('Campaigns, guestlist passes and meetups are shared here first.'),
    } : null;
    if (!card || isJoined(card.url)) return null;
    return <WhatsAppGroupCard {...card} onJoined={markJoined} />;
};

export default CityGroupBanner;
