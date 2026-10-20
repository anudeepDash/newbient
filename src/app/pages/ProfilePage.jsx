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
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import Heart from 'lucide-react/dist/esm/icons/heart';
import UserRound from 'lucide-react/dist/esm/icons/user-round';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Globe from 'lucide-react/dist/esm/icons/globe';
import { Link } from 'react-router-dom';
import { useAppStore, hasCapability } from '../../lib/store/appStore';
import { useTheme } from '../../hooks/useTheme';
import { Field, Button, AmbientBackdrop } from '../../components/app';
import { appPath, landingUrl } from '../host';
import { creatorPassId } from '../creator/format';
import { Panel, ROW } from './DetailLayout';
import AuthGate from '../auth/AuthGate';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import JoinCommunitySheet from '../community/JoinCommunitySheet';
import { interestLabel } from '../community/welcomeForm';
import PageHeader, { PageBody } from './PageHeader';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { useT } from '../../i18n';

/*
 * Profile: the one place for your details. "Edit profile" opens the same
 * questions as the community welcome form, plus your name; the phone number
 * is changed (and verified) on its own. Creator details live on the creator
 * profile, which is also where it can be deleted.
 */

const ProfileDetails = () => {
    const t = useT();
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const signOut = useAppStore(s => s.signOut);
    const { isDark, toggleTheme } = useTheme();
    const [editOpen, setEditOpen] = useState(false);
    const [phoneOpen, setPhoneOpen] = useState(false);

    const photo = profile?.photoURL || authUser?.photoURL;
    const name = profile?.name || authUser?.displayName;
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
        // The landing site is another page load (and another host in production), so a plain link.
        { href: landingUrl('/'), icon: Globe, label: 'newbi.live', hint: 'What we do, our work and contact' },
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
                            <IdCard size={13} /> {t('Newbi ID')} · {newbiId}
                        </p>
                    )}
                </section>

                <div className="grid gap-2">
                    <Button className="w-full" icon={UserRound} onClick={() => setEditOpen(true)}>{t('Edit profile')}</Button>
                    <Button className="w-full" variant="secondary" icon={Smartphone} onClick={() => setPhoneOpen(true)}>
                        {profile?.phoneVerified ? t('Change phone number') : t('Verify phone number')}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" icon={isDark ? Sun : Moon} onClick={() => toggleTheme()}>
                            {isDark ? t('Light') : t('Dark')}
                        </Button>
                        <Button variant="danger" icon={LogOut} onClick={() => signOut()}>{t('Sign out')}</Button>
                    </div>
                </div>
            </div>

            {/* Your details, and shortcuts */}
            <div className="space-y-6">
                <Panel label={t('Details')}>
                    <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                        <Field label={t('Phone')} icon={Phone} value={profile?.phone}>
                            {profile?.phone && (
                                <span className="flex items-center gap-2">
                                    {profile.phone}
                                    {profile.phoneVerified && <ShieldCheck size={15} className="text-emerald-600 dark:text-neon-green" aria-label={t('Verified')} />}
                                </span>
                            )}
                        </Field>
                        <Field label={t('Email')} icon={Mail} value={profile?.email} />
                        <Field label={t('City')} icon={MapPin} value={profile?.city} />
                        <Field label={t('College')} icon={GraduationCap} value={profile?.college} />
                        <Field label={t('What you do')} icon={Briefcase} value={profile?.isStudent === false ? profile?.occupation : null} />
                        <Field label={t('Gender')} icon={UserRound} value={profile?.gender ? t(profile.gender) : null} />
                        <Field label={t('Into')} icon={Heart} value={profile?.interests?.length ? profile.interests.map(id => t(interestLabel(id))).join(', ') : null} />
                        <Field label={t('Instagram')} icon={Instagram} value={handle} />
                    </div>
                </Panel>

                <Panel label={t('Shortcuts')}>
                    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        {shortcuts.map(({ to, href, icon: Icon, label, hint }) => {
                            const Row = href ? 'a' : Link;
                            return (
                            <li key={label}>
                                <Row {...(href ? { href } : { to })} className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white dark:hover:bg-white/[0.08] ${ROW}`}>
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.05] text-gray-700 dark:bg-white/[0.08] dark:text-zinc-300"><Icon size={18} /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[15px] font-bold">{t(label)}</span>
                                        <span className="block truncate text-[13px] text-gray-500 dark:text-zinc-400">{t(hint)}</span>
                                    </span>
                                    <ChevronRight size={17} className="shrink-0 text-gray-400" />
                                </Row>
                            </li>
                            );
                        })}
                    </ul>
                </Panel>
            </div>

            <JoinCommunitySheet mode="edit" open={editOpen} onClose={() => setEditOpen(false)} />
            <CompleteProfileSheet
                open={phoneOpen}
                onClose={() => setPhoneOpen(false)}
                required={['phoneVerified']}
                editAll
                title={profile?.phoneVerified ? 'Change phone number' : 'Verify phone number'}
            />
        </div>
    );
};

const ProfilePage = () => {
    const t = useT();
    useDynamicMeta({ page: 'profile' });
    return (
        <PageBody>
            <PageHeader eyebrow={t('Profile')} title={t('Your')} highlight={t('profile.')} subtitle={t('Used for every pass, giveaway and application, so you only fill it once.')} />
            <AuthGate title={t('Sign in to see your profile')} message={t('Your passes, campaigns and details live in one account.')}>
                <ProfileDetails />
            </AuthGate>
        </PageBody>
    );
};

export default ProfilePage;
