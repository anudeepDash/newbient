import React from 'react';
import { TextInput } from '../../../components/app';
import { CREATOR_NICHE_OPTIONS, COLLAB_OPTIONS, RATE_OPTIONS, BIO_MAX, isCollegeNiche } from '../../../lib/creator/options';
import { ChoiceChip, FormBlock, TextArea } from '../ui';

/*
 * Step 2: what you make and how you work. Also used on its own (in a Sheet)
 * to edit these fields from the creator profile.
 *
 *   details: { niche, customNiche, cityPageFocus, collegeName, collaboration, commercials, bio, whatsappOptIn }
 *   profileCollege: the college already on the profile (asked only when missing)
 */

export const validateDetails = (details, profileCollege) => {
    if (!details.niche) return { field: 'niche', error: 'Pick the niche that fits you best.' };
    if (details.niche === 'Others' && !String(details.customNiche || '').trim()) return { field: 'customNiche', error: 'Tell us your niche.' };
    if (isCollegeNiche(details.niche) && !String(details.collegeName || profileCollege || '').trim()) {
        return { field: 'collegeName', error: 'Add your college.' };
    }
    return null;
};

const DetailsStep = ({ details, setDetails, profileCollege, fieldError, showWhatsapp = true }) => {
    const set = (patch) => setDetails(d => ({ ...d, ...patch }));
    const campus = isCollegeNiche(details.niche);

    return (
        <div className="space-y-6">
            <FormBlock label="Your niche">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {CREATOR_NICHE_OPTIONS.map(n => (
                        <ChoiceChip key={n.id} selected={details.niche === n.id} onClick={() => set({ niche: n.id })}>{n.label}</ChoiceChip>
                    ))}
                </div>
                {fieldError?.field === 'niche' && <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{fieldError.error}</p>}
            </FormBlock>

            {details.niche === 'Others' && (
                <TextInput
                    label="Your niche"
                    value={details.customNiche}
                    onChange={(e) => set({ customNiche: e.target.value })}
                    placeholder="e.g. Sneakers"
                    maxLength={60}
                    error={fieldError?.field === 'customNiche' ? fieldError.error : null}
                />
            )}

            {details.niche === 'City Pages' && (
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
                    label={details.niche === 'College Pages' ? 'College this page represents' : 'Your college'}
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

            {showWhatsapp && (
                <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
                    <input
                        type="checkbox"
                        checked={details.whatsappOptIn !== false}
                        onChange={(e) => set({ whatsappOptIn: e.target.checked })}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600"
                    />
                    <span className="text-[14px] text-gray-700 dark:text-zinc-300">Send my tickets and updates on WhatsApp</span>
                </label>
            )}
        </div>
    );
};

export default DetailsStep;
