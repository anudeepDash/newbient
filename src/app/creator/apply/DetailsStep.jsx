import React from 'react';
import { TextInput } from '../../../components/app';
import { CREATOR_NICHE_OPTIONS, COLLAB_OPTIONS, RATE_OPTIONS, BIO_MAX, isCollegeNiche } from '../../../lib/creator/options';
import { ChoiceChip, FormBlock, TextArea } from '../ui';

/*
 * The creator details edited from the profile ("add later" after applying):
 * niches (up to 3), college for campus niches, how you work, rates, a bio
 * and other socials. Saved through the server, which keeps the status.
 *
 *   details: { niches, customNiche, cityPageFocus, collegeName, collaboration, commercials, bio, linkedin, youtube, twitter }
 */

const MAX_NICHES = 3;
const hasOthers = (d) => (d.niches || []).includes('Others');
const isCampus = (d) => (d.niches || []).some(isCollegeNiche);

export const validateDetails = (details, profileCollege) => {
    if (!(details.niches || []).length) return { field: 'niches', error: 'Pick at least one niche.' };
    if (hasOthers(details) && !String(details.customNiche || '').trim()) return { field: 'customNiche', error: 'Tell us your niche.' };
    if (isCampus(details) && !String(details.collegeName || profileCollege || '').trim()) {
        return { field: 'collegeName', error: 'Add your college.' };
    }
    return null;
};

const SOCIALS = [
    { key: 'youtube', label: 'YouTube', placeholder: '@yourchannel' },
    { key: 'linkedin', label: 'LinkedIn', placeholder: 'your-name' },
    { key: 'twitter', label: 'X (Twitter)', placeholder: '@you' },
];

const DetailsStep = ({ details, setDetails, profileCollege, fieldError }) => {
    const set = (patch) => setDetails(d => ({ ...d, ...patch }));
    const campus = isCampus(details);
    const niches = details.niches || [];
    const toggle = (id) => set({ niches: niches.includes(id) ? niches.filter(n => n !== id) : [...(niches.length >= MAX_NICHES ? niches.slice(1) : niches), id] });

    return (
        <div className="space-y-6">
            <FormBlock label={`What you post (up to ${MAX_NICHES})`}>
                <div className="flex flex-wrap gap-2">
                    {CREATOR_NICHE_OPTIONS.map(n => (
                        <ChoiceChip key={n.id} selected={niches.includes(n.id)} onClick={() => toggle(n.id)} className="py-2">{n.label}</ChoiceChip>
                    ))}
                </div>
                {fieldError?.field === 'niches' && <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{fieldError.error}</p>}
            </FormBlock>

            {hasOthers(details) && (
                <TextInput
                    label="Your niche"
                    value={details.customNiche}
                    onChange={(e) => set({ customNiche: e.target.value })}
                    placeholder="e.g. Sneakers"
                    maxLength={60}
                    error={fieldError?.field === 'customNiche' ? fieldError.error : null}
                />
            )}

            {niches.includes('City Pages') && (
                <TextInput
                    label="What your page covers (optional)"
                    value={details.cityPageFocus}
                    onChange={(e) => set({ cityPageFocus: e.target.value })}
                    placeholder="e.g. Food and events in Pune"
                    maxLength={80}
                />
            )}

            {campus && (
                <TextInput
                    label={niches.includes('College Pages') ? 'College this page represents' : 'Your college'}
                    value={details.collegeName || ''}
                    onChange={(e) => set({ collegeName: e.target.value })}
                    placeholder={profileCollege || 'e.g. Christ University'}
                    autoComplete="organization"
                    maxLength={160}
                    hint={profileCollege && !details.collegeName ? `We’ll use ${profileCollege} from your profile.` : null}
                    error={fieldError?.field === 'collegeName' ? fieldError.error : null}
                />
            )}

            <FormBlock label="How you like to work">
                <div className="grid gap-2 sm:grid-cols-3">
                    {COLLAB_OPTIONS.map(o => (
                        <ChoiceChip key={o.id} selected={details.collaboration === o.id} hint={o.hint} onClick={() => set({ collaboration: o.id })}>{o.label}</ChoiceChip>
                    ))}
                </div>
            </FormBlock>

            <FormBlock label="Your usual rate per deliverable" hint="Optional. Brands use it to plan budgets.">
                <div className="flex flex-wrap gap-2">
                    {RATE_OPTIONS.map(r => (
                        <ChoiceChip
                            key={r.id}
                            selected={details.commercials === r.commercials}
                            onClick={() => set({ commercials: details.commercials === r.commercials ? '' : r.commercials })}
                        >
                            {r.label}
                        </ChoiceChip>
                    ))}
                </div>
            </FormBlock>

            <FormBlock label="A line about you" hint="Optional. What you post and who follows you.">
                <TextArea
                    value={details.bio}
                    onChange={(e) => set({ bio: e.target.value })}
                    maxLength={BIO_MAX}
                    rows={3}
                    placeholder="Weekend gig reels and food spots around Bengaluru."
                />
            </FormBlock>

            <FormBlock label="Other socials" hint="Optional. Just the username.">
                <div className="space-y-3">
                    {SOCIALS.map(x => (
                        <TextInput
                            key={x.key}
                            label={x.label}
                            value={details[x.key] || ''}
                            onChange={(e) => set({ [x.key]: e.target.value })}
                            placeholder={x.placeholder}
                            autoCapitalize="none"
                            autoCorrect="off"
                            maxLength={80}
                        />
                    ))}
                </div>
            </FormBlock>
        </div>
    );
};

export default DetailsStep;
