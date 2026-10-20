import React, { useState, useEffect, useRef, useCallback } from 'react';
import Camera from 'lucide-react/dist/esm/icons/camera';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Check from 'lucide-react/dist/esm/icons/check';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Clock from 'lucide-react/dist/esm/icons/clock';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import { useStore } from '../../lib/store';
import { cn, normalizePhoneNumber } from '../../lib/utils';
import { extractSocialUsername, hasDisallowedLink } from '../../lib/socialUtils';
import { PREDEFINED_CITIES, CREATOR_NICHE_OPTIONS, isCollegeNiche } from '../../lib/constants';
import { auth } from '../../lib/firebase';
import { RecaptchaVerifier, PhoneAuthProvider, linkWithCredential } from 'firebase/auth';
import Sheet from '../admin/Sheet';
import { Button, Badge } from '../admin/ui';
import { Field, Section, Choice, fieldCls, areaCls } from '../admin/uploads/UploadKit';
import ThemedSelect from '../admin/ThemedSelect';

const formatINR = (amt) => {
    if (!amt && amt !== 0) return '₹0';
    return `₹${amt.toLocaleString('en-IN')}`;
};

const parseRates = (str) => {
    if (!str || str.toLowerCase().includes('flexible') || str.toLowerCase().includes('barter')) {
        return { isFlexible: true, min: 5000, max: 25000 };
    }
    const numbers = str.match(/\d[\d,]*/g);
    if (numbers && numbers.length >= 2) {
        const min = parseInt(numbers[0].replace(/,/g, ''), 10) || 5000;
        const max = parseInt(numbers[1].replace(/,/g, ''), 10) || 25000;
        return { isFlexible: false, min, max };
    }
    return { isFlexible: false, min: 5000, max: 25000 };
};

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

const chipCls = (active) => cn(
    'inline-flex min-h-10 items-center rounded-xl border px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
    active
        ? 'border-emerald-500/60 bg-neon-green/[0.08] text-gray-900 dark:border-neon-green/50 dark:text-white'
        : 'border-black/10 text-gray-700 hover:border-black/20 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/20'
);

// The niche the edit form starts on: a student/college niche if the creator has one
// (it controls the college field), otherwise their first niche.
const primarySpecialization = (profile) => {
    const specs = (Array.isArray(profile?.specializations) && profile.specializations.length)
        ? profile.specializations
        : [profile?.categories].filter(Boolean);
    return specs.find(isCollegeNiche) || specs[0] || '';
};

// One titled block of the form. Sections are separated by a hairline and can be scrolled to.
const Block = React.forwardRef(({ title, hint, children }, ref) => (
    <div ref={ref} className="border-t border-black/[0.06] pt-6 first:border-t-0 first:pt-0 dark:border-white/[0.06]">
        <Section title={title} hint={hint}>{children}</Section>
    </div>
));
Block.displayName = 'Block';

