import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Palette from 'lucide-react/dist/esm/icons/palette';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import X from 'lucide-react/dist/esm/icons/x';
import Pin from 'lucide-react/dist/esm/icons/pin';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Unlock from 'lucide-react/dist/esm/icons/unlock';
import Star from 'lucide-react/dist/esm/icons/star';

import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { cn } from '../../lib/utils';
import StudioDatePicker from '../../components/ui/StudioDatePicker';
import StudioSelect from '../../components/ui/StudioSelect';

const GuestlistManager = () => {
    const navigate = useNavigate();
    const colorPresets = [
        { name: 'Cyber Blue', value: '#2ebfff' },
        { name: 'Neon Green', value: '#39FF14' },
        { name: 'Neon Pink', value: '#FF4F8B' },
        { name: 'Electric Purple', value: '#BF00FF' },
    ];

    const { guestlists, addGuestlist, updateGuestlist, deleteGuestlist, uploadToCloudinary } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [previewType, setPreviewType] = useState('card');
    const [isUploading, setIsUploading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        location: '',
        description: '',
        status: 'Open',
        maxSpots: 100,
        currentSpots: 0,
        perUserLimit: 2,
        image: '',
        highlightColor: '#2ebfff',
        isPinned: false,
        imageTransform: { scale: 1.05, x: 0, y: 0 },
        guestlistEnabled: true,
        externalLink: ''
    });

    const resetForm = () => {
        setFormData({ 
            title: '', date: '', location: '', description: '', status: 'Open', maxSpots: 100, currentSpots: 0, perUserLimit: 2,
            image: '', highlightColor: '#2ebfff', isPinned: false, imageTransform: { scale: 1.05, x: 0, y: 0 }, 
            guestlistEnabled: true, externalLink: ''
        });
        setIsAdding(false);
        setEditingId(null);
        setSaving(false);
        setIsUploading(false);
    };

    const handleEdit = (gl) => {
        setFormData({
            title: gl.title,
            date: gl.date || '',
            location: gl.location || '',
            description: gl.description || '',
            status: gl.status || 'Open',
            maxSpots: gl.maxSpots || 100,
            currentSpots: gl.currentSpots || 0,
            perUserLimit: gl.perUserLimit || 2,
            image: gl.image || '',
            highlightColor: gl.highlightColor || '#2ebfff',
            isPinned: gl.isPinned || false,
            imageTransform: gl.imageTransform || { scale: 1.05, x: 0, y: 0 },
            guestlistEnabled: gl.guestlistEnabled !== undefined ? gl.guestlistEnabled : true,
            externalLink: gl.externalLink || ''
        });
        setEditingId(gl.id);
        setIsAdding(true);
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const glData = { 
                ...formData,
                isGuestlistEnabled: true // Ensure compatibility with Ticketing Ops
            };
            if (editingId) {
                await updateGuestlist(editingId, glData);
            } else {
                await addGuestlist(glData);
            }
            useStore.getState().addToast(`Guestlist ${editingId ? 'updated' : 'created'} successfully!`, 'success');
            resetForm();
        } catch (error) {
            console.error(error);
            useStore.getState().addToast(`Error saving guestlist: ${error.message}`, 'error');
        } finally {
            setSaving(false);
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
            useStore.getState().addToast("UPLOAD FAILED.", 'error');
        } finally {
            setIsUploading(false);
        }
    };

    if (isAdding) {
        return (
            <AdminCommunityHubLayout 
                hideTabs 
                studioHeader={{
                    title: "GUESTLIST",
                    subtitle: editingId ? "EDITOR" : "CREATOR",
                    accentClass: "text-neon-blue",
                    icon: ListChecks
                }}
            >
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 items-start mb-20 relative z-10">
                    {/* Editor Column */}
                    <div className="w-full">
                        <Card className="p-8 md:p-12 bg-zinc-950/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                            {/* Ambient Background Glow */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-neon-blue/5 rounded-full blur-[100px] pointer-events-none" />
                            
                            <form onSubmit={handleSave} className="space-y-12 relative z-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">DESCRIPTION</label>
                                    <textarea 
                                        className="w-full bg-black/60 border border-white/5 rounded-[1.5rem] p-8 text-white focus:outline-none focus:border-neon-blue/40 min-h-[150px] resize-none text-[13px] font-medium placeholder:text-gray-800 leading-relaxed italic shadow-inner" 
                                        value={formData.description} 
                                        onChange={e => setFormData({ ...formData, description: e.target.value })} 
                                        placeholder="Rules of entry, age limits, dress code..." 
                                    />
                                </div>

                                <div className="space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">EVENT TITLE</label>
                                            <Input 
                                                value={formData.title} 
                                                onChange={e => setFormData({ ...formData, title: e.target.value })} 
                                                required 
                                                placeholder="e.g. SKYLINE SOIREE"
                                                className="h-14 bg-black/60 border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-blue/40" 
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
                                                accentColor="neon-blue"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">DATE</label>
                                            <StudioDatePicker 
                                                value={formData.date} 
                                                onChange={(val) => setFormData({ ...formData, date: val })} 
                                                className="h-14"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">LOCATION</label>
                                            <Input 
                                                value={formData.location} 
                                                onChange={e => setFormData({ ...formData, location: e.target.value })} 
                                                required 
                                                placeholder="e.g. ROOFTOP LOUNGE"
                                                className="h-14 bg-black/60 border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-blue/40" 
                                            />
                                        </div>
                                    </div>

                                    {/* GUESTLIST PROTOCOL TOGGLE */}
                                    <div className={cn(
                                        "p-8 rounded-[2rem] border transition-all duration-500", 
                                        formData.guestlistEnabled ? "bg-neon-blue/10 border-neon-blue/40 shadow-[0_0_40px_rgba(46,191,255,0.05)]" : "bg-black/40 border-white/5"
                                    )}>
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-6">
                                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl", formData.guestlistEnabled ? "bg-neon-blue text-black" : "bg-white/5 text-gray-600")}>
                                                    <ShieldCheck size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="text-white text-sm font-black uppercase tracking-widest italic leading-tight">ACCESS PROTOCOL</h4>
                                                    <p className="text-[10px] text-gray-600 mt-1 uppercase font-bold tracking-[0.1em]">
                                                        {formData.guestlistEnabled ? "INTERNAL REGISTRATION" : "EXTERNAL REDIRECTION"}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => setFormData({ ...formData, guestlistEnabled: !formData.guestlistEnabled })} 
                                                className={cn("w-14 h-8 rounded-full relative transition-all border-2", formData.guestlistEnabled ? "bg-neon-blue border-neon-blue" : "bg-black/60 border-white/10")}
                                            >
                                                <div className={cn("absolute top-1 w-5 h-5 rounded-full transition-all shadow-lg", formData.guestlistEnabled ? "right-1 bg-black" : "left-1 bg-gray-600")} />
                                            </button>
                                        </div>

                                        {formData.guestlistEnabled ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">CAPACITY</label>
                                                    <Input type="number" value={formData.maxSpots} onChange={e => setFormData({ ...formData, maxSpots: parseInt(e.target.value) })} required 
                                                        className="h-14 bg-black/60 border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-blue/40" />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">PER USER LIMIT</label>
                                                    <Input type="number" value={formData.perUserLimit} onChange={e => setFormData({ ...formData, perUserLimit: parseInt(e.target.value) })} required 
                                                        className="h-14 bg-black/60 border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-blue/40" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">EXTERNAL LINK</label>
                                                <div className="relative">
                                                    <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                    <Input 
                                                        value={formData.externalLink} 
                                                        onChange={e => setFormData({ ...formData, externalLink: e.target.value })} 
                                                        placeholder="https://tally.so/r/..." 
                                                        className="h-14 pl-14 bg-black/60 border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-neon-blue/40" 
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                            <textarea 
                                             className="w-full bg-black/60 border border-white/5 rounded-[1.5rem] p-8 text-white focus:outline-none focus:border-neon-blue/40 min-h-[150px] resize-none text-[13px] font-medium placeholder:text-gray-800 leading-relaxed italic shadow-inner" 
                                             value={formData.description} 
                                             onChange={e => setFormData({ ...formData, description: e.target.value })} 
                                             placeholder="Rules of entry, age limits, dress code..." 
                                         />

                                     <div className={cn(
                                         "p-8 rounded-[2rem] border flex items-center justify-between transition-all duration-500", 
                                         formData.isPinned ? "bg-neon-blue/10 border-neon-blue/40 shadow-[0_0_40px_rgba(46,191,255,0.05)]" : "bg-black/40 border-white/5"
                                     )}>
                                         <div className="flex items-center gap-8">
                                             <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl", formData.isPinned ? "bg-neon-blue text-black" : "bg-white/5 text-gray-600")}>
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
                                             className={cn("w-14 h-8 rounded-full relative transition-all border-2", formData.isPinned ? "bg-neon-blue border-neon-blue" : "bg-black/60 border-white/10")}
                                         >
                                             <div className={cn("absolute top-1 w-5 h-5 rounded-full transition-all shadow-lg", formData.isPinned ? "right-1 bg-black" : "left-1 bg-gray-600")} />
                                         </button>
                                     </div>

                                     <div className="space-y-8 pt-6 border-t border-white/5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">IMAGE</label>
                                                <div className="flex gap-4">
                                                    <Input 
                                                        value={formData.image} 
                                                        onChange={e => setFormData({ ...formData, image: e.target.value })} 
                                                        placeholder="URL" 
                                                        className="flex-1 h-14 bg-black/60 border-white/5 rounded-2xl focus:border-neon-blue/40" 
                                                    />
                                                    <div className="relative group w-14 h-14 shrink-0">
                                                        <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                        <div className={cn(
                                                            "h-full w-full rounded-2xl flex items-center justify-center border-2 border-dashed transition-all", 
                                                            isUploading ? "border-neon-blue bg-neon-blue/10 text-neon-blue" : "border-white/10 bg-white/5 text-gray-500 hover:border-white/20"
                                                        )}>
                                                            {isUploading ? <Loader className="animate-spin" size={18} /> : <ImageIcon size={18} />}
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
                                                                formData.highlightColor === color.value ? "border-white shadow-[0_0_15px_rgba(46,191,255,0.4)]" : "border-black/50"
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
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-blue italic">IMAGE POSITION</h4>
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
                                                    <span className="text-[9px] font-mono text-neon-blue">{formData.imageTransform.scale.toFixed(2)}x</span>
                                                </div>
                                                <input type="range" min="0.5" max="2.5" step="0.01" value={formData.imageTransform.scale} onChange={e => setFormData({ ...formData, imageTransform: { ...formData.imageTransform, scale: parseFloat(e.target.value) } })} className="w-full accent-neon-blue" />
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex justify-between">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">X</label>
                                                    <span className="text-[9px] font-mono text-neon-blue">{formData.imageTransform.x}%</span>
                                                </div>
                                                <input type="range" min="-100" max="100" step="1" value={formData.imageTransform.x} onChange={e => setFormData({ ...formData, imageTransform: { ...formData.imageTransform, x: parseInt(e.target.value) } })} className="w-full accent-neon-blue" />
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex justify-between">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Y</label>
                                                    <span className="text-[9px] font-mono text-neon-blue">{formData.imageTransform.y}%</span>
                                                </div>
                                                <input type="range" min="-100" max="100" step="1" value={formData.imageTransform.y} onChange={e => setFormData({ ...formData, imageTransform: { ...formData.imageTransform, y: parseInt(e.target.value) } })} className="w-full accent-neon-blue" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-12 mt-12 border-t border-white/5">
                                    <Button type="button" variant="outline" onClick={resetForm} className="h-14 rounded-2xl px-10 text-[10px] font-black uppercase tracking-widest border-white/5 hover:bg-white/5">CANCEL</Button>
                                    <Button 
                                        onClick={handleSave} 
                                        disabled={saving}
                                        className="h-16 px-12 bg-neon-blue text-black font-black uppercase tracking-[0.3em] text-[12px] italic rounded-[1rem] shadow-[0_15px_40px_rgba(46,191,255,0.3)] hover:scale-105 active:scale-95 transition-all border-none flex items-center justify-center gap-4 min-w-[240px]"
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
                            <button onClick={() => setPreviewType('card')} className={cn("px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", previewType === 'card' ? "bg-neon-blue text-black shadow-lg" : "text-gray-500 hover:text-white")}>CARD VIEW</button>
                            <button onClick={() => setPreviewType('embed')} className={cn("px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", previewType === 'embed' ? "bg-neon-blue text-black shadow-lg" : "text-gray-500 hover:text-white")}>EMBED VIEW</button>
                        </div>
                        <div className="pt-4">
                            <LivePreview type="gl" data={formData} hideDecorations={false} />
                        </div>
                    </div>
                </div>
            </AdminCommunityHubLayout>
        );
    }

    return (
        <AdminCommunityHubLayout 
            title="Guestlist Management" 
            description="Manage verified entry lists for exclusive events and community gatherings."
            studioHeader={{
                title: "GUESTLIST",
                subtitle: "VAULT",
                accentClass: "text-neon-blue",
                icon: ListChecks
            }}
            action={
                <Button onClick={() => { resetForm(); setIsAdding(true); }} className="h-16 px-12 bg-neon-blue text-black font-black uppercase tracking-[0.3em] text-[12px] rounded-[1rem] shadow-[0_15px_40px_rgba(46,191,255,0.2)] hover:scale-105 active:scale-95 transition-all border-none flex items-center justify-center gap-3">
                    <Plus size={24} /> CREATE NEW
                </Button>
            }
        >
            <div className="relative z-10 max-w-[1400px] mx-auto pb-32">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {guestlists && guestlists.length > 0 ? (
                        guestlists.map((gl) => {
                            const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
                            const handleMouseMove = (e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = ((e.clientX - rect.left) / rect.width) * 100;
                                const y = ((e.clientY - rect.top) / rect.height) * 100;
                                setMousePos({ x, y });
                            };

                            return (
                                <Card 
                                    key={gl.id} 
                                    onMouseMove={handleMouseMove}
                                    className="p-0 bg-zinc-950/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-neon-blue/30 transition-all duration-700 shadow-2xl flex flex-col h-[520px] relative"
                                    style={{ 
                                        background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, ${gl.highlightColor || '#2ebfff'}10 0%, transparent 60%)`
                                    }}
                                >
                                    {/* Card Header Media */}
                                    <div className="h-44 relative overflow-hidden">
                                        {gl.image ? (
                                            <img 
                                                src={gl.image} 
                                                alt={gl.title} 
                                                className="w-full h-full object-cover opacity-40 group-hover:opacity-70 group-hover:scale-110 transition-all duration-1000" 
                                                style={{
                                                    transform: `scale(${gl.imageTransform?.scale || 1.05})`,
                                                    objectPosition: `${50 + (gl.imageTransform?.x || 0)}% ${50 + (gl.imageTransform?.y || 0)}%`
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
                                                <ListChecks size={48} className="text-white/10" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                                        
                                        <div className="absolute top-6 right-6 flex gap-2">
                                            <div className={cn(
                                                "px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-3xl",
                                                gl.status === 'Open' ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                                            )}>
                                                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]" />
                                                {gl.status || 'ACTIVE'}
                                            </div>
                                            {!gl.guestlistEnabled && (
                                                <div className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-gray-400 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-3xl">
                                                    <LinkIcon size={10} /> EXTERNAL
                                                </div>
                                            )}
                                        </div>

                                        <div className="absolute bottom-6 left-8 right-8">
                                            <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white truncate drop-shadow-2xl">{gl.title}</h3>
                                            <div className="flex items-center gap-4 mt-2 opacity-60">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Calendar size={12} className="text-neon-blue" /> {gl.date || 'TBD'}
                                                </span>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <MapPin size={12} className="text-neon-blue" /> {gl.location || 'VENUE'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-8 flex-grow flex flex-col justify-between">
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4 text-white/20">
                                                    <div className="w-10 h-[1px] bg-current" />
                                                    <span className="text-[9px] font-black uppercase tracking-[0.4em]">DESCRIPTION</span>
                                                </div>
                                                <p className="text-[12px] font-medium text-gray-400 uppercase tracking-widest line-clamp-2 italic leading-relaxed">
                                                    {gl.description || "EMPTY."}
                                                </p>
                                            </div>
                                            
                                            <div className="space-y-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                                                    <span className="flex items-center gap-2"><Users size={12} className="text-neon-blue" /> CAPACITY</span>
                                                    <span className="text-white">{gl.currentSpots || 0} / {gl.maxSpots || '∞'}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-neon-blue transition-all duration-1000 shadow-[0_0_15px_rgba(46,191,255,0.4)]" 
                                                        style={{ width: `${Math.min(((gl.currentSpots || 0) / (gl.maxSpots || 100)) * 100, 100)}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                                            <Button 
                                                variant="outline" 
                                                onClick={() => navigate(`/admin/ticketing?eventId=${gl.id}`)}
                                                className="w-full h-14 rounded-2xl border-white/5 bg-neon-blue/10 text-neon-blue hover:bg-white hover:text-black transition-all flex items-center justify-center gap-4 group/btn shadow-lg"
                                            >
                                                <UserCheck size={26} className="group-hover/btn:scale-110 transition-transform" />
                                                <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">MANAGE ENTRIES</span>
                                            </Button>

                                            <div className="flex items-center gap-3">
                                                <Button 
                                                    variant="outline" 
                                                    onClick={() => {
                                                        const newStatus = gl.status === 'Open' ? 'Closed' : 'Open';
                                                        updateGuestlist(gl.id, { ...gl, status: newStatus });
                                                    }}
                                                    className={cn(
                                                        "h-14 flex-1 rounded-2xl border-white/5 transition-all flex items-center justify-center",
                                                        gl.status === 'Open' ? "bg-neon-green/10 text-neon-green hover:bg-neon-green hover:text-black shadow-[0_0_20px_rgba(57,255,20,0.1)]" : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                                                    )}
                                                    title={gl.status === 'Open' ? "Close Guestlist" : "Open Guestlist"}
                                                >
                                                    {gl.status === 'Open' ? <Unlock size={24} /> : <Lock size={24} />}
                                                </Button>

                                                <Button 
                                                    variant="outline" 
                                                    onClick={() => handleEdit(gl)} 
                                                    className="h-14 flex-1 rounded-2xl border-white/5 bg-white/5 hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3"
                                                >
                                                    <Edit size={22} />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">EDIT</span>
                                                </Button>

                                                <Button 
                                                    variant="outline" 
                                                    onClick={() => { if(confirm('Permanently purge this guestlist vault?')) deleteGuestlist(gl.id); }}
                                                    className="h-14 w-14 rounded-2xl bg-red-500 text-white border-none hover:bg-red-600 transition-all flex items-center justify-center shrink-0 shadow-xl"
                                                >
                                                    <Trash2 size={26} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Shimmer Overlay */}
                                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
                                        style={{ background: `linear-gradient(${mousePos.x}deg, transparent 40%, ${gl.highlightColor || '#2ebfff'}05 50%, transparent 60%)` }}
                                    />
                                </Card>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-40 text-center">
                            <div className="w-20 h-20 bg-white/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 border border-dashed border-white/10">
                                <ListChecks size={32} className="text-white/20" />
                            </div>
                            <h3 className="text-xl font-black italic uppercase tracking-tighter text-white/40">EMPTY.</h3>
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mt-2">CREATE ONE TO START.</p>
                        </div>
                    )}
                </div>
            </div>
        </AdminCommunityHubLayout>

    );
};

export default GuestlistManager;
