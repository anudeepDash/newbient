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
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Users from 'lucide-react/dist/esm/icons/users';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import IdCard from 'lucide-react/dist/esm/icons/id-card';
import { Link } from 'react-router-dom';
import { useAppStore, hasCapability } from '../../lib/store/appStore';
import { useTheme } from '../../hooks/useTheme';
import { Field, Button, AmbientBackdrop } from '../../components/app';
import { appPath } from '../host';
import { creatorPassId } from '../creator/format';
import { Panel, ROW } from './DetailLayout';
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
    const isCreator = useAppStore(st => hasCapability(st, 'creator'));
    const creator = useAppStore(st => st.creatorProfile);
    const newbiId = creatorPassId(creator);

    const shortcuts = [
        // Creator things first, community after.
        isCreator
            ? { to: appPath('/creator/profile'), icon: Zap, label: 'Creator profile', hint: 'Rates, bio and your Newbi ID' }
            : { to: appPath('/creator/apply'), icon: Zap, label: 'Become a Newbi creator', hint: 'Get your creator ID in 30 seconds' },
        { to: appPath('/community'), icon: Users, label: 'My guestlists', hint: 'Passes for guestlists you joined' },
        { to: appPath('/tickets'), icon: Ticket, label: 'Tickets', hint: 'Shows on sale' },
    ];

    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
            {/* You, and what you can do */}
            <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                <section className="relative overflow-hidden rounded-[1.75rem] bg-[#0b0d12] p-6 text-white ring-1 ring-inset ring-white/10 lg:p-7">
                    <AmbientBackdrop image={photo} intensity={0.35} />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(90% 120% at 100% 0%, rgba(57,255,20,0.22), transparent 60%)' }} />
                    <div className="relative flex items-center gap-4 lg:flex-col lg:items-start">
                        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-neon-green/15 text-2xl font-black text-neon-green ring-2 ring-neon-green/60 lg:h-20 lg:w-20">
                            {photo ? <img src={photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : (name || '?').charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                            {name && <p className="truncate font-heading text-[22px] font-extrabold tracking-[-0.02em] lg:text-[26px]">{name}</p>}
                            {(profile?.email || authUser?.email) && <p className="truncate text-[14px] text-zinc-400">{profile?.email || authUser?.email}</p>}
                        </div>
                    </div>
                    {newbiId && (
                        <p className="relative mt-4 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-neon-green">
                            <IdCard size={13} /> Newbi ID · {newbiId}
                        </p>
                    )}
                </section>

                <div className="grid gap-2">
                    {missing.length > 0 && (
                        <Button className="w-full" onClick={() => setSheet({ required: missing, title: 'Complete your profile' })}>Complete profile</Button>
                    )}
                    <Button className="w-full" variant="secondary" onClick={() => setSheet({ required: ['name', 'city', 'college'], title: 'Edit details', force: true })}>Edit details</Button>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" icon={isDark ? Sun : Moon} onClick={() => toggleTheme()}>
                            {isDark ? 'Light' : 'Dark'}
                        </Button>
                        <Button variant="danger" icon={LogOut} onClick={() => signOut()}>Sign out</Button>
                    </div>
                </div>
            </div>

            {/* Your details, and shortcuts */}
            <div className="space-y-6">
                <Panel label="Details">
                    <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
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
                    </div>
                </Panel>

                <Panel label="Shortcuts">
                    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        {shortcuts.map(({ to, icon: Icon, label, hint }) => (
                            <li key={label}>
                                <Link to={to} className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white dark:hover:bg-white/[0.08] ${ROW}`}>
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.05] text-gray-700 dark:bg-white/[0.08] dark:text-zinc-300"><Icon size={18} /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[15px] font-bold">{label}</span>
                                        <span className="block truncate text-[13px] text-gray-500 dark:text-zinc-400">{hint}</span>
                                    </span>
                                    <ChevronRight size={17} className="shrink-0 text-gray-400" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Panel>
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
