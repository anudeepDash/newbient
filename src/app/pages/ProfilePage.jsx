import React, { useState } from 'react';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import { useAppStore } from '../../lib/store/appStore';
import { useTheme } from '../../hooks/useTheme';
import { Section, Field, Button, AmbientBackdrop } from '../../components/app';
import AuthGate from '../auth/AuthGate';
import { missingFields } from '../profile/requirements';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import PageHeader, { PageBody } from './PageHeader';

/*
 * Profile: the one place for your details. Phase 5 adds security, email
 * preferences and Instagram here as ProfilePanel retires.
 */

const EDITABLE = ['name', 'city', 'college', 'phoneVerified'];

const ProfileDetails = () => {
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const signOut = useAppStore(s => s.signOut);
    const { isDark, toggleTheme } = useTheme();
    const [sheet, setSheet] = useState(null); // null | { required, title }

    const photo = profile?.photoURL || authUser?.photoURL;
    const name = profile?.name || authUser?.displayName;
    const missing = missingFields(profile, EDITABLE);
    const handle = profile?.instagram?.handle ? `@${profile.instagram.handle}` : null;

    return (
        <div className="space-y-6">
            <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-5 dark:border-white/[0.07] dark:bg-[#0c0e14]">
                <AmbientBackdrop image={photo} intensity={0.35} />
                <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-neon-green/15 text-2xl font-black text-emerald-700 dark:text-neon-green">
                    {photo ? <img src={photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : (name || '?').charAt(0).toUpperCase()}
                </span>
                <div className="relative min-w-0">
                    {name && <p className="truncate text-xl font-black tracking-tight">{name}</p>}
                    {(profile?.email || authUser?.email) && <p className="truncate text-[14px] text-gray-600 dark:text-zinc-400">{profile?.email || authUser?.email}</p>}
                </div>
            </div>

            <Section title="Details" bodyClassName="divide-y divide-black/[0.05] rounded-3xl border border-black/[0.06] bg-white px-4 dark:divide-white/[0.06] dark:border-white/[0.07] dark:bg-[#0c0e14]">
                <Field label="Phone" icon={Phone} value={profile?.phone}>
                    {profile?.phone && (
                        <span className="flex items-center gap-2">
                            {profile.phone}
                            {profile.phoneVerified && <ShieldCheck size={15} className="text-emerald-600 dark:text-neon-green" aria-label="Verified" />}
                        </span>
                    )}
                </Field>
                <Field label="Email" icon={Mail} value={profile?.email} />
                <Field label="City" icon={MapPin} value={profile?.city} />
                <Field label="College" icon={GraduationCap} value={profile?.college} />
                <Field label="Instagram" icon={Instagram} value={handle} />
            </Section>

            <div className="flex flex-col gap-3 sm:flex-row">
                {missing.length > 0 && (
                    <Button onClick={() => setSheet({ required: missing, title: 'Complete your profile' })}>Complete profile</Button>
                )}
                <Button variant="secondary" onClick={() => setSheet({ required: ['name', 'city', 'college'], title: 'Edit details', force: true })}>Edit details</Button>
                <Button variant="secondary" icon={isDark ? Sun : Moon} onClick={() => toggleTheme()}>
                    {isDark ? 'Light mode' : 'Dark mode'}
                </Button>
                <Button variant="danger" icon={LogOut} onClick={() => signOut()}>Sign out</Button>
            </div>

            <CompleteProfileSheet
                open={Boolean(sheet)}
                onClose={() => setSheet(null)}
                required={sheet?.required || []}
                editAll={Boolean(sheet?.force)}
                title={sheet?.title}
            />
        </div>
    );
};

const ProfilePage = () => (
    <PageBody>
        <PageHeader eyebrow="Profile" title="Your" highlight="profile." subtitle="Used for every pass, giveaway and application, so you only fill it once." />
        <AuthGate title="Sign in to see your profile" message="Your passes, campaigns and details live in one account.">
            <ProfileDetails />
        </AuthGate>
    </PageBody>
);

export default ProfilePage;
