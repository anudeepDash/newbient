import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit, Save, Loader, Calendar, MapPin, Users, ArrowUp, ArrowDown, Megaphone, ArrowLeft, Sparkles } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

import { notifyAllUsers } from '../../lib/notificationTriggers';

const VolunteerGigManager = () => {
    const { volunteerGigs, addVolunteerGig, updateVolunteerGig, deleteVolunteerGig, reorderVolunteerGigs, addAnnouncement } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        dates: [],
        time: '',
        location: '',
        description: '',
        status: 'Open',
        applyType: 'link', // 'link' | 'whatsapp'
        applyLink: '', // URL or Phone Number
        whatsappLink: '' // Optional Group Link
    });

    const resetForm = () => {
        setFormData({ title: '', dates: [], time: '', location: '', description: '', status: 'Open', applyType: 'link', applyLink: '', whatsappLink: '' });
        setIsAdding(false);
        setEditingId(null);
        setSaving(false);
    };

    const handleEdit = (gig) => {
        setFormData({
            title: gig.title,
            dates: gig.dates || (gig.date ? [gig.date] : []),
            time: gig.time || '',
            location: gig.location,
            description: gig.description || '',
            status: gig.status || 'Open',
            applyType: gig.applyType || 'link',
            applyLink: gig.applyLink || '',
            whatsappLink: gig.whatsappLink || ''
        });
        setEditingId(gig.id);
        setIsAdding(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        console.log("Starting handleSave...");
        setSaving(true);
        try {
            const gigData = {
                title: formData.title,
                dates: formData.dates,
                date: formData.dates[0] || '', // Fallback
                time: formData.time,
                location: formData.location,
                description: formData.description,
                status: formData.status,
                applyType: formData.applyType,
                applyLink: formData.applyLink,
                whatsappLink: formData.whatsappLink
            };

            if (editingId) {
                await updateVolunteerGig(editingId, gigData);
            } else {
                await addVolunteerGig(gigData);
                // Notify All Users about new gig
                await notifyAllUsers(
                    'NEW VOLUNTEER GIG!',
                    `WE NEED YOUR INTEL. ${gigData.title.toUpperCase()} IS NOW LIVE. APPLY NOW.`,
                    '/community',
                    'gig'
                );
            }
            resetForm();
        } catch (error) {
            console.error(error);
            alert(`Error saving gig: ${error.code || error.message}`);
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
            alert('Announcement posted!');
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
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}-${m}-${y}`;
    };

    return (
        <AdminCommunityHubLayout 
            title="Volunteer Management" 
            description="Create and manage open roles for the community members."
        >
            <div className="space-y-6">
                <div className="flex justify-end mb-6">
                    {!isAdding && (
                        <Button onClick={() => {
                            setFormData({ title: '', dates: [], time: '', location: '', description: '', status: 'Open', applyType: 'link', applyLink: '', whatsappLink: '' });
                            setIsAdding(true);
                            setEditingId(null);
                        }} className="h-12 px-8 bg-neon-green text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all">
                            <Plus className="mr-2" size={18} /> Add New Gig
                        </Button>
                    )}
                </div>

                {isAdding ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start min-h-[700px] mb-20">
                        {/* Editor Column */}
                        <Card className="p-6 h-full flex flex-col border-neon-blue/30 overflow-y-auto">
                            <h2 className="text-xl font-bold text-white mb-4 flex-shrink-0">{editingId ? 'Edit Gig' : 'Add New Gig'}</h2>
                            <form onSubmit={handleSave} className="space-y-4 flex-grow flex flex-col">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Event Title</label>
                                        <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                                        <select
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-blue"
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="Open">Open</option>
                                            <option value="Filing Fast">Filing Fast</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Working Days</label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {formData.dates.map((d, index) => (
                                                <div key={index} className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-sm">
                                                    <span>{formatDate(d)}</span>
                                                    <button type="button" onClick={() => setFormData({ ...formData, dates: formData.dates.filter((_, i) => i !== index) })} className="text-red-400 hover:text-red-300">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <Input type="date" id="datePicker" className="flex-1" />
                                            <Button type="button" variant="outline" onClick={() => {
                                                const dateVal = document.getElementById('datePicker').value;
                                                if (dateVal && !formData.dates.includes(dateVal)) {
                                                    const newDates = [...formData.dates, dateVal].sort((a, b) => new Date(a) - new Date(b));
                                                    setFormData({ ...formData, dates: newDates });
                                                    document.getElementById('datePicker').value = '';
                                                }
                                            }}>Add Day</Button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Time (Optional)</label>
                                        <Input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                                        <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Make WhatsApp Button (Optional)</label>
                                        <Input
                                            value={formData.whatsappLink}
                                            onChange={e => setFormData({ ...formData, whatsappLink: e.target.value })}
                                            placeholder="https://chat.whatsapp.com/..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Application Method</label>
                                        <select
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-blue"
                                            value={formData.applyType}
                                            onChange={e => setFormData({ ...formData, applyType: e.target.value })}
                                        >
                                            <option value="link">Website Link / Form</option>
                                            <option value="whatsapp">WhatsApp DM</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">
                                            {formData.applyType === 'whatsapp' ? 'WhatsApp Number' : 'Link URL'}
                                        </label>
                                        <Input
                                            value={formData.applyLink}
                                            onChange={e => setFormData({ ...formData, applyLink: e.target.value })}
                                            placeholder={formData.applyType === 'whatsapp' ? '919304372773' : 'https://...'}
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Description (shown in card details & overlay)</label>
                                    <textarea
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-blue min-h-[100px]"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Enter full gig details, requirements, etc..."
                                    />
                                </div>

                                <div className="flex justify-end gap-4 pt-4 mt-auto border-t border-white/10">
                                    <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                                    <Button type="submit" variant="primary" disabled={saving}>
                                        {saving ? <Loader className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                        {editingId ? 'Update Gig' : 'Save Gig'}
                                    </Button>
                                </div>
                            </form>
                        </Card>

                        {/* Preview Column */}
                        <LivePreview type="gig" data={formData} />
                    </div>
                ) : (
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
                                                if (window.confirm(`Transmit direct push signal for "${gig.title}"?`)) {
                                                    await notifyAllUsers(
                                                        `Volunteers Needed: ${gig.title}`,
                                                        `Join the Newbi squad for ${gig.title} at ${gig.location}. Apply now!`,
                                                        `/community`,
                                                        ''
                                                    );
                                                    alert("PUSH_SIGNAL_TRANSMITTED.");
                                                }
                                            }}
                                            className="p-2 h-auto text-neon-pink border-neon-pink/20 hover:bg-neon-pink hover:text-black transition-all" 
                                            title="Direct Push Signal"
                                        >
                                            <Sparkles size={16} />
                                        </Button>
                                        <Button variant="outline" onClick={() => handlePushAnnouncement(gig)} className="p-2 h-auto text-neon-blue hover:text-neon-blue hover:border-neon-blue" title="Push to Announcements">
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
                            <div className="text-center py-16 text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                                <p className="mb-2">No volunteer opportunities posted.</p>
                                <Button variant="link" onClick={() => setIsAdding(true)} className="text-neon-blue">
                                    Create the first gig
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AdminCommunityHubLayout>
    );
};

export default VolunteerGigManager;
