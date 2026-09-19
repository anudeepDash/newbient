import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PREDEFINED_CITIES } from '../../lib/constants';
import { cn } from '../../lib/utils';
import Star from 'lucide-react/dist/esm/icons/star';
import User from 'lucide-react/dist/esm/icons/user';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import MessageSquareQuote from 'lucide-react/dist/esm/icons/message-square-quote';

const CreatorTestimonialsManager = () => {
    useStoreSubscription(['creatorTestimonials']);
    const { 
        creatorTestimonials, 
        addCreatorTestimonial, 
        updateCreatorTestimonial, 
        deleteCreatorTestimonial, 
        uploadToCloudinary 
    } = useStore();

    const [form, setForm] = useState({
        name: '',
        city: 'Bengaluru',
        niche: '',
        handle: '',
        quote: '',
        avatarUrl: '',
        rating: 5,
        isActive: true
    });
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingAvatar(true);
        try {
            const url = await uploadToCloudinary(file);
            setForm(prev => ({ ...prev, avatarUrl: url }));
            useStore.getState().addToast('Creator photo uploaded!', 'success');
        } catch (err) {
            useStore.getState().addToast('Photo upload failed.', 'error');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleAdd = async (e) => {
        if (e) e.preventDefault();
        if (!form.name.trim() || !form.quote.trim()) {
            useStore.getState().addToast('Creator Name and Testimonial Quote are required.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await addCreatorTestimonial({
                name: form.name.trim(),
                city: form.city.trim() || 'Pan-India',
                niche: form.niche.trim() || 'Creator',
                handle: form.handle.trim() ? form.handle.trim().replace(/^@/, '') : '',
                quote: form.quote.trim(),
                avatarUrl: form.avatarUrl || '',
                rating: Number(form.rating) || 5,
                isActive: form.isActive !== false
            });

            setForm({
                name: '',
                city: 'Bengaluru',
                niche: '',
                handle: '',
                quote: '',
                avatarUrl: '',
                rating: 5,
                isActive: true
            });
            useStore.getState().addToast('Authentic testimonial added!', 'success');
        } catch (err) {
            console.error('Error adding testimonial:', err);
            useStore.getState().addToast('Failed to add testimonial.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete testimonial from ${name}?`)) return;
        try {
            await deleteCreatorTestimonial(id);
            useStore.getState().addToast('Testimonial removed.', 'success');
        } catch (err) {
            useStore.getState().addToast('Failed to delete testimonial.', 'error');
        }
    };

    const handleToggleActive = async (id, currentStatus) => {
        try {
            await updateCreatorTestimonial(id, { isActive: !currentStatus });
            useStore.getState().addToast(`Testimonial marked ${!currentStatus ? 'Active' : 'Hidden'}.`, 'info');
        } catch (err) {
            useStore.getState().addToast('Failed to update status.', 'error');
        }
    };

    const activeCount = (creatorTestimonials || []).filter(t => t.isActive !== false).length;

    return (
        <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <h2 className="text-xl font-black font-heading tracking-tight uppercase italic text-neon-pink flex items-center gap-2">
                        <MessageSquareQuote size={20} className="text-neon-pink" />
                        Creator Testimonials
                    </h2>
                    <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500 dark:text-zinc-400 bg-black/[0.04] dark:bg-white/[0.05] px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 shrink-0">
                    {activeCount} Active / {creatorTestimonials?.length || 0} Total
                </div>
            </div>

            <Card className="p-6 sm:p-8 bg-gray-100 dark:bg-zinc-900/40 backdrop-blur-3xl border-black/10 dark:border-white/5 rounded-[2.5rem] space-y-8">
                {/* Form to add real testimonial */}
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            Add Authentic Creator Testimonial
                        </p>
                        <span className="text-[10px] text-gray-500 dark:text-zinc-400">
                            Only active testimonials added here will appear on the creator landing page
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                        {/* Creator Name */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Creator Name
                            </label>
                            <div className="relative">
                                <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. Priya Sharma"
                                    className="h-12 pl-11 bg-white dark:bg-black/50 border-black/10 dark:border-white/10 rounded-xl text-xs font-bold"
                                />
                            </div>
                        </div>

                        {/* City */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Creator City
                            </label>
                            <div className="relative">
                                <MapPin size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={form.city}
                                    onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                                    className="w-full h-12 pl-11 pr-4 bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-neon-pink"
                                >
                                    {PREDEFINED_CITIES.map(c => (
                                        <option key={c} value={c} className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Niche */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Specialization / Niche
                            </label>
                            <Input
                                value={form.niche}
                                onChange={(e) => setForm(prev => ({ ...prev, niche: e.target.value }))}
                                placeholder="e.g. Lifestyle &amp; Fashion"
                                className="h-12 bg-white dark:bg-black/50 border-black/10 dark:border-white/10 rounded-xl text-xs font-medium"
                            />
                        </div>

                        {/* Handle / Followers */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Handle or Audience Metric
                            </label>
                            <Input
                                value={form.handle}
                                onChange={(e) => setForm(prev => ({ ...prev, handle: e.target.value }))}
                                placeholder="e.g. @priyastyle or 45K"
                                className="h-12 bg-white dark:bg-black/50 border-black/10 dark:border-white/10 rounded-xl text-xs font-medium"
                            />
                        </div>

                        {/* Quote Text */}
                        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Testimonial Quote
                            </label>
                            <textarea
                                value={form.quote}
                                onChange={(e) => setForm(prev => ({ ...prev, quote: e.target.value }))}
                                rows={3}
                                placeholder="Describe their authentic experience working with Newbi brand campaigns or concert access..."
                                className="w-full p-3 bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-neon-pink leading-relaxed resize-none"
                            />
                        </div>

                        {/* Avatar Upload */}
                        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Creator Photo / Avatar
                            </label>
                            <div className="space-y-2">
                                <label className="h-12 w-full px-4 rounded-xl bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    {uploadingAvatar ? 'Uploading...' : <><ImageIcon size={15} /> Upload Photo</>}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                                </label>
                                {form.avatarUrl && (
                                    <div className="flex items-center gap-2">
                                        <img src={form.avatarUrl} alt="Preview" className="w-8 h-8 rounded-full object-cover border border-black/10" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-neon-green">Photo Ready</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button
                            type="button"
                            onClick={handleAdd}
                            disabled={submitting || !form.name.trim() || !form.quote.trim()}
                            className="h-11 px-6 rounded-xl bg-neon-pink text-white font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-40 flex items-center gap-2 shadow-sm"
                        >
                            <Plus size={14} /> Add Testimonial
                        </Button>
                    </div>
                </div>

                {/* Existing Testimonials */}
                <div className="space-y-4 pt-6 border-t border-black/10 dark:border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        Configured Testimonials ({creatorTestimonials?.length || 0})
                    </p>

                    {(!creatorTestimonials || creatorTestimonials.length === 0) ? (
                        <div className="p-8 text-center rounded-2xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 space-y-1">
                            <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">
                                No testimonials added yet.
                            </p>
                            <p className="text-xs text-gray-500 dark:text-zinc-500">
                                The creator landing page stays clean and will only display testimonials when authentic entries are added above.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {creatorTestimonials.map(t => (
                                <div
                                    key={t.id}
                                    className={cn(
                                        "p-5 rounded-2xl bg-white dark:bg-black/30 border transition-all flex flex-col justify-between gap-3",
                                        t.isActive !== false ? "border-black/10 dark:border-white/10" : "border-red-500/20 opacity-60"
                                    )}
                                >
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                {t.avatarUrl ? (
                                                    <img src={t.avatarUrl} alt={t.name} className="w-9 h-9 rounded-full object-cover border border-black/10" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-black text-white dark:bg-white/10 flex items-center justify-center font-bold text-xs">
                                                        {t.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                        {t.name}
                                                    </h4>
                                                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">
                                                        {t.city} &bull; {t.niche}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleActive(t.id, t.isActive !== false)}
                                                className={cn(
                                                    "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all flex items-center gap-1",
                                                    t.isActive !== false 
                                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" 
                                                        : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                                                )}
                                            >
                                                {t.isActive !== false ? <><Eye size={10} /> Active</> : <><EyeOff size={10} /> Hidden</>}
                                            </button>
                                        </div>

                                        <p className="text-xs text-gray-700 dark:text-zinc-300 italic line-clamp-4 leading-relaxed">
                                            &ldquo;{t.quote}&rdquo;
                                        </p>
                                    </div>

                                    <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] text-gray-500">
                                        <span>{t.handle ? `@${t.handle}` : 'Verified Creator'}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(t.id, t.name)}
                                            className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors"
                                            title="Delete Testimonial"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        </section>
    );
};

export default CreatorTestimonialsManager;
