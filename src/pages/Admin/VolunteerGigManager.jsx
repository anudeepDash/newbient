import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit, Save, Loader, Calendar, MapPin, Users, ArrowUp, ArrowDown, Megaphone, ArrowLeft, Sparkles, Palette, Image as ImageIcon, X, Pin, FileText } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

import { cn } from '../../lib/utils';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import StudioDatePicker from '../../components/ui/StudioDatePicker';
import StudioTimePicker from '../../components/ui/StudioTimePicker';
import StudioSelect from '../../components/ui/StudioSelect';

const VolunteerGigManager = () => {
    const colorPresets = [
        { name: 'Neon Green', value: '#39FF14' },
        { name: 'Neon Pink', value: '#FF4F8B' },
        { name: 'Electric Purple', value: '#BF00FF' },
        { name: 'Cyber Blue', value: '#2ebfff' },
    ];

    const { volunteerGigs, addVolunteerGig, updateVolunteerGig, deleteVolunteerGig, reorderVolunteerGigs, addAnnouncement, uploadToCloudinary } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [previewType, setPreviewType] = useState('card');
    const [isUploading, setIsUploading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        dates: [],
        tempDate: '',
        time: '',
        location: '',
        description: '',
        status: 'Open',
        applyType: 'link', // 'link' | 'whatsapp'
        applyLink: '', // URL or Phone Number
        whatsappLink: '', // Optional Group Link
        image: '',
        highlightColor: '#39FF14',
        isPinned: false,
        imageTransform: { scale: 1.05, x: 0, y: 0 }
    });

    const resetForm = () => {
        setFormData({ 
            title: '', dates: [], tempDate: '', time: '', location: '', description: '', status: 'Open', applyType: 'link', applyLink: '', whatsappLink: '',
            image: '', highlightColor: '#39FF14', isPinned: false, imageTransform: { scale: 1.05, x: 0, y: 0 }
        });
        setIsAdding(false);
        setEditingId(null);
        setSaving(false);
        setIsUploading(false);
    };

    const handleEdit = (gig) => {
        // Pre-process dates to ensure they are clean strings (yyyy-mm-dd)
        const rawDates = gig.dates || (gig.date ? [gig.date] : []);
        const cleanDates = rawDates.map(d => {
            if (!d) return null;
            if (typeof d === 'string') return d.split('T')[0];
            if (d.seconds) return new Date(d.seconds * 1000).toISOString().split('T')[0];
            try {
                const dateObj = new Date(d);
                if (!isNaN(dateObj.getTime())) return dateObj.toISOString().split('T')[0];
            } catch (e) {}
            return null;
        }).filter(Boolean);

        setFormData({
            title: gig.title,
            dates: cleanDates,
            tempDate: '',
            time: gig.time || '',
            location: gig.location,
            description: gig.description || '',
            status: gig.status || 'Open',
            applyType: gig.applyType || 'link',
            applyLink: gig.applyLink || '',
            whatsappLink: gig.whatsappLink || '',
            image: gig.image || '',
            highlightColor: gig.highlightColor || '#39FF14',
            isPinned: gig.isPinned || false,
            imageTransform: gig.imageTransform || { scale: 1.05, x: 0, y: 0 }
        });
        setEditingId(gig.id);
        setIsAdding(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const gigData = { ...formData };
            delete gigData.id;
            delete gigData.tempDate; // Clean up internal UI state

            if (editingId) {
                await updateVolunteerGig(editingId, gigData);
            } else {
                await addVolunteerGig(gigData);
                // Notify All Users about new gig
                await notifyAllUsers(
                    'NEW VOLUNTEER GIG!',
                    `${gigData.title.toUpperCase()} IS NOW LIVE. APPLY NOW.`,
                    '/community',
                    'gig'
                );
            }
            resetForm();
        } catch (error) {
            console.error(error);
            useStore.getState().addToast(`Error saving gig: ${error.code || error.message}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePushAnnouncement = async (gig) => {
        if (confirm(`Post an announcement for "${gig.title}"?`)) {
            await addAnnouncement({
                title: `New Volunteer Opportunity: ${gig.title}`,
                content: gig.description || `We are looking for volunteers for ${gig.title} at ${gig.location}. Apply now!`,
                date: new Date().toISOString().split('T')[0],
                isPinned: false,
                link: gig.applyLink || '',
                type: 'volunteer_gig'
            });
            useStore.getState().addToast('Announcement posted!', 'success');
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await uploadToCloudinary(file);
            setFormData(prev => ({ ...prev, image: url }));
        } catch (error) {
            console.error("Upload failed:", error);
            useStore.getState().addToast("UPLOAD FAILED. PLEASE TRY AGAIN.", 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const moveGig = async (index, direction) => {
        const newGigs = [...volunteerGigs];
        if (direction === 'up' && index > 0) {
            [newGigs[index], newGigs[index - 1]] = [newGigs[index - 1], newGigs[index]];
        } else if (direction === 'down' && index < newGigs.length - 1) {
            [newGigs[index], newGigs[index + 1]] = [newGigs[index + 1], newGigs[index]];
        }
        await reorderVolunteerGigs(newGigs);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'TBD';
        
        // Handle input format (likely yyyy-mm-dd from StudioDatePicker)
        const s = String(dateStr);
        if (s.includes('-')) {
            const parts = s.split('-');
            if (parts.length === 3) {
                const [y, m, d] = parts;
                return `${d}-${m}-${y}`;
            }
        }
        
        // Final fallback for display
        try {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('en-GB').replace(/\//g, '-');
            }
        } catch (e) {}
        
        return s;
    };

    if (isAdding) {
        return (
            <div className="min-h-screen bg-[#020202] text-white pt-24 md:pt-32 pb-20 relative overflow-x-hidden">
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-[10%] right-[-5%] w-[40%] h-[40%] bg-neon-green/5 rounded-full blur-[150px]" />
                </div>
                
                <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-24 md:pt-32">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <AdminDashboardLink />
                                <div className="flex items-center gap-3">
                                    <Sparkles size={16} className="text-neon-green" />
                                    <span className="text-neon-green text-[10px] font-black uppercase tracking-[0.4em]">Operations Hub</span>
                                </div>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-4">
                                GIG <span className="text-neon-green">MANAGEMENT.</span>
                            </h1>
                        </div>
                        
                        <div className="flex gap-4">
                            <Button type="button" onClick={resetForm} className="h-14 px-8 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-white hover:text-black transition-all">
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleSave} 
                                disabled={saving}
                                className="h-20 px-16 bg-neon-green text-black font-black uppercase tracking-[0.3em] text-[12px] rounded-[1.5rem] shadow-[0_15px_40px_rgba(57,255,20,0.3)] hover:scale-105 active:scale-95 transition-all border-none flex items-center justify-center gap-3"
                            >
                                {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                                {saving ? 'Processing...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start min-h-[700px] mb-20">
                        {/* Editor Column */}
                        <div className="h-full">
                            <Card className="p-6 md:p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[3rem] shadow-2xl h-full flex flex-col">
                                <form onSubmit={handleSave} className="space-y-10 flex-grow flex flex-col">
                                {/* SECTION 1: IDENTITY & STATUS */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">EVENT TITLE</label>
                                        <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required 
                                            className="h-14 bg-black/50 border-white/5 rounded-xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-green/40" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">GIG STATUS</label>
                                        <StudioSelect
                                            value={formData.status}
                                            options={[
                                                { value: 'Open', label: 'OPEN' },
                                                { value: 'Filling Fast', label: 'FILLING FAST' },
                                                { value: 'Closed', label: 'CLOSED' }
                                            ]}
                                            onChange={val => setFormData({ ...formData, status: val })}
                                            className="h-14"
                                            accentColor="neon-green"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="md:col-span-2 space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">WORKING DAYS</label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {formData.dates.map((d, index) => (
                                                <div key={index} className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase">
                                                    <span>{formatDate(d)}</span>
                                                    <button type="button" onClick={() => setFormData({ ...formData, dates: formData.dates.filter((_, i) => i !== index) })} className="text-red-400 hover:text-red-300">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <StudioDatePicker 
                                                value={formData.tempDate} 
                                                onChange={(val) => setFormData({ ...formData, tempDate: val })} 
                                                className="flex-1 h-14"
                                            />
                                            <button 
                                                type="button" 
                                                className="bg-neon-green/10 text-neon-green border hover:bg-neon-green hover:text-black border-neon-green/30 h-14 px-6 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all" 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log("Adding date:", formData.tempDate);
                                                    const dateVal = formData.tempDate;
                                                    if (dateVal && dateVal !== '') {
                                                        const currentDates = Array.isArray(formData.dates) ? formData.dates : [];
                                                        if (!currentDates.includes(dateVal)) {
                                                            try {
                                                                const newDates = [...currentDates, dateVal].sort((a, b) => {
                                                                    const dA = new Date(a).getTime();
                                                                    const dB = new Date(b).getTime();
                                                                    if (isNaN(dA) || isNaN(dB)) return 0;
                                                                    return dA - dB;
                                                                });
                                                                setFormData(prev => ({ ...prev, dates: newDates, tempDate: '' }));
                                                            } catch (err) {
                                                                console.error("Sort failed:", err);
                                                                setFormData(prev => ({ ...prev, dates: [...currentDates, dateVal], tempDate: '' }));
                                                            }
                                                        }
                                                    }
                                                }}
                                            >
                                                ADD DAY
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">REPORTING TIME (OPTIONAL)</label>
                                        <StudioTimePicker 
                                            value={formData.time} 
                                            onChange={(val) => setFormData({ ...formData, time: val })} 
                                            className="h-14"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">LOCATION</label>
                                        <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required 
                                            className="h-14 bg-black/50 border-white/5 rounded-xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-green/40" />
                                    </div>
                                </div>

                                {/* SECTION 3: APPLICATION CONFIGURATION */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">APPLICATION METHOD</label>
                                        <StudioSelect
                                            value={formData.applyType}
                                            options={[
                                                { value: 'link', label: 'WEBSITE LINK / FORM' },
                                                { value: 'whatsapp', label: 'WHATSAPP DM' }
                                            ]}
                                            onChange={val => setFormData({ ...formData, applyType: val })}
                                            className="h-14"
                                            accentColor="neon-green"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                                            {formData.applyType === 'whatsapp' ? 'WHATSAPP NUMBER' : 'LINK URL'}
                                        </label>
                                        <Input
                                            value={formData.applyLink}
                                            onChange={e => setFormData({ ...formData, applyLink: e.target.value })}
                                            placeholder={formData.applyType === 'whatsapp' ? '919304372773' : 'HTTPS://'}
                                            className="h-14 bg-black/50 border-white/5 rounded-xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-green/40"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">COMMUNITY GROUP LINK (OPTIONAL)</label>
                                        <Input
                                            value={formData.whatsappLink}
                                            onChange={e => setFormData({ ...formData, whatsappLink: e.target.value })}
                                            placeholder="HTTPS://CHAT.WHATSAPP.COM/..."
                                            className="h-14 bg-black/50 border-white/5 rounded-xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-green/40"
                                        />
                                    </div>
                                </div>

                                {/* SECTION 4: MISSION BRIEF */}
                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                        <FileText size={16} className="text-neon-green" /> BRIEF / INSTRUCTIONS
                                    </label>
                                    <textarea 
                                        className="w-full bg-black/60 border border-white/5 rounded-3xl p-8 text-white focus:outline-none focus:border-neon-green/40 min-h-[200px] resize-none text-[13px] font-medium placeholder:text-gray-800 leading-relaxed shadow-inner" 
                                        value={formData.description} 
                                        onChange={e => setFormData({ ...formData, description: e.target.value })} 
                                        placeholder="Specify gig details, roles, or entry conditions..." 
                                    />
                                </div>

                                {/* PREMIUM BRANDING & MEDIA */}
                                <div className="space-y-8 pt-6 border-t border-white/10">
                                    <label className="text-[11px] font-black text-neon-green uppercase tracking-[0.4em] flex items-center gap-2">
                                        <Palette size={16} /> PREMIUM BRANDING & MEDIA
                                    </label>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">COVER ASSET</label>
                                            <div className="flex gap-4">
                                                <div className="relative flex-1">
                                                    <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                                    <Input 
                                                        value={formData.image} 
                                                        onChange={e => setFormData({ ...formData, image: e.target.value })} 
                                                        placeholder="IMAGE_URL" 
                                                        className="pl-14 font-mono text-[9px] h-14 bg-black/40 border-white/5 rounded-xl focus:border-neon-green/40" 
                                                    />
                                                </div>
                                                <div className="relative group w-14">
                                                    <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                    <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center border-2 border-dashed transition-all", isUploading ? "border-neon-green bg-neon-green/10 text-neon-green" : "border-white/10 bg-white/5 text-gray-500 hover:border-white/20")}>
                                                        {isUploading ? <Loader className="animate-spin" size={20} /> : <Plus size={20} />}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Theme Accent Color</label>
                                            <div className="flex items-center gap-4 h-14 bg-black/40 border border-white/5 rounded-xl px-6">
                                                {colorPresets.map(color => (
                                                    <button 
                                                        key={color.value} 
                                                        type="button" 
                                                        onClick={() => setFormData({ ...formData, highlightColor: color.value })} 
                                                        className={cn(
                                                            "w-8 h-8 rounded-full border-2 transition-all relative hover:scale-110", 
                                                            formData.highlightColor === color.value ? "border-white shadow-[0_0_15px_rgba(57,255,20,0.4)]" : "border-black/50"
                                                        )} 
                                                        style={{ backgroundColor: color.value }} 
                                                    />
                                                ))}
                                                <div className="w-[1px] h-6 bg-white/10 mx-2" />
                                                <div className="relative w-8 h-8 rounded-full border-2 border-white/10 p-0.5 bg-zinc-950 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => document.getElementById('spectrum-picker').click()}>
                                                    <div className="w-full h-full rounded-full" style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)', transform: 'rotate(-45deg)' }} />
                                                    <input id="spectrum-picker" type="color" value={formData.highlightColor} onChange={e => setFormData({ ...formData, highlightColor: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* IMAGE ADJUSTMENT ENGINE */}
                                <div className="p-10 rounded-3xl bg-black/40 border border-white/5 space-y-10">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-neon-green italic">Image Positioning</h4>
                                        <button 
                                            type="button" 
                                            onClick={() => setFormData({ ...formData, imageTransform: { scale: 1.05, x: 0, y: 0 } })} 
                                            className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
                                        >
                                            <X size={12} /> Reset Adjustment
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-2">
                                        <div className="space-y-4">
                                            <div className="flex justify-between">
                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Zoom Level</label>
                                                <span className="text-[9px] font-mono text-neon-green">{(formData.imageTransform.scale).toFixed(2)}x</span>
                                            </div>
                                            <input type="range" min="0.5" max="2.5" step="0.01" value={formData.imageTransform.scale} onChange={e => setFormData({ ...formData, imageTransform: { ...formData.imageTransform, scale: parseFloat(e.target.value) } })} className="w-full accent-neon-green" />
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between">
                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Pan X (Horizontal)</label>
                                                <span className="text-[9px] font-mono text-neon-green">{formData.imageTransform.x}%</span>
                                            </div>
                                            <input type="range" min="-100" max="100" step="1" value={formData.imageTransform.x} onChange={e => setFormData({ ...formData, imageTransform: { ...formData.imageTransform, x: parseInt(e.target.value) } })} className="w-full accent-neon-green" />
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between">
                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Pan Y (Vertical)</label>
                                                <span className="text-[9px] font-mono text-neon-green">{formData.imageTransform.y}%</span>
                                            </div>
                                            <input type="range" min="-100" max="100" step="1" value={formData.imageTransform.y} onChange={e => setFormData({ ...formData, imageTransform: { ...formData.imageTransform, y: parseInt(e.target.value) } })} className="w-full accent-neon-green" />
                                        </div>
                                    </div>
                                </div>

                                {/* SPOTLIGHT PIN */}
                                <div className={cn(
                                    "p-10 rounded-[2.5rem] border flex items-center justify-between transition-all duration-500 mb-6", 
                                    formData.isPinned ? "bg-neon-green/10 border-neon-green/40 shadow-[0_0_40px_rgba(57,255,20,0.05)]" : "bg-black/40 border-white/5"
                                )}>
                                    <div className="flex items-center gap-8">
                                        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl", formData.isPinned ? "bg-neon-green text-black" : "bg-white/5 text-gray-600")}>
                                            <Pin size={28} className={cn(formData.isPinned && "fill-current")} />
                                        </div>
                                        <div>
                                            <h4 className="text-white text-sm font-black uppercase tracking-widest italic leading-tight">SPOTLIGHT PIN BROADCAST</h4>
                                            <p className="text-[10px] text-gray-600 mt-1 uppercase font-bold tracking-[0.1em]">Featured position in the Pulse Community Directory.</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })} 
                                        className={cn("w-16 h-9 rounded-full relative transition-all border-2", formData.isPinned ? "bg-neon-green border-neon-green" : "bg-black/60 border-white/10")}
                                    >
                                        <div className={cn("absolute top-1 w-6 h-6 rounded-full transition-all shadow-lg", formData.isPinned ? "right-1 bg-black" : "left-1 bg-gray-600")} />
                                    </button>
                                </div>

                                <div className="flex justify-end gap-4 pt-4 mt-auto border-t border-white/10">
                                    <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                                    <Button 
                                        type="submit" 
                                        disabled={saving}
                                        className="h-20 px-16 bg-neon-green text-black font-black uppercase tracking-[0.3em] text-[12px] italic rounded-[1.5rem] shadow-[0_15px_40px_rgba(57,255,20,0.3)] hover:scale-105 active:scale-95 transition-all border-none flex items-center justify-center gap-3 min-w-[240px]"
                                    >
                                        {saving ? <Loader className="animate-spin h-6 w-6" /> : <Save className="h-6 w-6" />}
                                        {editingId ? 'UPDATE GIG' : 'SAVE GIG'}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                        </div>

                        {/* Preview Column */}
                        <div className="h-full flex flex-col gap-8 lg:sticky lg:top-32">
                            <div className="space-y-8">
                                {/* Tab Toggle */}
                                <div className="flex bg-zinc-900/60 border border-white/5 p-1.5 rounded-2xl w-fit backdrop-blur-xl">
                                    <button 
                                        onClick={() => setPreviewType('card')}
                                        className={cn(
                                            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                            previewType === 'card' ? "bg-neon-green text-black" : "text-gray-500 hover:text-white"
                                        )}
                                    >
                                        Card View
                                    </button>
                                    <button 
                                        onClick={() => setPreviewType('embed')}
                                        className={cn(
                                            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                            previewType === 'embed' ? "bg-neon-green text-black" : "text-gray-500 hover:text-white"
                                        )}
                                    >
                                        Embed View
                                    </button>
                                </div>

                                <div className="pt-4">
                                    {previewType === 'card' ? (
                                        <LivePreview type="gig" data={formData} hideDecorations={false} />
                                    ) : (
                                        <div className="h-[500px] rounded-[3rem] border border-white/5 bg-zinc-900/40 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center">
                                            <div className="w-16 h-16 rounded-full bg-neon-green/10 flex items-center justify-center mb-6">
                                                <Megaphone className="text-neon-green" size={32} />
                                            </div>
                                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-3">Public Deployment</h3>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-relaxed max-w-xs">
                                                This reflects how the gig will appear in the main community feed for all members.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <AdminCommunityHubLayout 
            title="Volunteer Management" 
            description="Create and manage open roles for the community members."
            studioHeader={{
                title: "GIG",
                subtitle: "MANAGEMENT",
                accentClass: "text-neon-green"
            }}
        >
            <div className="relative z-10 max-w-[1400px] mx-auto pb-32">
                {/* Mode Actions */}
                <div className="flex justify-end mb-12">
                    <Button onClick={() => {
                        resetForm();
                        setIsAdding(true);
                    }} className="h-20 px-16 bg-neon-green text-black font-black uppercase tracking-[0.3em] text-[12px] rounded-[1.5rem] shadow-[0_15px_40px_rgba(57,255,20,0.3)] hover:scale-105 active:scale-95 transition-all outline-none border-none flex items-center justify-center gap-3">
                        <Plus size={20} /> New Assignment
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                        {volunteerGigs && volunteerGigs.length > 0 ? (
                            volunteerGigs.map((gig) => (
                                <Card key={gig.id} className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] hover:border-neon-blue/30 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,255,255,0.05)]">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-xl font-bold text-white">{gig.title}</h3>
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${gig.status === 'Open' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                {gig.status}
                                            </span>
                                            {gig.applyType === 'whatsapp' && <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-green-400">WA</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-2">
                                            <span className="flex items-center gap-1"><Calendar size={14} /> {gig.dates && gig.dates.length > 0 ? (gig.dates.length > 1 ? `${gig.dates.length} Days` : gig.dates[0]) : gig.date}</span>
                                            <span className="flex items-center gap-1"><MapPin size={14} /> {gig.location}</span>
                                            {gig.description && <span className="flex items-center gap-1 line-clamp-1 max-w-md italic opacity-70">"{gig.description}"</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 self-end md:self-center">
                                        <div className="flex flex-col mr-2">
                                            <button onClick={() => moveGig(volunteerGigs.indexOf(gig), 'up')} disabled={volunteerGigs.indexOf(gig) === 0} className="p-1 hover:text-white text-gray-500 disabled:opacity-30">
                                                <ArrowUp size={14} />
                                            </button>
                                            <button onClick={() => moveGig(volunteerGigs.indexOf(gig), 'down')} disabled={volunteerGigs.indexOf(gig) === volunteerGigs.length - 1} className="p-1 hover:text-white text-gray-500 disabled:opacity-30">
                                                <ArrowDown size={14} />
                                            </button>
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            onClick={async () => {
                                                if (window.confirm(`Transmit broadcast update for "${gig.title}"?`)) {
                                                    await notifyAllUsers(
                                                        `Volunteers Needed: ${gig.title}`,
                                                        `Join the Newbi squad for ${gig.title} at ${gig.location}. Apply now!`,
                                                        `/community`,
                                                        ''
                                                    );
                                                    useStore.getState().addToast("BROADCAST_COMPLETE.", 'error');
                                                }
                                            }}
                                            className="p-2 h-auto text-neon-pink border-neon-pink/20 hover:bg-neon-pink hover:text-black transition-all" 
                                            title="Direct Broadcast"
                                        >
                                            <Sparkles size={16} />
                                        </Button>
                                        <Button variant="outline" onClick={() => handlePushAnnouncement(gig)} className="p-2 h-auto text-neon-blue hover:text-neon-blue hover:border-neon-blue" title="Post to Announcements">
                                            <Megaphone size={16} />
                                        </Button>
                                        <Button variant="outline" onClick={() => handleEdit(gig)} className="p-2 h-auto">
                                            <Edit size={16} />
                                        </Button>
                                        <Button variant="outline" onClick={() => deleteVolunteerGig(gig.id)} className="p-2 h-auto text-red-400 hover:text-red-500 hover:border-red-500">
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <div className="col-span-full py-16 text-center text-gray-500 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                                <p className="mb-2">No volunteer opportunities posted.</p>
                                <Button 
                                    variant="link" 
                                    onClick={() => setIsAdding(true)} 
                                    className="text-neon-green p-0 h-auto font-black uppercase tracking-widest text-[10px]"
                                >
                                    Create the first gig
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </AdminCommunityHubLayout>
        );
    };
    
export default VolunteerGigManager;
