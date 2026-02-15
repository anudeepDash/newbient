import React, { useState } from 'react';
import { Plus, Trash2, Edit, Save, Loader, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

import LivePreview from '../../components/admin/LivePreview';

const GuestlistManager = () => {
    const { guestlists, addGuestlist, updateGuestlist, deleteGuestlist } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        location: '',
        link: '',
        whatsappLink: '', // New field
        status: 'Open', // Open | Closed
        description: ''
    });

    const resetForm = () => {
        setFormData({ title: '', date: '', location: '', link: '', whatsappLink: '', status: 'Open', description: '' });
        setIsAdding(false);
        setEditingId(null);
        setSaving(false);
    };

    const handleEdit = (item) => {
        setFormData({
            title: item.title,
            date: item.date,
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
        <div className="space-y-6">
            <div className={`mx-auto ${isAdding ? 'max-w-7xl' : 'max-w-6xl'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">Guestlist Management</h2>
                        <p className="text-gray-400 text-sm">Manage entries for upcoming event guestlists.</p>
                    </div>
                    {!isAdding && (
                        <Button variant="primary" onClick={() => {
                            resetForm();
                            setIsAdding(true);
                        }} className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-neon-blue/20">
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Guestlist
                        </Button>
                    )}
                </div>

                {isAdding ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start h-[calc(100vh-150px)] min-h-[700px]">
                        {/* Editor Column */}
                        <Card className="p-6 h-full flex flex-col border-neon-blue/30 overflow-y-auto">
                            <h2 className="text-xl font-bold text-white mb-4 flex-shrink-0">{editingId ? 'Edit Guestlist' : 'Add New Guestlist'}</h2>
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
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                                        <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                                        <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Access Link (Google Form, etc.)</label>
                                        <Input value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} placeholder="https://..." required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">WhatsApp Group Link (Optional)</label>
                                        <Input value={formData.whatsappLink} onChange={e => setFormData({ ...formData, whatsappLink: e.target.value })} placeholder="https://chat.whatsapp.com/..." />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Description (Optional)</label>
                                    <textarea
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-blue h-24 resize-none"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Brief details..."
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 mt-auto border-t border-white/10 flex-shrink-0">
                                    <Button type="button" variant="outline" onClick={resetForm} className="h-12 px-6">Cancel</Button>
                                    <Button type="submit" variant="primary" disabled={saving} className="h-12 px-8 shadow-lg shadow-neon-blue/20">
                                        {saving ? <Loader className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                        {editingId ? 'Update' : 'Save'}
                                    </Button>
                                </div>
                            </form>
                        </Card>

                        {/* Preview Column */}
                        <LivePreview type="guestlist" data={formData} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {guestlists && guestlists.length > 0 ? (
                            guestlists.map((item) => (
                                <Card key={item.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-white/20 transition-colors">
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-xl font-bold text-white">{item.title}</h3>
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${item.status === 'Open' ? 'bg-neon-green/20 text-neon-green' : 'bg-red-500/20 text-red-500'}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-2">
                                            <span className="flex items-center gap-1"><Calendar size={14} /> {item.date}</span>
                                            <span className="flex items-center gap-1"><MapPin size={14} /> {item.location}</span>
                                            {item.link && (
                                                <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-neon-blue hover:underline">
                                                    <ExternalLink size={14} /> Link
                                                </a>
                                            )}
                                            {item.whatsappLink && (
                                                <a href={item.whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-400 hover:underline">
                                                    <ExternalLink size={14} /> WhatsApp
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <Button variant="outline" onClick={() => handleEdit(item)} className="p-2 h-auto">
                                            <Edit size={16} />
                                        </Button>
                                        <Button variant="outline" onClick={() => deleteGuestlist(item.id)} className="p-2 h-auto text-red-400 hover:text-red-500 hover:border-red-500">
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <div className="text-center py-16 text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                                <p>No active guestlists found.</p>
                                <Button variant="link" onClick={() => setIsAdding(true)} className="text-neon-green">
                                    Create the first guestlist entry
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GuestlistManager;
