import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Share2, Bell, Eye, ClipboardList } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

import { notifyAllUsers } from '../../lib/notificationTriggers';

const FormManager = () => {
    const { forms, deleteForm, addAnnouncement } = useStore();
    const navigate = useNavigate();

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this form?')) {
            deleteForm(id);
        }
    };

    const handlePushNotification = async (form) => {
        const announcement = {
            title: `New Form: ${form.title}`,
            date: new Date().toISOString().split('T')[0],
            content: form.description || "Check out this new form!",
            isPinned: false,
            link: `/forms/${form.id}`,
            image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop"
        };
        await addAnnouncement(announcement);
        
        // Trigger Push Notification
        await notifyAllUsers(
            `NEW COMMUNITY FORM: ${form.title.toUpperCase()}`,
            form.description || "YOUR INTEL IS REQUIRED. PARTICIPATE IN THIS PULSE NOW.",
            `/forms/${form.id}`,
            announcement.image
        );
        
        alert('Form pushed to announcements and notifications triggered!');
    };

    const handleShareWhatsApp = (form) => {
        const link = `${window.location.origin}/forms/${form.id}`;
        const text = `Check out this form: ${form.title} - ${link}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    return (
        <AdminCommunityHubLayout 
            title="Form Management" 
            description="Create and manage interactive pulses, surveys, and feedback loops."
        >
            <div className="space-y-6">
                <div className="flex justify-end mb-6">
                    <Link to="/admin/forms/create">
                        <Button className="h-12 px-8 bg-neon-pink text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Google Form
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {forms.map((form) => (
                        <Card key={form.id} className="p-8 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] hover:border-neon-pink/30 hover:bg-zinc-900/60 transition-all duration-500 group">
                            <div className="flex items-center justify-between mb-6">
                                <div className="p-3 rounded-2xl bg-neon-pink/10 text-neon-pink border border-neon-pink/20 group-hover:scale-110 transition-transform duration-500">
                                    <ClipboardList size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <Link to={`/admin/forms/edit/${form.id}`}>
                                        <button className="p-2 text-gray-400 hover:text-white transition-colors"><Edit size={16} /></button>
                                    </Link>
                                    <button onClick={() => handleDelete(form.id)} className="p-2 text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <h3 className="text-xl font-black font-heading text-white mb-3 tracking-tight group-hover:text-neon-pink transition-colors truncate">{form.title}</h3>
                            <p className="text-gray-500 text-xs font-medium line-clamp-2 mb-8 leading-relaxed italic">"{form.description}"</p>

                            <div className="flex flex-wrap gap-2 pt-6 border-t border-white/5">
                                <Button size="sm" variant="outline" onClick={() => handlePushNotification(form)} className="flex-1 py-4 border-white/10 hover:border-yellow-400/30 hover:text-yellow-400">
                                    <Bell className="h-4 w-4 mr-2" /> Push
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleShareWhatsApp(form)} className="flex-1 py-4 border-white/10 hover:border-green-400/30 hover:text-green-400">
                                    <Share2 className="h-4 w-4 mr-2" /> WhatsApp
                                </Button>
                                <Link to={`/forms/${form.id}`} target="_blank" className="flex-1">
                                    <Button size="sm" variant="secondary" className="w-full py-4">
                                        <Eye className="h-4 w-4 mr-2" /> View
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    ))}

                    {forms.length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-500 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                            <p className="font-bold uppercase tracking-widest text-xs">No active forms detected</p>
                            <Link to="/admin/forms/create" className="text-neon-pink hover:underline underline-offset-4 mt-4 inline-block font-black">Initialize First Pulse</Link>
                        </div>
                    )}
                </div>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default FormManager;

