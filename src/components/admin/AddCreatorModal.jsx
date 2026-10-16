import React, { useState, useCallback, useMemo, useRef } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import Check from 'lucide-react/dist/esm/icons/check';
import Camera from 'lucide-react/dist/esm/icons/camera';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import User from 'lucide-react/dist/esm/icons/user';
import { useStore } from '../../lib/store';
import { cn, normalizePhoneNumber } from '../../lib/utils';
import { extractSocialUsername, hasDisallowedLink } from '../../lib/socialUtils';
import { PREDEFINED_CITIES, CREATOR_NICHE_OPTIONS, isCollegeNiche } from '../../lib/constants';
import { requestAutoLocation } from '../../lib/location';
import Sheet from './Sheet';
import { Button } from './ui';
import { Field, Section, Toggle, Choice, fieldCls, areaCls } from './uploads/UploadKit';
import ThemedSelect from './ThemedSelect';

const POPULAR_CITIES = [
    'Bengaluru',
    'Mumbai',
    'Delhi NCR',
    'Hyderabad',
    'Pune',
    'Goa',
    'Chennai',
    'Kolkata'
];

const COUNTRY_OPTIONS = [
    { value: '+91', label: '+91 (India)' },
    { value: '+1', label: '+1 (US)' },
    { value: '+44', label: '+44 (UK)' },
    { value: '+971', label: '+971 (UAE)' },
    { value: '+61', label: '+61 (AU)' }
];

const COLLAB_OPTIONS = [
    { value: 'both', label: 'Paid or barter', hint: 'Open to both' },
    { value: 'paid', label: 'Paid only' },
    { value: 'barter', label: 'Barter', hint: 'Barter and gigs' }
];

const RATE_PRESETS = [
    { label: 'Flexible / barter', min: 0, max: 0, flex: true },
    { label: '₹2K – ₹8K', min: 2000, max: 8000 },
    { label: '₹8K – ₹20K', min: 8000, max: 20000 },
    { label: '₹20K – ₹50K', min: 20000, max: 50000 },
    { label: '₹50K – ₹1L+', min: 50000, max: 100000 }
];

const STATUS_OPTIONS = [
    { value: 'approved', label: 'Verified', hint: 'Can join campaigns now' },
    { value: 'pending', label: 'Pending review', hint: 'Check them first' }
];

const formatINR = (amt) => {
    if (!amt && amt !== 0) return '₹0';
    return `₹${Number(amt).toLocaleString('en-IN')}`;
};

