import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Save from 'lucide-react/dist/esm/icons/save';
import Loader from 'lucide-react/dist/esm/icons/loader';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Users from 'lucide-react/dist/esm/icons/users';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Palette from 'lucide-react/dist/esm/icons/palette';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import X from 'lucide-react/dist/esm/icons/x';
import Pin from 'lucide-react/dist/esm/icons/pin';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import Star from 'lucide-react/dist/esm/icons/star';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Unlock from 'lucide-react/dist/esm/icons/unlock';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { cn } from '../../lib/utils';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import StudioDatePicker from '../../components/ui/StudioDatePicker';
import StudioTimePicker from '../../components/ui/StudioTimePicker';
import StudioSelect from '../../components/ui/StudioSelect';


const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    const s = String(dateStr);
    if (s.includes('-')) {
        const parts = s.split('-');
        if (parts.length === 3) {
            const [y, m, d] = parts;
            return `${d}-${m}-${y}`;
        }
    }
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('en-GB').replace(/\//g, '-');
        }
    } catch (e) {}
    return s;
};

const GigCard = ({ gig, index, totalGigs, onEdit, onMove, onUpdate, onDelete }) => {
    const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setMousePos({ x, y });
    };

    return (
        <Card 
            key={gig.id} 
            onMouseMove={handleMouseMove}
            className="p-0 bg-zinc-950/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-neon-green/30 transition-all duration-700 shadow-2xl flex flex-col h-[480px] relative"
            style={{ 
                background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, ${gig.highlightColor || '#39FF14'}10 0%, transparent 60%)`
            }}
        >
            {/* Card Header Media */}
            <div className="h-44 relative overflow-hidden">
                {gig.image ? (
                    <img 
                        src={gig.image} 
                        alt={gig.title} 
                        className="w-full h-full object-cover opacity-40 group-hover:opacity-70 group-hover:scale-110 transition-all duration-1000" 
                        style={{
                            transform: `scale(${gig.imageTransform?.scale || 1.05})`,
                            objectPosition: `${50 + (gig.imageTransform?.x || 0)}% ${50 + (gig.imageTransform?.y || 0)}%`
                        }}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
                        <Zap size={48} className="text-white/10" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                
                <div className="absolute top-6 right-6 flex gap-2">
                    <div className={cn(
                        "px-3 h-6 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-3xl",
                        gig.status === 'Open' ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                    )}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        {gig.status || 'ACTIVE'}
                    </div>
                    {gig.isPinned && (
                        <div className="w-8 h-8 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 shadow-xl backdrop-blur-3xl">
                            <Star size={14} className="fill-current" />
                        </div>
                    )}
                </div>

                <div className="absolute bottom-6 left-8 right-8">
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white truncate drop-shadow-2xl">{gig.title}</h3>
                    <div className="flex items-center gap-4 mt-2 opacity-60">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Calendar size={12} className="text-neon-green" /> {gig.dates && gig.dates.length > 0 ? (gig.dates.length > 1 ? `${gig.dates.length} DAYS` : gig.dates[0]) : gig.date || 'TBA'}
                        </span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <MapPin size={12} className="text-neon-green" /> {gig.location || 'GLOBAL'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Card Content */}
            <div className="p-8 flex-grow flex flex-col justify-between">
                <div className="space-y-4">
                    <div className="flex items-center gap-4 text-white/20">
                        <div className="w-10 h-[1px] bg-current" />
                        <span className="text-[9px] font-black uppercase tracking-[0.4em]">DESCRIPTION</span>
                    </div>
                    <p className="text-[12px] font-medium text-gray-400 uppercase tracking-widest line-clamp-3 italic leading-relaxed">
                        {gig.description || "EMPTY."}
                    </p>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            onClick={async () => {
                                if (confirm(`Send a notification for "${gig.title}"?`)) {
                                    await notifyAllUsers(`Volunteers Needed: ${gig.title}`, `Join the squad for ${gig.title} at ${gig.location}. Apply now!`, `/community`, '');
                                    useStore.getState().addToast("Notification sent to all volunteers!", 'success');
                                }
                            }}
                            className="flex-1 h-14 rounded-2xl border-white/5 bg-yellow-500/5 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all flex items-center justify-center gap-3 group/btn"
                        >
                            <Megaphone size={20} className="group-hover/btn:rotate-12 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">NOTIFY</span>
                        </Button>
                        <div className="flex bg-white/5 rounded-2xl p-1.5 border border-white/5">
                            <button onClick={() => onMove(index, 'up')} disabled={index === 0} className="p-3 hover:text-white text-gray-500 disabled:opacity-20 transition-all">
                                <ArrowUp size={20} />
                            </button>
                            <button onClick={() => onMove(index, 'down')} disabled={index === totalGigs - 1} className="p-3 hover:text-white text-gray-500 disabled:opacity-20 transition-all">
                                <ArrowDown size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            onClick={() => onEdit(gig)} 
                            className="h-14 flex-[2] rounded-2xl border-white/5 bg-white/5 hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3"
                        >
                            <Edit size={22} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">EDIT GIG</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                const newStatus = gig.status === 'Open' ? 'Closed' : 'Open';
                                onUpdate(gig.id, { ...gig, status: newStatus });
                            }}
                            className={cn(
                                "h-14 w-14 rounded-2xl border-white/5 transition-all flex items-center justify-center",
                                gig.status === 'Open' ? "bg-neon-green/10 text-neon-green hover:bg-neon-green hover:text-black shadow-[0_0_20px_rgba(57,255,20,0.1)]" : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                            )}
                            title={gig.status === 'Open' ? "Close Entries" : "Open Entries"}
                        >
                            {gig.status === 'Open' ? <Unlock size={24} /> : <Lock size={24} />}
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => { if(confirm('Permanently delete this gig?')) onDelete(gig.id); }}
                            className="h-14 w-14 rounded-2xl bg-red-500 text-white border-none hover:bg-red-600 transition-all flex items-center justify-center shrink-0 shadow-xl"
                        >
                            <Trash2 size={26} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Shimmer Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
                style={{ background: `linear-gradient(${mousePos.x}deg, transparent 40%, ${gig.highlightColor || '#39FF14'}05 50%, transparent 60%)` }}
            />
        </Card>
    );
};

const VolunteerGigManager = () => {
    const navigate = useNavigate();
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
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const gigData = { ...formData };
            delete gigData.tempDate;

            if (editingId) {
                await updateVolunteerGig(editingId, gigData);
            } else {
                await addVolunteerGig(gigData);
                await notifyAllUsers(
                    'New Volunteer Opportunity!',
                    `A new opportunity for ${gigData.title} is now available. Apply now!`,
                    '/community',
                    'gig'
                );
            }
            useStore.getState().addToast(`Gig ${editingId ? 'updated' : 'created'} successfully!`, 'success');
            resetForm();
        } catch (error) {
            console.error(error);
            useStore.getState().addToast(`Something went wrong while saving. Please try again.`, 'error');
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
            useStore.getState().addToast("Couldn't upload the image. Please try again.", 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handlePaste = async (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                setIsUploading(true);
                try {
                    const url = await uploadToCloudinary(file);
                    setFormData(prev => ({ ...prev, image: url }));
                    useStore.getState().addToast("Image pasted from clipboard!", 'success');
                } catch (error) {
                    console.error("Upload failed:", error);
                    useStore.getState().addToast("Couldn't upload the pasted image. Please try again.", 'error');
                } finally {
                    setIsUploading(false);
                }
                e.preventDefault();
            }
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


    if (isAdding) {
        return (
            <AdminCommunityHubLayout 
                hideTabs 
                studioHeader={{
                    title: "GIG",
                    subtitle: editingId ? "EDITOR" : "CREATOR",
                    accentClass: "text-neon-green"
                }}
            >
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 items-stretch mb-20 relative z-10">
                    {/* Editor Column */}
                    <div className="w-full">
                        <Card className="p-8 md:p-12 bg-zinc-950/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                            {/* Ambient Background Glow */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-neon-green/5 rounded-full blur-[100px] pointer-events-none" />
                            
                            <form onSubmit={handleSave} className="space-y-12 relative z-10">
                                <div className="space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">TITLE</label>
                                            <Input 
                                                value={formData.title} 
                                                onChange={e => setFormData({ ...formData, title: e.target.value })} 
                                                required 
                                                placeholder="e.g. EVENT CREW"
                                                className="h-14 bg-black/60 border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-green/40" 
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">STATUS</label>
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

                                    <div className="space-y-6 p-8 rounded-[2rem] bg-black/40 border border-white/5">
                                        <label className="text-[10px] font-black text-neon-green uppercase tracking-[0.3em] pl-1">DATES</label>
                                        <div className="flex flex-wrap gap-3">
                                            {formData.dates.map((d, index) => (
                                                <div key={index} className="flex items-center gap-3 bg-zinc-900 border border-white/5 px-4 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase text-white shadow-lg">
                                                    <span>{formatDate(d)}</span>
                                                    <button type="button" onClick={() => setFormData({ ...formData, dates: formData.dates.filter((_, i) => i !== index) })} className="text-red-500 hover:scale-125 transition-transform">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-4">
                                            <StudioDatePicker 
                                                value={formData.tempDate} 
                                                onChange={(val) => setFormData({ ...formData, tempDate: val })} 
                                                className="flex-1 h-14"
                                            />
                                            <Button 
                                                type="button" 
                                                onClick={() => {
                                                    const dateVal = formData.tempDate;
                                                    if (dateVal && !formData.dates.includes(dateVal)) {
                                                        setFormData(prev => ({ ...prev, dates: [...prev.dates, dateVal].sort(), tempDate: '' }));
                                                    }
                                                }}
                                                className="h-14 px-8 bg-neon-green/10 text-neon-green border border-neon-green/30 rounded-2xl hover:bg-neon-green hover:text-black transition-all"
                                            >
                                                <Plus size={18} />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">TIME</label>
                                                <StudioTimePicker 
                                                    value={formData.time} 
                                                    onChange={(val) => setFormData({ ...formData, time: val })} 
                                                    className="h-14"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">LOCATION</label>
                                                <Input 
                                                    value={formData.location} 
                                                    onChange={e => setFormData({ ...formData, location: e.target.value })} 
                                                    required 
                                                    placeholder="e.g. MAIN ARENA"
                                                    className="h-14 bg-black/60 border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-green/40" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 rounded-[2rem] bg-black/40 border border-white/5">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-neon-green uppercase tracking-[0.3em] pl-1">APPLY VIA</label>
                                            <StudioSelect
                                                value={formData.applyType}
                                                options={[
                                                    { value: 'link', label: 'LINK' },
                                                    { value: 'whatsapp', label: 'WHATSAPP' }
                                                ]}
                                                onChange={val => setFormData({ ...formData, applyType: val })}
                                                className="h-14"
                                                accentColor="neon-green"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">
                                                {formData.applyType === 'whatsapp' ? 'PHONE NUMBER' : 'APPLY LINK'}
                                            </label>
                                            <Input
                                                value={formData.applyLink}
                                                onChange={e => setFormData({ ...formData, applyLink: e.target.value })}
                                                placeholder={formData.applyType === 'whatsapp' ? 'e.g. 919876543210' : 'https://'}
                                                className="h-14 bg-black/60 border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-green/40"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-3 pt-4">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">COMMUNITY LINK (OPTIONAL)</label>
                                            <Input
                                                value={formData.whatsappLink}
                                                onChange={e => setFormData({ ...formData, whatsappLink: e.target.value })}
                                                placeholder="https://chat.whatsapp.com/..."
                                                className="h-14 bg-black/60 border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-green/40"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">DESCRIPTION</label>
                                        <textarea 
                                            className="w-full bg-black/60 border border-white/5 rounded-[1.5rem] p-8 text-white focus:outline-none focus:border-neon-green/40 min-h-[150px] resize-none text-[13px] font-medium placeholder:text-gray-800 leading-relaxed italic shadow-inner" 
                                            value={formData.description} 
                                            onChange={e => setFormData({ ...formData, description: e.target.value })} 
                                            placeholder="Enter gig description and details..." 
                                        />
                                    </div>

                                    <div className="space-y-8 pt-6 border-t border-white/5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">IMAGE</label>
                                                <div className="flex gap-4">
                                                    <Input 
                                                        value={formData.image} 
                                                        onChange={e => setFormData({ ...formData, image: e.target.value })} 
                                                        onPaste={handlePaste}
                                                        placeholder="URL OR CTRL+V IMAGE" 
                                                        className="flex-1 h-14 bg-black/60 border-white/5 rounded-2xl focus:border-neon-green/40" 
                                                    />
                                                    <div className="relative group w-14 h-14 shrink-0">
                                                        <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                        <div className={cn(
                                                            "h-full w-full rounded-2xl flex items-center justify-center border-2 border-dashed transition-all", 
                                                            isUploading ? "border-neon-green bg-neon-green/10 text-neon-green" : "border-white/10 bg-white/5 text-gray-500 hover:border-white/20"
                                                        )}>
                                                            {isUploading ? <Loader className="animate-spin" size={18} /> : <Plus size={18} />}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">HIGHLIGHT COLOR</label>
                                                <div className="flex items-center gap-4 h-14 bg-black/60 border border-white/5 rounded-2xl px-6">
                                                    {colorPresets.map(color => (
                                                        <button 
                                                            key={color.value} 
                                                            type="button" 
                                                            onClick={() => setFormData({ ...formData, highlightColor: color.value })} 
                                                            className={cn(
                                                                "w-6 h-6 rounded-full border-2 transition-all hover:scale-110", 
                                                                formData.highlightColor === color.value ? "border-white shadow-[0_0_15px_rgba(57,255,20,0.4)]" : "border-black/50"
                                                            )} 
                                                            style={{ backgroundColor: color.value }} 
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 rounded-[2rem] bg-black/40 border border-white/5 space-y-10">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-green italic">IMAGE POSITION</h4>
                                            <button 
                                                type="button" 
                                                onClick={() => setFormData({ ...formData, imageTransform: { scale: 1.05, x: 0, y: 0 } })} 
                                                className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
                                            >
                                                <X size={12} /> RESET
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-2">
                                            <div className="space-y-4">
                                                <div className="flex justify-between">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">ZOOM</label>
                                                    <span className="text-[9px] font-mono text-neon-green">{formData.imageTransform.scale.toFixed(2)}x</span>
                                                </div>
                                                <input type="range" min="0.5" max="2.5" step="0.01" value={formData.imageTransform.scale} onChange={e => setFormData({ ...formData, imageTransform: { ...formData.imageTransform, scale: parseFloat(e.target.value) } })} className="w-full accent-neon-green" />
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex justify-between">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">X</label>
                                                    <span className="text-[9px] font-mono text-neon-green">{formData.imageTransform.x}%</span>
                                                </div>
                                                <input type="range" min="-100" max="100" step="1" value={formData.imageTransform.x} onChange={e => setFormData({ ...formData, imageTransform: { ...formData.imageTransform, x: parseInt(e.target.value) } })} className="w-full accent-neon-green" />
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex justify-between">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Y</label>
                                                    <span className="text-[9px] font-mono text-neon-green">{formData.imageTransform.y}%</span>
                                                </div>
                                                <input type="range" min="-100" max="100" step="1" value={formData.imageTransform.y} onChange={e => setFormData({ ...formData, imageTransform: { ...formData.imageTransform, y: parseInt(e.target.value) } })} className="w-full accent-neon-green" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "p-8 rounded-[2rem] border flex items-center justify-between transition-all duration-500", 
                                        formData.isPinned ? "bg-neon-green/10 border-neon-green/40 shadow-[0_0_40px_rgba(57,255,20,0.05)]" : "bg-black/40 border-white/5"
                                    )}>
                                        <div className="flex items-center gap-8">
                                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl", formData.isPinned ? "bg-neon-green text-black" : "bg-white/5 text-gray-600")}>
                                                <Star size={24} className={cn(formData.isPinned && "fill-current")} />
                                            </div>
                                            <div>
                                                <h4 className="text-white text-sm font-black uppercase tracking-widest italic leading-tight">FEATURE AS SPOTLIGHT</h4>
                                                <p className="text-[10px] text-gray-600 mt-1 uppercase font-bold tracking-[0.1em]">SHOW IN THE FEATURED SECTION AT TOP</p>
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })} 
                                            className={cn("w-14 h-8 rounded-full relative transition-all border-2", formData.isPinned ? "bg-neon-green border-neon-green" : "bg-black/60 border-white/10")}
                                        >
                                            <div className={cn("absolute top-1 w-5 h-5 rounded-full transition-all shadow-lg", formData.isPinned ? "right-1 bg-black" : "left-1 bg-gray-600")} />
                                        </button>
                                    </div>

                                </div>

                                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-12 mt-12 border-t border-white/5">
                                    <Button type="button" variant="outline" onClick={resetForm} className="h-14 rounded-2xl px-10 text-[10px] font-black uppercase tracking-widest border-white/5 hover:bg-white/5">CANCEL</Button>
                                    <Button 
                                        onClick={handleSave} 
                                        disabled={saving}
                                        className="h-16 px-12 bg-neon-green text-black font-black uppercase tracking-[0.3em] text-[12px] italic rounded-[1rem] shadow-[0_15px_40px_rgba(57,255,20,0.3)] hover:scale-105 active:scale-95 transition-all border-none flex items-center justify-center gap-4 min-w-[240px]"
                                    >
                                        {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                                        {editingId ? 'UPDATE' : 'CREATE'}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>

                    {/* Preview Column */}
                    <div className="lg:sticky lg:top-32 space-y-8 w-full">
                        <div className="flex bg-zinc-950/60 border border-white/5 p-2 rounded-2xl w-fit backdrop-blur-3xl shadow-2xl">
                            <button 
                                onClick={() => setPreviewType('card')}
                                className={cn(
                                    "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    previewType === 'card' ? "bg-neon-green text-black shadow-lg" : "text-gray-500 hover:text-white"
                                )}
                            >
                                CARD VIEW
                            </button>
                            <button 
                                onClick={() => setPreviewType('embed')}
                                className={cn(
                                    "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    previewType === 'embed' ? "bg-neon-green text-black shadow-lg" : "text-gray-500 hover:text-white"
                                )}
                            >
                                EMBED VIEW
                            </button>
                        </div>

                        <div className="flex-grow pt-4">
                            {previewType === 'card' ? (
                                <LivePreview type="gig" data={formData} hideDecorations={false} />
                            ) : (
                                <div className="aspect-video rounded-[2rem] border border-white/5 bg-zinc-950/40 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-neon-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-neon-green/10 flex items-center justify-center mb-8 relative z-10 border border-neon-green/20">
                                        <Megaphone className="text-neon-green" size={28} />
                                    </div>
                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-4 relative z-10">LIVE PREVIEW</h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 leading-relaxed max-w-xs relative z-10">
                                        HOW IT WILL APPEAR TO USERS.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </AdminCommunityHubLayout>
        );
    }

    return (
        <AdminCommunityHubLayout 
            title="Volunteer Management" 
            description="Manage community contributions and operational support roles."
            studioHeader={{
                title: "GIG",
                subtitle: "MANAGER",
                accentClass: "text-neon-green",
                icon: Briefcase
            }}
            action={
                <Button onClick={() => { resetForm(); setIsAdding(true); }} className="h-16 px-12 bg-neon-green text-black font-black uppercase tracking-[0.3em] text-[12px] rounded-[1rem] shadow-[0_15px_40px_rgba(57,255,20,0.2)] hover:scale-105 active:scale-95 transition-all border-none flex items-center justify-center gap-3">
                    <Plus size={24} /> CREATE NEW
                </Button>
            }
        >
            <div className="relative z-10 max-w-[1400px] mx-auto pb-32">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {volunteerGigs && volunteerGigs.length > 0 ? (
                        volunteerGigs.map((gig, idx) => (
                            <GigCard 
                                key={gig.id} 
                                gig={gig} 
                                index={idx}
                                totalGigs={volunteerGigs.length}
                                onEdit={handleEdit}
                                onMove={moveGig}
                                onUpdate={updateVolunteerGig}
                                onDelete={deleteVolunteerGig}
                            />
                        ))
                    ) : (
                        <div className="col-span-full py-40 text-center">
                            <div className="w-20 h-20 bg-white/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 border border-dashed border-white/10">
                                <Briefcase size={32} className="text-white/20" />
                            </div>
                            <h3 className="text-xl font-black italic uppercase tracking-tighter text-white/40">No opportunities found.</h3>
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mt-2">CREATE ONE TO START.</p>
                        </div>
                    )}
                </div>
            </div>
        </AdminCommunityHubLayout>

    );
};

export default VolunteerGigManager;
