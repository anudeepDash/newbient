import React, { useState } from 'react';
import { Plus, Trash2, Edit, Save, Loader, Calendar, MapPin, ExternalLink, ListChecks } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const GuestlistManager = () => {
    const { guestlists, addGuestlist, updateGuestlist, deleteGuestlist } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        time: '',
        location: '',
        link: '',
        whatsappLink: '', 
        status: 'Open', 
        description: ''
    });

    const resetForm = () => {
        setFormData({ title: '', date: '', time: '', location: '', link: '', whatsappLink: '', status: 'Open', description: '' });
        setIsAdding(false);
        setEditingId(null);
        setSaving(false);
    };

    const handleEdit = (item) => {
        setFormData({
            title: item.title,
            date: item.date,
            time: item.time || '',
            location: item.location,
            link: item.link || '',
            whatsappLink: item.whatsappLink || '',
            status: item.status || 'Open',
            description: item.description || ''
        });
        setEditingId(item.id);
        setIsAdding(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingId) {
                await updateGuestlist(editingId, formData);
            } else {
                await addGuestlist(formData);
            }
            resetForm();
        } catch (error) {
            console.error(error);
            alert(`Error saving guestlist: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminCommunityHubLayout 
            title="Guestlist Management" 
            description="Manage entries for exclusive community events and guestlists."
        >
            <div className="space-y-6">
                <div className="flex justify-end mb-6">
                    {!isAdding && (
                        <Button onClick={() => {
                            resetForm();
                            setIsAdding(true);
                        }} className="h-12 px-8 bg-neon-blue text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all">
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Guestlist
                        </Button>
                    )}
                </div>

                {isAdding ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start min-h-[700px]">
                        <Card className="p-8 border-neon-blue/30 bg-zinc-900/40 backdrop-blur-3xl rounded-[2rem]">
                            <h2 className="text-xl font-black font-heading text-white mb-6 underline underline-offset-8 decoration-neon-blue/30 italic">
                                {editingId ? 'Edit Manifest' : 'Initialize Entry'}
                            </h2>
                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Authority</label>
                                        <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required placeholder="E.g. VIP Backstage" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Status</label>
                                        <select
                                            className="w-full h-12 bg-black/50 border border-white/5 rounded-xl px-4 text-white focus:outline-none focus:border-neon-blue transition-all"
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="Open">Active</option>
                                            <option value="Closed">Restricted</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Date</label>
                                        <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Time</label>
                                        <Input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Location</label>
                                        <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required placeholder="Venue Name" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Access URL</label>
                                        <Input value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} placeholder="Registration Link" required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">WhatsApp Hub</label>
                                        <Input value={formData.whatsappLink} onChange={e => setFormData({ ...formData, whatsappLink: e.target.value })} placeholder="Group Link (Optional)" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Objective Summary</label>
                                    <textarea
                                        className="w-full bg-black/50 border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-neon-blue min-h-[100px] resize-none text-sm"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Briefly describe the exclusive access..."
                                    />
                                </div>

                                <div className="flex gap-4 pt-6 mt-auto border-t border-white/5">
                                    <Button type="button" variant="outline" onClick={resetForm} className="flex-1 py-4 border-white/10 hover:border-white/20 h-auto">Cancel</Button>
                                    <Button type="submit" disabled={saving} className="flex-[2] py-4 bg-neon-blue text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all h-auto shadow-[0_10px_30px_rgba(0,255,255,0.2)]">
                                        {saving ? <Loader className="animate-spin mr-2 h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />}
                                        {editingId ? 'Update Manifest' : 'Authorize Entry'}
                                    </Button>
                                </div>
                            </form>
                        </Card>

                        <LivePreview type="guestlist" data={formData} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {guestlists && guestlists.length > 0 ? (
                            guestlists.map((item) => (
                                <Card key={item.id} className="p-8 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] hover:border-neon-blue/30 hover:bg-zinc-900/60 transition-all duration-500 group relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="p-3 rounded-2xl bg-neon-blue/10 text-neon-blue border border-neon-blue/20 group-hover:scale-110 transition-transform duration-500">
                                            <ListChecks size={24} />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-white transition-colors" title="Edit"><Edit size={16} /></button>
                                            <button onClick={() => deleteGuestlist(item.id)} className="p-2 text-gray-500 hover:text-red-400 transition-colors" title="Delete"><Trash2 size={16} /></button>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-black font-heading text-white tracking-tight group-hover:text-neon-blue transition-colors truncate">{item.title}</h3>
                                            <span className={cn(
                                                "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full border",
                                                item.status === 'Open' ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                            )}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-xs font-medium line-clamp-2 leading-relaxed italic">"{item.description}"</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pb-6 border-b border-white/5 mb-6">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Date</p>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-white/70">
                                                <Calendar size={12} className="text-neon-blue" />
                                                <span>{item.date}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Location</p>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-white/70">
                                                <MapPin size={12} className="text-neon-pink" />
                                                <span className="truncate">{item.location}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        {item.link && (
                                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-center hover:bg-white/10 transition-colors flex items-center justify-center gap-2 group/btn">
                                                View Form <ExternalLink size={12} className="group-hover/btn:scale-110 transition-transform" />
                                            </a>
                                        )}
                                        {item.whatsappLink && (
                                            <a href={item.whatsappLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-green-400 hover:bg-green-500/20 transition-colors">
                                                WhatsApp
                                            </a>
                                        )}
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-24 text-gray-500 bg-white/[0.02] rounded-[2.5rem] border border-dashed border-white/10">
                                <p className="font-bold uppercase tracking-widest text-xs">No entries in the manifest</p>
                                <button onClick={() => setIsAdding(true)} className="text-neon-blue hover:underline underline-offset-4 mt-4 inline-block font-black">Open New Guestlist</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AdminCommunityHubLayout>
    );
};

export default GuestlistManager;