const formatFollowerDisplay = (num) => {
    const val = Number(num) || 0;
    if (val >= 1000000) return (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return val.toLocaleString('en-IN');
};

const rateLabel = (min, max) => `${formatINR(min)} – ${formatINR(max)}${max >= 100000 ? '+' : ''} / Deliverable`;

const chipCls = (active) => cn(
    'inline-flex min-h-10 items-center rounded-xl border px-3.5 py-1.5 text-left text-[13px] font-semibold transition-colors',
    active
        ? 'border-emerald-500/60 bg-neon-green/[0.08] text-gray-900 dark:border-neon-green/50 dark:text-white'
        : 'border-black/10 text-gray-700 hover:border-black/20 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/20'
);

const linkBtnCls = 'inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-emerald-700 hover:bg-black/5 disabled:opacity-50 dark:text-neon-green dark:hover:bg-white/5';

const Label = ({ children, optional }) => (
    <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-gray-500">
        {children}
        {optional && <span className="font-medium">(optional)</span>}
    </p>
);

const Warning = ({ children }) => (
    <p className="mt-1 flex items-start gap-1.5 text-[12px] font-semibold text-amber-600 dark:text-amber-400">
        <AlertCircle size={13} className="mt-px shrink-0" /> <span>{children}</span>
    </p>
);

// One titled block of the form. Sections are separated by a hairline and can be scrolled to.
const Block = React.forwardRef(({ title, hint, children }, ref) => (
    <div ref={ref} className="border-t border-black/[0.06] pt-6 first:border-t-0 first:pt-0 dark:border-white/[0.06]">
        <Section title={title} hint={hint}>{children}</Section>
    </div>
));
Block.displayName = 'Block';

const AddCreatorModal = ({ onClose, onCreated }) => {
    const { addCreator, creators, uploadToCloudinary, addToast, siteSettings } = useStore();

    const [isSaving, setIsSaving] = useState(false);
    const [sendWelcomeMail, setSendWelcomeMail] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [showAllCities, setShowAllCities] = useState(false);
    const [isLocatingCity, setIsLocatingCity] = useState(false);
    const [countryCode, setCountryCode] = useState('+91');

    // Instagram Verification State
    const [isInstagramVerifying, setIsInstagramVerifying] = useState(false);
    const [instagramVerifiedData, setInstagramVerifiedData] = useState(null);
    const [instagramVerificationError, setInstagramVerificationError] = useState('');
    const [isManualFollowerEntry, setIsManualFollowerEntry] = useState(false);

    // Deliverable rates state
    const [rateMin, setRateMin] = useState(5000);
    const [rateMax, setRateMax] = useState(25000);
    const [isRateFlexible, setIsRateFlexible] = useState(false);

    const sectionRefs = useRef({});

    const minInstagramFollowers = siteSettings?.minInstagramFollowersToJoin !== undefined
        ? Number(siteSettings.minInstagramFollowersToJoin)
        : 1000;

    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        city: 'Bengaluru',
        customCity: '',
        categories: 'Fashion & Luxury',
        customNiche: '',
        collegeName: '',
        cityPageFocus: '',
        bio: '',
        doBarter: 'both',
        commercials: '₹5,000 – ₹25,000 / Deliverable',
        primaryPlatform: 'instagram',
        instagram: '',
        instagramFollowers: '',
        youtube: '',
        twitter: '',
        linkedin: '',
        linkedinFollowers: '',
        profilePicture: '',
        referredBy: '',
        profileStatus: 'approved'
    });

    // Scroll the sheet body to a section (used when a check fails).
    const goToSection = useCallback((id) => {
        const el = sectionRefs.current[id];
        if (!el) return;
        const scroller = el.closest('.overflow-y-auto');
        if (!scroller) {
            el.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
            return;
        }
        const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
        scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }, []);

    // Real-time duplicate alerts matching CreatorJoin
    const duplicateWarnings = useMemo(() => {
        if (!creators || creators.length === 0) return {};
        const warnings = {};

        if (form.email?.trim()) {
            const normEmail = form.email.trim().toLowerCase();
            const match = creators.find(c => c.email && c.email.trim().toLowerCase() === normEmail);
            if (match) {
                warnings.email = `Already registered to ${match.displayName || match.name || 'an existing creator'}.`;
            }
        }

        if (form.phone) {
            const normPhone = normalizePhoneNumber(form.phone);
            if (normPhone && normPhone.length >= 10) {
                const match = creators.find(c => normalizePhoneNumber(c.phone) === normPhone);
                if (match) {
                    warnings.phone = `Already linked to ${match.displayName || match.name || 'an existing creator'}.`;
                }
            }
        }

        if (form.instagram?.trim()) {
            const cleanInsta = form.instagram.trim().replace(/^@/, '').toLowerCase();
            if (cleanInsta.length >= 2) {
                const match = creators.find(c => c.instagram && c.instagram.trim().replace(/^@/, '').toLowerCase() === cleanInsta);
                if (match) {
                    warnings.instagram = `@${cleanInsta} is registered to ${match.displayName || match.name || 'an existing creator'}.`;
                }
            }
        }

        return warnings;
    }, [form.email, form.phone, form.instagram, creators]);

    // Auto-detect city location
    const handleAutoDetectLocation = async () => {
        setIsLocatingCity(true);
        try {
            const result = await requestAutoLocation({ onlyPrimaryHubs: false });
            if (result?.city) {
                setForm(prev => ({ ...prev, city: result.city }));
                addToast(`City set to ${result.city} based on your location.`, 'success');
            }
        } catch {
            addToast("Couldn't get your location. Please pick the city from the list.", 'info');
        } finally {
            setIsLocatingCity(false);
        }
    };

    // Handle Instagram verification matching CreatorJoin
    const handleVerifyInstagram = useCallback(async (manualHandle = null) => {
        const raw = manualHandle !== null ? manualHandle : form.instagram;
        const cleanHandle = extractSocialUsername(raw || '', 'instagram');

        if (!cleanHandle) {
            setInstagramVerificationError('Please enter an Instagram handle (links not allowed).');
            return;
        }

        setIsInstagramVerifying(true);
        setInstagramVerificationError('');

        try {
            const isLocal = typeof window !== 'undefined' &&
                (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

            const res = await fetch(`/api/creator-join?action=verify-instagram&handle=${encodeURIComponent(cleanHandle)}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                if (isLocal) {
                    // Graceful fallback for local development
                    const mockFollowers = Math.max(minInstagramFollowers || 1000, 4850);
                    setInstagramVerifiedData({
                        handle: cleanHandle,
                        name: cleanHandle,
                        followers: mockFollowers,
                        formattedFollowers: formatFollowerDisplay(mockFollowers),
                        profilePic: null,
                        isPrivate: false,
                        isVerified: false,
                        meetsMinimumFollowers: true,
                        alreadyRegistered: false
                    });
                    setForm(prev => ({
                        ...prev,
                        instagram: cleanHandle,
                        instagramFollowers: String(mockFollowers)
                    }));
                    addToast(`Test mode: Instagram verified with ${mockFollowers.toLocaleString()} followers.`, 'info');
                    return;
                }

                if (data.requiresManualEntry) {
                    setIsManualFollowerEntry(true);
                    setInstagramVerificationError('');
                    addToast("We couldn't fetch Instagram followers automatically. Please enter the count yourself.", 'info');
                    return;
                }

                const errMsg = data.error || `Could not verify @${cleanHandle}. Make sure account is public.`;
                setInstagramVerificationError(errMsg);
                setInstagramVerifiedData(null);
                return;
            }

            const count = Number(data.followers) || 0;
            const meetsCriteria = minInstagramFollowers <= 0 || count >= minInstagramFollowers;

            const verifiedPayload = {
                handle: data.handle,
                name: data.name,
                followers: count,
                formattedFollowers: data.formattedFollowers || formatFollowerDisplay(count),
                profilePic: data.profilePic || null,
                isPrivate: data.isPrivate || false,
                isVerified: data.isVerified || false,
                meetsMinimumFollowers: meetsCriteria,
                alreadyRegistered: Boolean(data.alreadyRegistered),
                registeredTo: data.registeredTo || null
            };

            setInstagramVerifiedData(verifiedPayload);
            setIsManualFollowerEntry(false);
            setForm(prev => ({
                ...prev,
                instagram: data.handle,
                instagramFollowers: String(count),
                ...(data.profilePic && !prev.profilePicture ? { profilePicture: data.profilePic } : {})
            }));

            addToast(`Instagram verified: @${data.handle} has ${count.toLocaleString()} followers.`, 'success');
        } catch (err) {
            console.warn("Instagram verification error:", err);
            const isLocal = typeof window !== 'undefined' &&
                (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            if (isLocal) {
                const mockFollowers = Math.max(minInstagramFollowers || 1000, 3200);
                setInstagramVerifiedData({
                    handle: cleanHandle,
                    name: cleanHandle,
                    followers: mockFollowers,
                    formattedFollowers: formatFollowerDisplay(mockFollowers),
                    profilePic: null,
                    isPrivate: false,
                    isVerified: false,
                    meetsMinimumFollowers: true,
                    alreadyRegistered: false
                });
                setForm(prev => ({
                    ...prev,
                    instagram: cleanHandle,
                    instagramFollowers: String(mockFollowers)
                }));
                addToast(`Test mode: Instagram verified with ${mockFollowers.toLocaleString()} followers.`, 'info');
                return;
            }
            setIsManualFollowerEntry(true);
            setInstagramVerificationError('Could not auto-verify handle. You can enter follower count manually.');
        } finally {
            setIsInstagramVerifying(false);
        }
    }, [form.instagram, minInstagramFollowers, addToast]);

    const handleInstagramChange = (e) => {
        const val = extractSocialUsername(e.target.value, 'instagram');
        setForm(prev => ({ ...prev, instagram: val }));
        if (instagramVerifiedData && instagramVerifiedData.handle !== val.trim().toLowerCase()) {
            setInstagramVerifiedData(null);
            setInstagramVerificationError('');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (['linkedin', 'youtube', 'twitter'].includes(name)) {
            const cleanVal = extractSocialUsername(value, name);
            setForm(prev => ({ ...prev, [name]: cleanVal }));
            return;
        }
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            addToast("This image is too large. Please choose one under 10MB.", "error");
            return;
        }
        const localPreview = URL.createObjectURL(file);
        setForm(prev => ({ ...prev, profilePicture: localPreview }));
        setIsUploadingPhoto(true);
        try {
            if (uploadToCloudinary) {
                const url = await uploadToCloudinary(file);
                if (url) {
                    setForm(prev => ({ ...prev, profilePicture: url }));
                    addToast("Profile photo uploaded.", "success");
                }
            }
        } catch (err) {
            console.error("Cloudinary upload failed, using local preview:", err);
            addToast("Couldn't upload the photo, so we're using the preview for now.", "info");
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const pickRatePreset = (preset) => {
        if (preset.flex) {
            setIsRateFlexible(true);
            setForm(p => ({ ...p, commercials: 'Flexible / Barter' }));
        } else {
            setIsRateFlexible(false);
            setRateMin(preset.min);
            setRateMax(preset.max);
            setForm(p => ({ ...p, commercials: rateLabel(preset.min, preset.max) }));
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!form.name.trim()) {
            goToSection('identity');
            addToast("Please enter the creator's full name.", "error");
            return;
        }

        if (!form.city) {
            goToSection('city');
            addToast("Please select the creator's city.", "error");
            return;
        }

        if (form.city === 'Others' && !form.customCity?.trim()) {
            goToSection('city');
            addToast("Please enter the city name.", "error");
            return;
        }

        if (!form.categories) {
            goToSection('niche');
            addToast("Please select the creator's main niche.", "error");
            return;
        }

        if (form.categories === 'Others' && !form.customNiche?.trim()) {
            goToSection('niche');
            addToast("Please enter the content niche.", "error");
            return;
        }

        const showCollege = isCollegeNiche(form.categories);
        if (showCollege && !form.collegeName?.trim()) {
            goToSection('niche');
            addToast("Please enter the college or university name.", "error");
            return;
        }

        for (const field of ['instagram', 'linkedin', 'youtube', 'twitter']) {
            const val = form[field]?.trim();
            if (val && hasDisallowedLink(val)) {
                goToSection(field === 'instagram' ? 'socials' : 'platforms');
                addToast(`Please enter just the ${field} username, not a link.`, 'error');
                return;
            }
        }

        // Validate duplicates
        if (form.phone) {
            const normPhone = normalizePhoneNumber(form.phone);
            if (normPhone && creators?.length > 0) {
                const existing = creators.find(c => normalizePhoneNumber(c.phone) === normPhone);
                if (existing) {
                    goToSection('contact');
                    addToast(`This phone number already belongs to ${existing.name || existing.displayName} (${existing.email || 'existing creator'}).`, 'error');
                    return;
                }
            }
        }

        if (form.email?.trim()) {
            const normEmail = form.email.trim().toLowerCase();
            const existing = (creators || []).find(c => c.email && c.email.trim().toLowerCase() === normEmail);
            if (existing) {
                goToSection('contact');
                addToast(`This email already belongs to ${existing.name || existing.displayName}.`, 'error');
                return;
            }
        }

        if (form.instagram?.trim()) {
            const cleanInsta = form.instagram.trim().replace(/^@/, '').toLowerCase();
            const existing = (creators || []).find(c => c.instagram && c.instagram.trim().replace(/^@/, '').toLowerCase() === cleanInsta);
            if (existing) {
                goToSection('socials');
                addToast(`Instagram @${cleanInsta} already belongs to ${existing.name || existing.displayName}.`, 'error');
                return;
            }

            const isVerified = Boolean(instagramVerifiedData && instagramVerifiedData.handle === cleanInsta);
            if (!isVerified && !form.instagramFollowers?.trim() && !isManualFollowerEntry) {
                goToSection('socials');
                addToast("Please verify the Instagram handle or enter the follower count.", 'warning');
                return;
            }
        }

        if (sendWelcomeMail && !form.email?.trim()) {
            goToSection('contact');
            addToast("Add an email address so we can send the welcome email.", 'error');
            return;
        }

        setIsSaving(true);
        try {
            let finalCity = form.city === 'Others' ? form.customCity.trim() : form.city;
            if (/^bang[al]*o?re$/i.test(finalCity)) {
                finalCity = 'Bengaluru';
            } else if (/^(visakhapatnam|vizag)$/i.test(finalCity)) {
                finalCity = 'Vizag';
            }

            const finalNiche = form.categories === 'Others' ? form.customNiche.trim() : form.categories;
            const generatedUid = `manual_${Math.random().toString(36).substring(2, 15)}`;
            const cleanInstagram = extractSocialUsername(form.instagram, 'instagram');
            const cleanLinkedin = extractSocialUsername(form.linkedin, 'linkedin');
            const cleanYoutube = extractSocialUsername(form.youtube, 'youtube');
            const cleanTwitter = extractSocialUsername(form.twitter, 'twitter');
            const cleanPhoneDigits = form.phone ? form.phone.replace(/\D/g, '').slice(-10) : '';
            const fullPhone = cleanPhoneDigits ? `${countryCode} ${cleanPhoneDigits}` : '';

            const isInstaVerified = Boolean(
                instagramVerifiedData &&
                instagramVerifiedData.handle === cleanInstagram.toLowerCase()
            );
            const finalFollowers = String(
                Number(form.instagramFollowers || instagramVerifiedData?.followers || 0)
            );
            const manualFollowers = Boolean(isManualFollowerEntry || !isInstaVerified);

            const payload = {
                uid: generatedUid,
                name: form.name.trim(),
                displayName: form.name.trim(),
                phone: fullPhone,
                email: form.email.trim(),
                city: finalCity,
                categories: finalNiche,
                specializations: [finalNiche],
                collegeName: isCollegeNiche(finalNiche) ? (form.collegeName?.trim() || '') : '',
                cityPageFocus: form.cityPageFocus?.trim() || '',
                bio: form.bio?.trim() || '',
                instagram: cleanInstagram,
                instagramFollowers: finalFollowers,
                instagramVerified: isInstaVerified,
                instagramVerifiedAt: isInstaVerified ? new Date().toISOString() : null,
                instagramProfilePic: isInstaVerified ? (instagramVerifiedData?.profilePic || null) : null,
                profilePicture: form.profilePicture || instagramVerifiedData?.profilePic || '',
                manualFollowerEntry: manualFollowers,
                requiresManualVerification: manualFollowers && form.profileStatus === 'pending',
                linkedin: cleanLinkedin,
                linkedinFollowers: form.linkedinFollowers || '0',
                youtube: cleanYoutube,
                twitter: cleanTwitter,
                website: '',
                doBarter: form.doBarter || 'both',
                commercials: isRateFlexible ? 'Flexible / Barter' : form.commercials,
                referredBy: form.referredBy?.trim() || '',
                profileStatus: form.profileStatus || 'approved',
                isVerified: form.profileStatus === 'approved',
                verifiedAt: form.profileStatus === 'approved' ? new Date().toISOString() : null,
                verifiedBy: form.profileStatus === 'approved' ? 'admin_manual_onboard' : null,
                isPhoneVerified: Boolean(fullPhone),
                phoneVerifiedAt: fullPhone ? new Date().toISOString() : null,
                addedByAdmin: true
            };

            const result = await addCreator(payload, sendWelcomeMail);
            addToast(`Creator "${form.name.trim()}" added.`, 'success');
            onCreated?.(result);
            onClose?.();
        } catch (err) {
            console.error("Error adding creator profile:", err);
            addToast(err.message || "Couldn't add the creator. Please try again.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const igHandle = form.instagram?.trim().replace(/^@/, '').toLowerCase();
    const igMatchesVerified = Boolean(instagramVerifiedData && instagramVerifiedData.handle === igHandle);
    const hasEmail = Boolean(form.email?.trim());
    const cityChoices = showAllCities ? PREDEFINED_CITIES.filter(c => c !== 'Others') : POPULAR_CITIES;
    const setRef = (id) => (el) => { sectionRefs.current[id] = el; };

    const footer = (
        <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} className="h-12">Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isSaving || isUploadingPhoto} className="h-12 flex-1">
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {isSaving ? 'Adding…' : isUploadingPhoto ? 'Uploading photo…' : 'Add creator'}
            </Button>
        </div>
    );

    return (
        <Sheet
            open
            onClose={onClose}
            size="lg"
            title="Add creator"
            subtitle="Add someone to the network yourself. Name, city and niche are required."
            footer={footer}
        >
            <form id="add-creator-form" onSubmit={(e) => e.preventDefault()} noValidate className="space-y-6">

                {/* Profile */}
                <Block ref={setRef('identity')} title="Profile">
                    <div className="flex items-center gap-4">
                        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.04]">
                            {form.profilePicture ? (
                                <img src={form.profilePicture} alt="" className="h-full w-full object-cover" />
                            ) : form.name?.trim() ? (
                                <span className="text-2xl font-extrabold text-emerald-700 dark:text-neon-green">{form.name.trim().charAt(0).toUpperCase()}</span>
                            ) : (
                                <User size={26} className="text-gray-400" />
                            )}
                            {isUploadingPhoto && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <Loader2 size={18} className="animate-spin text-white" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <label className={cn('inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-black/10 px-3.5 text-[13px] font-semibold hover:border-black/25 dark:border-white/10 dark:hover:border-white/25', isUploadingPhoto && 'pointer-events-none opacity-50')}>
                                    <Camera size={15} /> {isUploadingPhoto ? 'Uploading…' : form.profilePicture ? 'Change photo' : 'Upload photo'}
                                    <input type="file" accept="image/*" className="hidden" disabled={isUploadingPhoto} onChange={handleImageUpload} />
                                </label>
                                {form.profilePicture && !isUploadingPhoto && (
                                    <button type="button" onClick={() => setForm(p => ({ ...p, profilePicture: '' }))} className="h-10 rounded-xl px-3 text-[13px] font-semibold text-red-500 hover:bg-red-500/10">
                                        Remove
                                    </button>
                                )}
                            </div>
                            <p className="mt-1.5 text-[12px] text-gray-500">Optional. We use their Instagram photo once the handle is verified.</p>
                        </div>
                    </div>

                    <Field label="Full name">
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            autoComplete="off"
                            placeholder="e.g. Aisha Sharma"
                            className={fieldCls}
                        />
                    </Field>
                </Block>

                {/* Contact */}
                <Block ref={setRef('contact')} title="Contact" hint="Used for campaign updates and WhatsApp.">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="min-w-0">
                            <Field label="Email" optional>
                                <input
                                    type="email"
                                    name="email"
                                    inputMode="email"
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="creator@email.com"
                                    className={fieldCls}
                                />
                            </Field>
                            {duplicateWarnings.email && <Warning>{duplicateWarnings.email}</Warning>}
                        </div>
                        <div className="min-w-0">
                            <Label optional>WhatsApp / phone</Label>
                            <div className="flex gap-2">
                                <ThemedSelect
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    aria-label="Country code"
                                    className={cn(fieldCls, 'w-[84px] shrink-0 cursor-pointer px-2.5')}
                                >
                                    {COUNTRY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.value}</option>
                                    ))}
                                </ThemedSelect>
                                <input
                                    type="tel"
                                    name="phone"
                                    inputMode="tel"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="98765 43210"
                                    aria-label="Phone number"
                                    className={cn(fieldCls, 'min-w-0 flex-1')}
                                />
                            </div>
                            {duplicateWarnings.phone && <Warning>{duplicateWarnings.phone}</Warning>}
                        </div>
                    </div>
                </Block>

                {/* City */}
                <Block ref={setRef('city')} title="City" hint="The city they create content in.">
                    <div className="flex flex-wrap gap-2">
                        {cityChoices.map(city => (
                            <button key={city} type="button" onClick={() => setForm(p => ({ ...p, city }))} className={chipCls(form.city === city)}>
                                {city}
                            </button>
                        ))}
                        {/* A detected city outside the visible chips still shows as selected. */}
                        {form.city && form.city !== 'Others' && !cityChoices.includes(form.city) && (
                            <button type="button" className={chipCls(true)}>{form.city}</button>
                        )}
                        <button type="button" onClick={() => setForm(p => ({ ...p, city: 'Others' }))} className={chipCls(form.city === 'Others')}>
                            Other city
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                        <button type="button" onClick={() => setShowAllCities(v => !v)} className={linkBtnCls}>
                            {showAllCities ? 'Show fewer cities' : 'Show all cities'}
                        </button>
                        <button type="button" onClick={handleAutoDetectLocation} disabled={isLocatingCity} className={linkBtnCls}>
                            {isLocatingCity ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                            {isLocatingCity ? 'Finding location…' : 'Use my location'}
                        </button>
                    </div>
                    {form.city === 'Others' && (
                        <Field label="City name">
                            <input
                                type="text"
                                name="customCity"
                                value={form.customCity}
                                onChange={handleChange}
                                placeholder="e.g. Chandigarh, Bhopal, Surat"
                                className={fieldCls}
                            />
                        </Field>
                    )}
                </Block>

                {/* Niche */}
                <Block ref={setRef('niche')} title="Niche" hint="Used to match them with brand campaigns.">
                    <div className="flex flex-wrap gap-2">
                        {CREATOR_NICHE_OPTIONS.map(niche => (
                            <button
                                key={niche.id}
                                type="button"
                                onClick={() => setForm(p => ({ ...p, categories: niche.id }))}
                                aria-pressed={form.categories === niche.id}
                                className={chipCls(form.categories === niche.id)}
                            >
                                {niche.label}
                            </button>
                        ))}
                    </div>

                    {form.categories === 'Others' && (
                        <Field label="Niche name">
                            <input
                                type="text"
                                name="customNiche"
                                value={form.customNiche}
                                onChange={handleChange}
                                placeholder="e.g. Sustainable fashion, AI tools, DIY crafts"
                                className={fieldCls}
                            />
                        </Field>
                    )}

                    {form.categories === 'City Pages' && (
                        <Field label="Page focus" optional hint="The area or theme the page covers.">
                            <input
                                type="text"
                                name="cityPageFocus"
                                value={form.cityPageFocus}
                                onChange={handleChange}
                                placeholder="e.g. Bangalore nightlife, South Delhi food"
                                className={fieldCls}
                            />
                        </Field>
                    )}

                    {isCollegeNiche(form.categories) && (
                        <Field
                            label={form.categories === 'College Pages' ? 'College this page represents' : 'College or university'}
                            hint="Required for campus creators and college pages. Used for campus programs and fest passes."
                        >
                            <input
                                id="admin-creator-college"
                                type="text"
                                name="collegeName"
                                value={form.collegeName}
                                onChange={handleChange}
                                placeholder="e.g. Christ University, IIT Bombay"
                                className={fieldCls}
                            />
                        </Field>
                    )}
                </Block>

                {/* Instagram */}
                <Block ref={setRef('socials')} title="Instagram" hint="Verify the handle to fetch the follower count and profile photo.">
                    <div>
                        <Label optional>Instagram handle</Label>
                        <div className="flex gap-2">
                            <div className="relative min-w-0 flex-1">
                                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-gray-400">@</span>
                                <input
                                    type="text"
                                    name="instagram"
                                    value={form.instagram}
                                    onChange={handleInstagramChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleVerifyInstagram();
                                        }
                                    }}
                                    placeholder="handle"
                                    aria-label="Instagram handle"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    className={cn(
                                        fieldCls,
                                        'pl-8 pr-10',
                                        igMatchesVerified
                                            ? 'border-emerald-500/50 dark:border-emerald-500/50'
                                            : instagramVerificationError ? 'border-red-500/50 dark:border-red-500/50' : ''
                                    )}
                                />
                                {form.instagram && !isInstagramVerifying && !instagramVerifiedData && (
                                    <button
                                        type="button"
                                        aria-label="Clear handle"
                                        onClick={() => {
                                            setForm(p => ({ ...p, instagram: '', instagramFollowers: '' }));
                                            setInstagramVerifiedData(null);
                                            setInstagramVerificationError('');
                                        }}
                                        className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                    >
                                        <X size={15} />
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => handleVerifyInstagram()}
                                disabled={isInstagramVerifying || !form.instagram?.trim() || igMatchesVerified}
                                className={cn(
                                    'inline-flex h-12 shrink-0 items-center gap-1.5 rounded-xl px-4 text-[13px] font-bold transition-colors disabled:cursor-not-allowed',
                                    igMatchesVerified
                                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-neon-green'
                                        : 'bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-zinc-200'
                                )}
                            >
                                {isInstagramVerifying ? <Loader2 size={15} className="animate-spin" />
                                    : igMatchesVerified ? <Check size={15} strokeWidth={3} /> : <Sparkles size={14} />}
                                {igMatchesVerified ? 'Verified' : 'Verify'}
                            </button>
                        </div>
                        {duplicateWarnings.instagram && <Warning>{duplicateWarnings.instagram}</Warning>}
                    </div>

                    {isInstagramVerifying && (
                        <p className="flex items-center gap-2 text-[13px] font-semibold text-gray-600 dark:text-zinc-400">
                            <Loader2 size={14} className="animate-spin" /> Fetching followers for @{form.instagram?.replace(/^@/, '')}…
                        </p>
                    )}

                    {instagramVerificationError && !isInstagramVerifying && !isManualFollowerEntry && (
                        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-3.5">
                            <p className="flex items-start gap-2 text-[13px] font-semibold text-red-600 dark:text-red-400">
                                <AlertCircle size={15} className="mt-px shrink-0" /> {instagramVerificationError}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <Button variant="secondary" size="sm" className="h-10" onClick={() => setIsManualFollowerEntry(true)}>
                                    <Pencil size={12} /> Enter manually
                                </Button>
                                <Button variant="secondary" size="sm" className="h-10" onClick={() => handleVerifyInstagram()}>
                                    <RefreshCw size={12} /> Try again
                                </Button>
                            </div>
                        </div>
                    )}

                    {igMatchesVerified && !isManualFollowerEntry && (
                        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                                {instagramVerifiedData.profilePic ? (
                                    <img
                                        src={instagramVerifiedData.profilePic}
                                        alt=""
                                        referrerPolicy="no-referrer"
                                        className="h-full w-full object-cover"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                ) : (
                                    <Instagram size={18} className="text-gray-500" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1.5 truncate text-[14px] font-bold">
                                    @{instagramVerifiedData.handle}
                                    {instagramVerifiedData.isVerified && (
                                        <span title="Verified on Instagram" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white"><Check size={10} strokeWidth={3} /></span>
                                    )}
                                </p>
                                <p className="text-[12px] font-semibold tabular-nums text-emerald-700 dark:text-neon-green">
                                    {Number(instagramVerifiedData.followers).toLocaleString('en-IN')} followers
                                    <span className="ml-1 font-medium text-gray-500">({formatFollowerDisplay(instagramVerifiedData.followers)})</span>
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-10" onClick={() => setIsManualFollowerEntry(true)}>Edit count</Button>
                        </div>
                    )}

                    {isManualFollowerEntry && (
                        <Field label="Instagram followers" hint="Type the exact count from their profile.">
                            <input
                                type="number"
                                name="instagramFollowers"
                                inputMode="numeric"
                                min="0"
                                value={form.instagramFollowers}
                                onChange={handleChange}
                                placeholder="e.g. 15000"
                                className={cn(fieldCls, 'tabular-nums')}
                            />
                        </Field>
                    )}

                    <div className="flex flex-wrap gap-1">
                        {isManualFollowerEntry ? (
                            <button type="button" onClick={() => { setIsManualFollowerEntry(false); if (form.instagram?.trim()) handleVerifyInstagram(); }} className={linkBtnCls}>
                                <RefreshCw size={13} /> Verify automatically instead
                            </button>
                        ) : (
                            <button type="button" onClick={() => setIsManualFollowerEntry(true)} className={linkBtnCls}>
                                <Pencil size={13} /> Enter followers manually
                            </button>
                        )}
                    </div>
                </Block>

                {/* Other platforms */}
                <Block ref={setRef('platforms')} title="Other platforms" hint="Usernames only, not links.">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="LinkedIn" optional>
                            <input type="text" name="linkedin" value={form.linkedin} onChange={handleChange} placeholder="in/username" autoCapitalize="none" autoCorrect="off" className={fieldCls} />
                        </Field>
                        <Field label="LinkedIn followers" optional>
                            <input type="number" name="linkedinFollowers" inputMode="numeric" min="0" value={form.linkedinFollowers} onChange={handleChange} placeholder="e.g. 500" className={cn(fieldCls, 'tabular-nums')} />
                        </Field>
                        <Field label="YouTube" optional>
                            <input type="text" name="youtube" value={form.youtube} onChange={handleChange} placeholder="@channel" autoCapitalize="none" autoCorrect="off" className={fieldCls} />
                        </Field>
                        <Field label="X (Twitter)" optional>
                            <input type="text" name="twitter" value={form.twitter} onChange={handleChange} placeholder="@username" autoCapitalize="none" autoCorrect="off" className={fieldCls} />
                        </Field>
                    </div>
                </Block>

                {/* Rates & collaboration */}
                <Block ref={setRef('rates')} title="Rates and collaboration">
                    <div>
                        <Label>Open to</Label>
                        <Choice value={form.doBarter} onChange={(v) => setForm(p => ({ ...p, doBarter: v }))} options={COLLAB_OPTIONS} />
                    </div>

                    <div className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.06]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[12px] font-bold text-gray-500">Typical rate per deliverable</p>
                            <span className="rounded-lg bg-black/[0.04] px-2.5 py-1 text-[13px] font-bold tabular-nums dark:bg-white/[0.06]">
                                {isRateFlexible ? 'Flexible / barter' : `${formatINR(rateMin)} – ${formatINR(rateMax)}${rateMax >= 100000 ? '+' : ''}`}
                            </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {RATE_PRESETS.map(preset => {
                                const isSelected = preset.flex ? isRateFlexible : (!isRateFlexible && rateMin === preset.min && rateMax === preset.max);
                                return (
                                    <button key={preset.label} type="button" onClick={() => pickRatePreset(preset)} className={chipCls(isSelected)}>
                                        {preset.label}
                                    </button>
                                );
                            })}
                        </div>
                        {!isRateFlexible && (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="flex justify-between text-[12px] font-bold text-gray-500">
                                        <span>Minimum</span>
                                        <span className="tabular-nums text-gray-900 dark:text-white">{formatINR(rateMin)}</span>
                                    </span>
                                    <input
                                        type="range"
                                        min="1000"
                                        max="60000"
                                        step="1000"
                                        value={rateMin}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            const newMin = Math.min(val, rateMax - 1000);
                                            setRateMin(newMin);
                                            setForm(p => ({ ...p, commercials: rateLabel(newMin, rateMax) }));
                                        }}
                                        className="mt-2 h-8 w-full cursor-pointer accent-emerald-500"
                                    />
                                </label>
                                <label className="block">
                                    <span className="flex justify-between text-[12px] font-bold text-gray-500">
                                        <span>Maximum</span>
                                        <span className="tabular-nums text-gray-900 dark:text-white">{formatINR(rateMax)}{rateMax >= 100000 ? '+' : ''}</span>
                                    </span>
                                    <input
                                        type="range"
                                        min="2000"
                                        max="100000"
                                        step="2000"
                                        value={rateMax}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            const newMax = Math.max(val, rateMin + 1000);
                                            setRateMax(newMax);
                                            setForm(p => ({ ...p, commercials: rateLabel(rateMin, newMax) }));
                                        }}
                                        className="mt-2 h-8 w-full cursor-pointer accent-emerald-500"
                                    />
                                </label>
                            </div>
                        )}
                    </div>

                    <Field label="Bio" optional>
                        <textarea
                            name="bio"
                            value={form.bio}
                            onChange={handleChange}
                            rows={3}
                            placeholder="e.g. Bangalore lifestyle creator covering nightlife, dining and aesthetic reels."
                            className={cn(areaCls, 'resize-none')}
                        />
                    </Field>
                </Block>

                {/* Status & onboarding */}
                <Block ref={setRef('status')} title="Status and onboarding">
                    <div>
                        <Label>Profile status</Label>
                        <Choice value={form.profileStatus} onChange={(v) => setForm(p => ({ ...p, profileStatus: v }))} options={STATUS_OPTIONS} />
                    </div>
                    <Field label="Referred by" optional>
                        <input type="text" name="referredBy" value={form.referredBy} onChange={handleChange} placeholder="Creator ID, code or @handle" className={fieldCls} />
                    </Field>
                    <div className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.06]">
                        <Toggle
                            label="Send welcome email"
                            hint={hasEmail ? `Goes to ${form.email.trim()}` : 'Add an email address above to send one.'}
                            checked={sendWelcomeMail}
                            onChange={(v) => {
                                if (v && !hasEmail) {
                                    goToSection('contact');
                                    addToast('Add an email address first.', 'info');
                                    return;
                                }
                                setSendWelcomeMail(v);
                            }}
                        />
                    </div>
                </Block>
            </form>
        </Sheet>
    );
};

export default AddCreatorModal;
