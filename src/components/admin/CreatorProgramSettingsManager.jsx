import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import Sliders from 'lucide-react/dist/esm/icons/sliders';
import Gift from 'lucide-react/dist/esm/icons/gift';
import Users from 'lucide-react/dist/esm/icons/users';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Save from 'lucide-react/dist/esm/icons/save';

const CreatorProgramSettingsManager = () => {
    useStoreSubscription(['siteSettings']);
    const { siteSettings, updateGeneralSettings } = useStore();

    const [formData, setFormData] = useState({
        allowCreatorSignups: true,
        creatorWelcomePoints: 100,
        creatorReferralPoints: 200,
        showPastClients: true,
        showCreatorTestimonials: true,
        creatorAnnouncement: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (siteSettings) {
            setFormData({
                allowCreatorSignups: siteSettings.allowCreatorSignups !== false,
                creatorWelcomePoints: siteSettings.creatorWelcomePoints !== undefined ? Number(siteSettings.creatorWelcomePoints) : 100,
                creatorReferralPoints: siteSettings.creatorReferralPoints !== undefined ? Number(siteSettings.creatorReferralPoints) : 200,
                showPastClients: siteSettings.showPastClients !== false,
                showCreatorTestimonials: siteSettings.showCreatorTestimonials !== false,
                creatorAnnouncement: siteSettings.creatorAnnouncement || ''
            });
        }
    }, [siteSettings]);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            await updateGeneralSettings({
                allowCreatorSignups: formData.allowCreatorSignups,
                creatorWelcomePoints: Number(formData.creatorWelcomePoints) || 100,
                creatorReferralPoints: Number(formData.creatorReferralPoints) || 200,
                showPastClients: formData.showPastClients,
                showCreatorTestimonials: formData.showCreatorTestimonials,
                creatorAnnouncement: formData.creatorAnnouncement.trim()
            });
            useStore.getState().addToast('Creator program settings saved!', 'success');
        } catch (err) {
            console.error('Save settings error:', err);
            useStore.getState().addToast('Failed to save settings.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <h2 className="text-xl font-black font-heading tracking-tight uppercase text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <Sliders size={20} className="text-amber-600 dark:text-amber-400" />
                        Program Rules &amp; Visibility Controls
                    </h2>
                    <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="h-10 px-5 rounded-xl bg-neon-green text-black font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    >
                        <Save size={13} /> {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Settings Card */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-5 sm:p-8 bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl space-y-7 shadow-sm">
                        {/* Section 1: Signup Intake */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-black font-heading uppercase tracking-wide text-gray-950 dark:text-white flex items-center gap-2">
                                        <ShieldCheck size={16} className="text-neon-green" />
                                        Creator Application Status
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                        Toggle whether creators can submit new join applications via /creator/join
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, allowCreatorSignups: !prev.allowCreatorSignups }))}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm shrink-0",
                                        formData.allowCreatorSignups
                                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                            : "bg-red-500/10 text-red-400 border-red-500/30"
                                    )}
                                >
                                    {formData.allowCreatorSignups ? <><Eye size={12} /> Intake Open</> : <><EyeOff size={12} /> Intake Paused</>}
                                </button>
                            </div>
                        </div>

                        <div className="h-px bg-black/5 dark:bg-white/5" />

                        {/* Section 2: Points Configuration */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-black font-heading uppercase tracking-wide text-gray-950 dark:text-white flex items-center gap-2">
                                    <Gift size={16} className="text-neon-pink" />
                                    Rewards &amp; Points Architecture
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                    Reward points credited automatically during onboardings and community activations
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                        Welcome Bonus Points
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="5000"
                                        value={formData.creatorWelcomePoints}
                                        onChange={(e) => setFormData(prev => ({ ...prev, creatorWelcomePoints: e.target.value }))}
                                        className="h-12 bg-white dark:bg-black/50 border-black/10 dark:border-white/10 rounded-xl text-xs font-mono font-bold"
                                    />
                                    <p className="text-[10px] text-gray-500 dark:text-zinc-500">
                                        Credited onto the creator&apos;s digital ID badge upon form completion.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                        Referral Reward Points
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="5000"
                                        value={formData.creatorReferralPoints}
                                        onChange={(e) => setFormData(prev => ({ ...prev, creatorReferralPoints: e.target.value }))}
                                        className="h-12 bg-white dark:bg-black/50 border-black/10 dark:border-white/10 rounded-xl text-xs font-mono font-bold"
                                    />
                                    <p className="text-[10px] text-gray-500 dark:text-zinc-500">
                                        Credited when an existing creator invites another verified talent.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-black/5 dark:bg-white/5" />

                        {/* Section 3: Landing Page Content Toggles */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-black font-heading uppercase tracking-wide text-gray-950 dark:text-white flex items-center gap-2">
                                    <Eye size={16} className="text-neon-blue" />
                                    Landing Page Section Visibility
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                    Control which dynamic content blocks render on the public /creator landing page
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-gray-900 dark:text-white">Brand Partners Marquee</div>
                                        <div className="text-[10px] text-gray-500 dark:text-zinc-400">Global clients &amp; partners reel</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, showPastClients: !prev.showPastClients }))}
                                        className={cn(
                                            "text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all",
                                            formData.showPastClients
                                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                                : "bg-red-500/10 text-red-400 border-red-500/30"
                                        )}
                                    >
                                        {formData.showPastClients ? 'Visible' : 'Hidden'}
                                    </button>
                                </div>

                                <div className="p-4 rounded-2xl bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-gray-900 dark:text-white">Creator Testimonials</div>
                                        <div className="text-[10px] text-gray-500 dark:text-zinc-400">Stories from verified collective</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, showCreatorTestimonials: !prev.showCreatorTestimonials }))}
                                        className={cn(
                                            "text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all",
                                            formData.showCreatorTestimonials
                                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                                : "bg-red-500/10 text-red-400 border-red-500/30"
                                        )}
                                    >
                                        {formData.showCreatorTestimonials ? 'Visible' : 'Hidden'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Banner Announcement */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Optional Announcement Notice (Displayed on Join Form)
                            </label>
                            <Input
                                value={formData.creatorAnnouncement}
                                onChange={(e) => setFormData(prev => ({ ...prev, creatorAnnouncement: e.target.value }))}
                                placeholder="e.g. 'Now onboarding creators for upcoming festival drops in Bengaluru & Mumbai.'"
                                className="h-12 bg-white dark:bg-black/50 border-black/10 dark:border-white/10 rounded-xl text-xs font-medium"
                            />
                        </div>
                    </Card>
                </div>

                {/* Quick Previews & Direct Action Links */}
                <div className="space-y-6">
                    <Card className="p-5 sm:p-6 bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl space-y-4 shadow-sm">
                        <h3 className="text-xs font-black font-heading uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                            Live Portal Links
                        </h3>

                        <div className="space-y-2.5">
                            <a
                                href="/creator"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3.5 rounded-xl bg-gray-50 dark:bg-black/30 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between hover:border-black/20 dark:hover:border-white/20 transition-all group"
                            >
                                <div>
                                    <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-neon-green transition-colors">
                                        Creator Landing
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                                        /creator
                                    </div>
                                </div>
                                <ExternalLink size={14} className="text-gray-400 group-hover:text-neon-green transition-colors" />
                            </a>

                            <a
                                href="/creator/join"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3.5 rounded-xl bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 flex items-center justify-between hover:border-neon-pink/40 transition-all group"
                            >
                                <div>
                                    <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-neon-pink transition-colors">
                                        Registration Form
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                                        /creator/join
                                    </div>
                                </div>
                                <ExternalLink size={14} className="text-gray-400 group-hover:text-neon-pink transition-colors" />
                            </a>

                            <a
                                href="/creator-dashboard"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3.5 rounded-xl bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 flex items-center justify-between hover:border-neon-blue/40 transition-all group"
                            >
                                <div>
                                    <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-neon-blue transition-colors">
                                        Creator Dashboard
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                                        /creator-dashboard
                                    </div>
                                </div>
                                <ExternalLink size={14} className="text-gray-400 group-hover:text-neon-blue transition-colors" />
                            </a>
                        </div>
                    </Card>

                    <Card className="p-6 bg-gradient-to-br from-neon-green/10 via-neon-blue/5 to-transparent border border-neon-green/20 rounded-[2.5rem] space-y-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neon-green">
                            <Users size={15} /> Community Routing
                        </div>
                        <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                            Creators are automatically mapped to their city group upon completing their application and inside their personalized dashboard.
                        </p>
                    </Card>
                </div>
            </div>
        </section>
    );
};

export default CreatorProgramSettingsManager;