const EditCreatorModal = ({ isOpen, onClose, profile: profileProp, creator, onUpdated, initialSection = 'identity' }) => {
    const profile = profileProp || creator;
    const { updateCreator, creators, user, addToast, addNotification } = useStore();

    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const sectionRefs = useRef({});

    // Initial values resolution
    // A student/college niche decides whether the college field shows, so prefer it over list order.
    const rawSpecialization = primarySpecialization(profile);
    const initialSpecialization = (rawSpecialization === 'Student Creator/ Campus Creator' || rawSpecialization === 'Student/ Campus Creator')
        ? 'Student/Campus Creator'
        : rawSpecialization;
    const isPredefinedNiche = CREATOR_NICHE_OPTIONS.some(n => n.id === initialSpecialization);
    const normalizedProfileCity = (/^bang[al]*o?re$/i.test((profile?.city || '').trim())) ? 'Bengaluru' : (profile?.city || '');
    const isPredefinedCity = PREDEFINED_CITIES.includes(normalizedProfileCity);

    const initialBarter = (profile?.doBarter === 'paid' || profile?.doBarter === 'No')
        ? 'paid'
        : (profile?.doBarter === 'barter' || profile?.doBarter === 'Yes')
            ? 'barter'
            : 'both';

    const initialRates = parseRates(profile?.commercials);
    const [rateMin, setRateMin] = useState(initialRates.min);
    const [rateMax, setRateMax] = useState(initialRates.max);
    const [isRateFlexible, setIsRateFlexible] = useState(initialRates.isFlexible);

    const [form, setForm] = useState({
        name: profile?.name || profile?.displayName || user?.displayName || '',
        phone: profile?.phone || user?.phoneNumber || '',
        email: profile?.email || user?.email || '',
        city: isPredefinedCity ? normalizedProfileCity : (normalizedProfileCity ? 'Others' : ''),
        customCity: isPredefinedCity ? '' : normalizedProfileCity,
        categories: isPredefinedNiche ? initialSpecialization : (initialSpecialization ? 'Others' : ''),
        customNiche: isPredefinedNiche ? '' : initialSpecialization,
        cityPageFocus: profile?.cityPageFocus || '',
        collegeName: profile?.collegeName || '',
        instagram: profile?.instagram || '',
        instagramFollowers: profile?.instagramFollowers || '',
        youtube: profile?.youtube || '',
        twitter: profile?.twitter || '',
        linkedin: profile?.linkedin || '',
        bio: profile?.bio || '',
        doBarter: initialBarter,
        commercials: profile?.commercials || '₹5,000 – ₹25,000 / Deliverable',
        profilePicture: profile?.profilePicture || profile?.instagramProfilePic || profile?.profilePic || profile?.photoURL || ''
    });

    // OTP & Verification State
    const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(profile?.isPhoneVerified || false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const recaptchaVerifier = useRef(null);
    const recaptchaId = useRef(`recaptcha-edit-creator-${Math.random().toString(36).slice(2, 9)}`).current;
    const otpRefs = useRef([]);

    // Scroll the sheet body to a section (the one the caller asked for, or the one with a problem).
    const goToSection = useCallback((id, smooth = true) => {
        const el = sectionRefs.current[id];
        if (!el) return;
        const scroller = el.closest('.overflow-y-auto');
        if (!scroller) {
            el.scrollIntoView?.({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
            return;
        }
        const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
        scroller.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    // Keep form in sync when profile changes or modal opens
    useEffect(() => {
        if (!isOpen || !profile) return;

        const rawSpec = primarySpecialization(profile);
        const initSpec = (rawSpec === 'Student Creator/ Campus Creator' || rawSpec === 'Student/ Campus Creator')
            ? 'Student/Campus Creator'
            : rawSpec;
        const isPreNiche = CREATOR_NICHE_OPTIONS.some(n => n.id === initSpec);
        const normCity = (/^bang[al]*o?re$/i.test((profile?.city || '').trim())) ? 'Bengaluru' : (profile?.city || '');
        const isPreCity = PREDEFINED_CITIES.includes(normCity);
        const initRatesVal = parseRates(profile?.commercials);

        setRateMin(initRatesVal.min);
        setRateMax(initRatesVal.max);
        setIsRateFlexible(initRatesVal.isFlexible);

        setForm({
            name: profile?.name || profile?.displayName || user?.displayName || '',
            phone: profile?.phone || user?.phoneNumber || '',
            email: profile?.email || user?.email || '',
            city: isPreCity ? normCity : (normCity ? 'Others' : ''),
            customCity: isPreCity ? '' : normCity,
            categories: isPreNiche ? initSpec : (initSpec ? 'Others' : ''),
            customNiche: isPreNiche ? '' : initSpec,
            cityPageFocus: profile?.cityPageFocus || '',
            collegeName: profile?.collegeName || '',
            instagram: profile?.instagram || '',
            instagramFollowers: profile?.instagramFollowers || '',
            youtube: profile?.youtube || '',
            twitter: profile?.twitter || '',
            linkedin: profile?.linkedin || '',
            bio: profile?.bio || '',
            doBarter: (profile?.doBarter === 'paid' || profile?.doBarter === 'No') ? 'paid' : (profile?.doBarter === 'barter' || profile?.doBarter === 'Yes') ? 'barter' : 'both',
            commercials: profile?.commercials || '₹5,000 – ₹25,000 / Deliverable',
            profilePicture: profile?.profilePicture || profile?.instagramProfilePic || profile?.profilePic || profile?.photoURL || ''
        });

        setIsPhoneVerified(profile?.isPhoneVerified || false);
        setOtpSent(false);
        setOtpValues(['', '', '', '', '', '']);
    }, [isOpen, profile, user, initialSection]);

    // Open on the section the caller asked for (e.g. "Edit" next to Platforms).
    useEffect(() => {
        if (!isOpen || !initialSection || initialSection === 'identity') return undefined;
        const t = setTimeout(() => goToSection(initialSection, false), 60);
        return () => clearTimeout(t);
    }, [isOpen, initialSection, goToSection]);

    // Cleanup Recaptcha
    const cleanupRecaptcha = () => {
        if (recaptchaVerifier.current) {
            try {
                recaptchaVerifier.current.clear();
            } catch (e) {
                console.error("Error clearing recaptcha:", e);
            }
            recaptchaVerifier.current = null;
        }
        const container = document.getElementById(recaptchaId);
        if (container) container.remove();
    };

    useEffect(() => {
        return () => cleanupRecaptcha();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'instagram' || name === 'linkedin' || name === 'youtube' || name === 'twitter') {
            const cleanVal = extractSocialUsername(value, name);
            setForm(prev => ({ ...prev, [name]: cleanVal }));
            return;
        }
        if (name === 'phone') {
            setForm(prev => ({ ...prev, [name]: value }));
            if (value !== profile?.phone) {
                setIsPhoneVerified(false);
            } else {
                setIsPhoneVerified(profile?.isPhoneVerified || false);
            }
            return;
        }
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            addToast("Choose an image under 10 MB.", "warning", { title: 'This image is too large' });
            return;
        }
        const localPreview = URL.createObjectURL(file);
        setForm(prev => ({ ...prev, profilePicture: localPreview }));
        setIsUploadingPhoto(true);
        try {
            const uploadFn = useStore.getState().uploadToCloudinary;
            if (uploadFn) {
                const url = await uploadFn(file);
                setForm(prev => ({ ...prev, profilePicture: url }));
                addToast("Profile photo uploaded.", "success");
            }
        } catch (err) {
            console.error("Cloudinary upload failed, using local preview fallback:", err);
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm(prev => ({ ...prev, profilePicture: reader.result }));
            };
            reader.readAsDataURL(file);
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleSendOTP = async () => {
        if (!form.phone) {
            addToast("Enter your mobile number to get a verification code.", "warning");
            return;
        }
        const normPhone = normalizePhoneNumber(form.phone);
        if (normPhone && creators?.length > 0) {
            const conflict = creators.find(c =>
                (c.uid !== profile?.uid && c.id !== profile?.id) &&
                normalizePhoneNumber(c.phone) === normPhone
            );
            if (conflict) {
                addToast("It's linked to another creator account. Use a different number.", "warning", { title: 'Number already in use' });
                return;
            }
        }
        setIsSendingOtp(true);
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocal) {
                setOtpSent(true);
                addToast("Enter any 6-digit code to verify.", "info", { title: 'Test mode' });
                setIsSendingOtp(false);
                return;
            }
            cleanupRecaptcha();
            const container = document.createElement('div');
            container.id = recaptchaId;
            container.className = "z-50";
            document.body.appendChild(container);

            recaptchaVerifier.current = new RecaptchaVerifier(auth, container, {
                size: 'invisible',
                callback: () => {},
                'expired-callback': () => {
                    addToast("Ask for a new code and try again.", 'error', { title: 'The security check timed out' });
                    cleanupRecaptcha();
                }
            });
            await recaptchaVerifier.current.render();

            const cleanPhone = form.phone.replace(/\D/g, '');
            const formattedPhone = `+91${cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone}`;

            const phoneProvider = new PhoneAuthProvider(auth);
            const verificationId = await phoneProvider.verifyPhoneNumber(
                formattedPhone,
                recaptchaVerifier.current
            );
            setConfirmationResult(verificationId);
            setOtpSent(true);
            addToast("Verification code sent by SMS.", "success");
        } catch (err) {
            console.error("OTP send error:", err);
            addToast("Check the number and try again.", "error", {
                title: "Couldn't send the code",
                action: { label: 'Try again', onClick: () => handleSendOTP() },
            });
            cleanupRecaptcha();
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyOTP = async (codeToVerify) => {
        const fullCode = typeof codeToVerify === 'string' ? codeToVerify : otpValues.join('');
        if (fullCode.length !== 6) {
            addToast("Enter all 6 digits of the code.", "warning");
            return;
        }
        setIsVerifyingOtp(true);
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (!isLocal && confirmationResult) {
                const credential = PhoneAuthProvider.credential(confirmationResult, fullCode);
                if (auth?.currentUser && !auth.currentUser.phoneNumber) {
                    try {
                        await linkWithCredential(auth.currentUser, credential);
                    } catch (linkErr) {
                        console.log("Phone link note:", linkErr.message);
                    }
                }
            }
            setIsPhoneVerified(true);
            setOtpSent(false);
            addToast("Phone number verified.", "success");

            const creatorId = profile?.uid || profile?.id;
            if (creatorId) {
                await updateCreator(creatorId, {
                    isPhoneVerified: true,
                    phone: form.phone,
                    phoneVerifiedAt: new Date().toISOString()
                });
            }
        } catch (err) {
            console.error("OTP verification error:", err);
            addToast("Check the code and try again, or ask for a new one.", "error", { title: "That code didn't work" });
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleOtpChange = (index, value) => {
        const clean = value.replace(/\D/g, '');
        const newOtp = [...otpValues];
        newOtp[index] = clean ? clean.slice(-1) : '';
        setOtpValues(newOtp);

        if (clean && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }

        if (newOtp.every(d => d !== '')) {
            handleVerifyOTP(newOtp.join(''));
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!form.name?.trim()) {
            goToSection('identity');
            addToast("Enter your creator name.", "warning");
            return;
        }
        if (!form.city) {
            goToSection('city');
            addToast("Choose the city you work in.", "warning");
            return;
        }
        if (form.city === 'Others' && !form.customCity?.trim()) {
            goToSection('city');
            addToast("Enter your city name.", "warning");
            return;
        }
        if (!form.categories) {
            goToSection('niche');
            addToast("Choose your main niche.", "warning");
            return;
        }
        if (form.categories === 'Others' && !form.customNiche?.trim()) {
            goToSection('niche');
            addToast("Enter your niche.", "warning");
            return;
        }
        if (isCollegeNiche(form.categories) && !form.collegeName?.trim()) {
            goToSection('niche');
            addToast("Enter your college or university name.", "warning");
            return;
        }

        for (const field of ['instagram', 'linkedin', 'youtube', 'twitter']) {
            if (form[field] && hasDisallowedLink(form[field])) {
                goToSection('socials');
                addToast(`Enter just your ${({ instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube', twitter: 'X' })[field] || field} username, not a link.`, "warning");
                return;
            }
        }

        setIsSaving(true);
        try {
            let finalCity = form.city === 'Others' ? (form.customCity?.trim() || 'Others') : form.city;
            if (/^bang[al]*o?re$/i.test(finalCity.trim())) {
                finalCity = 'Bengaluru';
            }
            const finalNiche = form.categories === 'Others' ? (form.customNiche?.trim() || 'Others') : form.categories;
            const finalCommercials = isRateFlexible
                ? 'Flexible / Barter'
                : `${formatINR(rateMin)} – ${formatINR(rateMax)}${rateMax >= 100000 ? '+' : ''} / Deliverable`;

            const payload = {
                name: form.name.trim(),
                displayName: form.name.trim(),
                email: form.email?.trim() || '',
                phone: form.phone?.trim() || '',
                city: finalCity,
                categories: finalNiche,
                // The form edits one niche; keep the creator's other niches instead of wiping them.
                specializations: [finalNiche, ...((profile?.specializations || []).filter(n => n && n !== finalNiche && n !== rawSpecialization))],
                cityPageFocus: form.categories === 'City Pages' ? (form.cityPageFocus?.trim() || '') : '',
                collegeName: isCollegeNiche(form.categories) ? (form.collegeName?.trim() || '') : '',
                instagram: extractSocialUsername(form.instagram, 'instagram'),
                instagramFollowers: form.instagramFollowers || '',
                linkedin: extractSocialUsername(form.linkedin, 'linkedin'),
                youtube: extractSocialUsername(form.youtube, 'youtube'),
                twitter: extractSocialUsername(form.twitter, 'twitter'),
                website: '',
                bio: form.bio?.trim() || '',
                doBarter: form.doBarter || 'both',
                commercials: finalCommercials,
                profilePicture: form.profilePicture || '',
                isPhoneVerified: isPhoneVerified
            };

            const creatorId = profile?.uid || profile?.id;
            if (!creatorId) {
                throw new Error("Unable to identify creator profile identifier.");
            }

            await updateCreator(creatorId, payload);
            addToast("Creator details saved.", "success");
            
            // Sent to whoever saved, not the global feed.
            if (addNotification && user?.uid) {
                addNotification({
                    userId: user.uid,
                    title: "Creator profile updated",
                    content: "Your creator details and commercials have been saved.",
                    type: 'message'
                });
            }

            if (onUpdated) {
                onUpdated(payload);
            }
            onClose();
        } catch (err) {
            console.error("Failed to update creator profile:", err);
            addToast("Check your connection and try again.", "error", {
                title: "Couldn't save your details",
                action: { label: 'Try again', onClick: () => handleSubmit() },
            });
        } finally {
            setIsSaving(false);
        }
    };

    const creatorIdTag = profile?.creatorId || String(profile?.uid || profile?.id || '').slice(0, 8).toUpperCase();
    const isApproved = profile?.profileStatus === 'approved';
    const setRef = (id) => (el) => { sectionRefs.current[id] = el; };

    const header = (
        <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold tracking-tight">Edit creator details</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-gray-500">
                {creatorIdTag && <span className="font-mono text-[12px]">#{creatorIdTag}</span>}
                {isApproved
                    ? <Badge tone="green"><ShieldCheck size={10} /> Verified</Badge>
                    : <Badge tone="amber"><Clock size={10} /> Under review</Badge>}
            </div>
        </div>
    );

    const footer = (
        <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} className="h-12">Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isSaving || isUploadingPhoto} className="h-12 flex-1">
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {isSaving ? 'Saving…' : isUploadingPhoto ? 'Uploading photo…' : 'Save changes'}
            </Button>
        </div>
    );

    // zIndex: this also opens over the creator-side campaign modal (z 9990); toasts (9999) stay on top.
    return (
        <Sheet open={Boolean(isOpen)} onClose={onClose} header={header} size="lg" footer={footer} zIndex={9995}>
            <form id="edit-creator-form" onSubmit={(e) => e.preventDefault()} noValidate className="space-y-6">

                {/* Profile */}
                <Block ref={setRef('identity')} title="Profile">
                    <div className="flex items-center gap-4">
                        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.04]">
                            {form.profilePicture ? (
                                <img src={form.profilePicture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-2xl font-extrabold text-emerald-700 dark:text-neon-green">{(form.name?.trim().charAt(0) || 'C').toUpperCase()}</span>
                            )}
                            {isUploadingPhoto && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <Loader2 size={18} className="animate-spin text-white" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <label className={cn('inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-black/10 px-3.5 text-[13px] font-semibold hover:border-black/25 dark:border-white/10 dark:hover:border-white/25', isUploadingPhoto && 'pointer-events-none opacity-50')}>
                                <Camera size={15} /> {isUploadingPhoto ? 'Uploading…' : 'Change photo'}
                                <input type="file" accept="image/*" className="hidden" disabled={isUploadingPhoto} onChange={handleImageUpload} />
                            </label>
                            <p className="mt-1.5 text-[12px] text-gray-500">JPEG, PNG or WebP under 10MB.</p>
                        </div>
                    </div>

                    <Field label="Creator or display name">
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Your creator or brand name"
                            className={fieldCls}
                        />
                    </Field>
                </Block>

                {/* Contact */}
                <Block ref={setRef('contact')} title="Contact">
                    <Field label="Email">
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

                    <div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-[12px] font-bold text-gray-500">Mobile / WhatsApp</span>
                            {isPhoneVerified ? (
                                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 dark:text-neon-green">
                                    <CheckCircle2 size={13} /> Verified
                                </span>
                            ) : (
                                <span className="text-[12px] font-semibold text-amber-600 dark:text-amber-400">Not verified</span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="tel"
                                name="phone"
                                inputMode="tel"
                                value={form.phone}
                                onChange={handleChange}
                                placeholder="+91 98765 43210"
                                aria-label="Mobile number"
                                className={cn(fieldCls, 'min-w-0 flex-1')}
                            />
                            {!isPhoneVerified && (
                                <button
                                    type="button"
                                    onClick={handleSendOTP}
                                    disabled={isSendingOtp || !form.phone}
                                    className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-gray-900 px-4 text-[13px] font-bold text-white transition-colors hover:bg-gray-700 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                                >
                                    {isSendingOtp ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                    {otpSent ? 'Resend code' : 'Send code'}
                                </button>
                            )}
                        </div>

                        {otpSent && !isPhoneVerified && (
                            <div className="mt-3 rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.06]">
                                <p className="text-[13px] font-semibold">Enter the 6-digit code we sent by SMS</p>
                                <div className="mt-3 flex gap-1.5 sm:gap-2">
                                    {otpValues.map((val, idx) => (
                                        <input
                                            key={idx}
                                            ref={el => { otpRefs.current[idx] = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                                            maxLength={1}
                                            value={val}
                                            aria-label={`Digit ${idx + 1}`}
                                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Backspace' && !val && idx > 0) {
                                                    otpRefs.current[idx - 1]?.focus();
                                                }
                                            }}
                                            className="h-12 w-11 min-w-0 rounded-xl border border-black/10 bg-white text-center text-[16px] font-bold tabular-nums outline-none focus:border-neon-green/60 dark:border-white/10 dark:bg-white/[0.04]"
                                        />
                                    ))}
                                </div>
                                <Button
                                    variant="primary"
                                    onClick={() => handleVerifyOTP(otpValues.join(''))}
                                    disabled={isVerifyingOtp || otpValues.some(v => !v)}
                                    className="mt-3 h-11 w-full"
                                >
                                    {isVerifyingOtp ? <Loader2 size={14} className="animate-spin" /> : 'Verify code'}
                                </Button>
                            </div>
                        )}
                    </div>
                </Block>

                {/* City */}
                <Block ref={setRef('city')} title="City" hint="Where you create most of your content.">
                    <Field label="City">
                        <ThemedSelect name="city" value={form.city} onChange={handleChange} className={cn(fieldCls, 'cursor-pointer')}>
                            <option value="" disabled>Choose a city</option>
                            {PREDEFINED_CITIES.map(c => (
                                <option key={c} value={c}>{c === 'Others' ? 'Other city' : c}</option>
                            ))}
                        </ThemedSelect>
                    </Field>
                    {form.city === 'Others' && (
                        <Field label="City name">
                            <input
                                type="text"
                                name="customCity"
                                value={form.customCity}
                                onChange={handleChange}
                                placeholder="Your city"
                                className={fieldCls}
                            />
                        </Field>
                    )}
                </Block>

                {/* Niche */}
                <Block ref={setRef('niche')} title="Niche" hint="Campaigns and brand invites are matched on your city and niche.">
                    <Field label="Main niche">
                        <ThemedSelect name="categories" value={form.categories} onChange={handleChange} className={cn(fieldCls, 'cursor-pointer')}>
                            <option value="" disabled>Choose a niche</option>
                            {CREATOR_NICHE_OPTIONS.map(n => (
                                <option key={n.id} value={n.id}>{n.label}</option>
                            ))}
                        </ThemedSelect>
                    </Field>

                    {form.categories === 'Others' && (
                        <Field label="Niche name">
                            <input
                                type="text"
                                name="customNiche"
                                value={form.customNiche}
                                onChange={handleChange}
                                placeholder="e.g. Automotive, podcasting, DIY"
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
                            hint="Required for campus creators and college pages."
                        >
                            <input
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

                {/* Platforms */}
                <Block ref={setRef('socials')} title="Platforms and followers" hint="Usernames only, not links.">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Instagram">
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-gray-400">@</span>
                                <input
                                    type="text"
                                    name="instagram"
                                    value={form.instagram}
                                    onChange={handleChange}
                                    placeholder="yourhandle"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    className={cn(fieldCls, 'pl-8')}
                                />
                            </div>
                        </Field>
                        <Field label="Instagram followers" hint="Approximate is fine.">
                            <input
                                type="number"
                                name="instagramFollowers"
                                inputMode="numeric"
                                min="0"
                                value={form.instagramFollowers}
                                onChange={handleChange}
                                placeholder="e.g. 15000"
                                className={cn(fieldCls, 'tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none')}
                            />
                        </Field>
                        <Field label="YouTube" optional>
                            <input type="text" name="youtube" value={form.youtube} onChange={handleChange} placeholder="@channel" autoCapitalize="none" autoCorrect="off" className={fieldCls} />
                        </Field>
                        <Field label="LinkedIn" optional>
                            <input type="text" name="linkedin" value={form.linkedin} onChange={handleChange} placeholder="in/username" autoCapitalize="none" autoCorrect="off" className={fieldCls} />
                        </Field>
                        <Field label="X (Twitter)" optional>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-gray-400">@</span>
                                <input type="text" name="twitter" value={form.twitter} onChange={handleChange} placeholder="handle" autoCapitalize="none" autoCorrect="off" className={cn(fieldCls, 'pl-8')} />
                            </div>
                        </Field>
                    </div>
                </Block>

                {/* Rates & bio */}
                <Block ref={setRef('rates')} title="Rates and bio">
                    <div>
                        <p className="mb-1 text-[12px] font-bold text-gray-500">Open to</p>
                        <Choice value={form.doBarter} onChange={(v) => setForm(p => ({ ...p, doBarter: v }))} options={COLLAB_OPTIONS} />
                    </div>

                    <div className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.06]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-[12px] font-bold text-gray-500">Typical rate per deliverable</p>
                                <p className="text-[12px] text-gray-500">What you usually quote for a reel or campaign brief.</p>
                            </div>
                            <span className="rounded-lg bg-black/[0.04] px-2.5 py-1 text-[13px] font-bold tabular-nums dark:bg-white/[0.06]">
                                {isRateFlexible ? 'Flexible / barter' : `${formatINR(rateMin)} – ${formatINR(rateMax)}${rateMax >= 100000 ? '+' : ''}`}
                            </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {RATE_PRESETS.map(preset => {
                                const isSelected = preset.flex ? isRateFlexible : (!isRateFlexible && rateMin === preset.min && rateMax === preset.max);
                                return (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => {
                                            if (preset.flex) {
                                                setIsRateFlexible(true);
                                                setForm(p => ({ ...p, commercials: 'Flexible / Barter' }));
                                            } else {
                                                setIsRateFlexible(false);
                                                setRateMin(preset.min);
                                                setRateMax(preset.max);
                                                setForm(p => ({ ...p, commercials: `${formatINR(preset.min)} – ${formatINR(preset.max)}${preset.max >= 100000 ? '+' : ''} / Deliverable` }));
                                            }
                                        }}
                                        className={chipCls(isSelected)}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <div className="mb-1 flex items-center justify-between">
                            <span className="text-[12px] font-bold text-gray-500">Short bio <span className="font-medium">(optional)</span></span>
                            <span className="text-[11px] tabular-nums text-gray-400">{(form.bio || '').length}/300</span>
                        </div>
                        <textarea
                            name="bio"
                            rows={4}
                            maxLength={300}
                            value={form.bio}
                            onChange={handleChange}
                            aria-label="Short bio"
                            placeholder="Tell brands about your style, your audience and what you do best."
                            className={cn(areaCls, 'resize-none')}
                        />
                    </div>
                </Block>
            </form>
        </Sheet>
    );
};

export default EditCreatorModal;
