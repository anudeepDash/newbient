import React, { useState } from 'react';
import { Plus, Trash2, Edit, Save, Loader, Calendar, MapPin, Users } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';

const VolunteerGigManager = () => {
    const { volunteerGigs, addVolunteerGig, updateVolunteerGig, deleteVolunteerGig } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        location: '',
        roles: '', // Comma separated for input
        status: 'Open',
        applyType: 'link', // 'link' | 'whatsapp'
        applyLink: '' // URL or Phone Number
    });

    const resetForm = () => {
        setFormData({ title: '', date: '', location: '', roles: '', status: 'Open', applyType: 'link', applyLink: '' });
        setIsAdding(false);
        setEditingId(null);
        setSaving(false);
    };

    const handleEdit = (gig) => {
        setFormData({
            title: gig.title,
            date: gig.date,
            location: gig.location,
            roles: Array.isArray(gig.roles) ? gig.roles.join(', ') : gig.roles,
            status: gig.status || 'Open',
            applyType: gig.applyType || 'link',
            applyLink: gig.applyLink || ''
        });
        setEditingId(gig.id);
        setIsAdding(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        console.log("Starting handleSave...");
        setSaving(true);
        try {
            // Parse roles
            const rolesArray = formData.roles.split(',').map(r => r.trim()).filter(r => r);
            console.log("Parsed roles:", rolesArray);

            const gigData = {
                title: formData.title,
                date: formData.date,
                location: formData.location,
                roles: rolesArray,
                status: formData.status,
                applyType: formData.applyType,
                applyLink: formData.applyLink
            };

            if (editingId) {
                await updateVolunteerGig(editingId, gigData);
            } else {
                await addVolunteerGig(gigData);
            }
            resetForm();
        } catch (error) {
            console.error(error);
            alert(`Error saving gig: ${error.code || error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className={`mx-auto ${isAdding ? 'max-w-7xl' : 'max-w-6xl'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">Volunteer Opportunities</h2>
                        <p className="text-gray-400 text-sm">Manage open roles for the community.</p>
                    </div>
                    {!isAdding && (
                        <Button variant="primary" onClick={() => {
                            setFormData({ title: '', date: '', location: '', roles: '', status: 'Open', applyType: 'link', applyLink: '' });
                            setIsAdding(true);
                            setEditingId(null);
                        }} className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-neon-blue/20">
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Gig
                        </Button>
                    )}
                </div>

                {isAdding ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start h-[calc(100vh-150px)] min-h-[700px]">
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

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Roles (comma separated)</label>
                                    <Input
                                        value={formData.roles}
                                        onChange={e => setFormData({ ...formData, roles: e.target.value })}
                                        placeholder="e.g. Runner, Hospitality, Ticketing"
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
                                <Card key={gig.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-white/20 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-xl font-bold text-white">{gig.title}</h3>
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${gig.status === 'Open' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                {gig.status}
                                            </span>
                                            {gig.applyType === 'whatsapp' && <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-green-400">WA</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-2">
                                            <span className="flex items-center gap-1"><Calendar size={14} /> {gig.date}</span>
                                            <span className="flex items-center gap-1"><MapPin size={14} /> {gig.location}</span>
                                            <span className="flex items-center gap-1"><Users size={14} /> {Array.isArray(gig.roles) ? gig.roles.join(', ') : gig.roles}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 self-end md:self-center">
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
        </div>
    );
};

export default VolunteerGigManager;
