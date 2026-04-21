import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Share2, Bell, Eye, ClipboardList, Pin, Sparkles, ArrowRight, Info, Calendar, MapPin, Megaphone } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import CommunityCard from '../../components/community/CommunityCard';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { cn } from '../../lib/utils';

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
            title: `Form Access: ${form.title}`,
            date: new Date().toISOString().split('T')[0],
            content: form.description || "YOUR PARTICIPATION IS REQUIRED. PARTICIPATE IN THIS FORM NOW.",
            isPinned: false,
            link: `/forms/${form.id}`,
            image: form.image || "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop"
        };
        await addAnnouncement(announcement);
        
        // Trigger Push Notification
        await notifyAllUsers(
            `FORM ACCESS: ${form.title.toUpperCase()}`,
            form.description || "YOUR FEEDBACK IS REQUIRED. PARTICIPATE IN THIS FORM NOW.",
            `/forms/${form.id}`,
            'form'
        );
        
        alert('Form pushed to announcements and notifications triggered!');
    };

    const handleShareWhatsApp = (form) => {
        const link = `${window.location.origin}/forms/${form.id}`;
        const text = `Take the form: ${form.title} - ${link}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    return (
        <AdminCommunityHubLayout 
            title="Form Systems" 
            description="Create and manage interactive surveys, feedback forms, and loops."
            studioHeader={{
                title: "FORM",
                subtitle: "MANAGEMENT",
                accentClass: "text-neon-pink"
            }}
        >
            <div className="relative z-10 max-w-[1400px] mx-auto pb-32">
                {/* Mode Actions */}
                <div className="flex justify-end mb-12">
                    <Link to="/admin/forms/create">
                        <Button className="h-14 px-10 bg-neon-pink text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(255,79,139,0.2)] hover:scale-105 transition-all outline-none border-none">
                            <Plus className="mr-2" size={18} /> New Form
                        </Button>
                    </Link>
                </div>


                <div className="grid grid-cols-1 gap-6">
                    {forms.map((item) => (
                        <Card key={item.id} className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] hover:border-neon-pink/30 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(255,79,139,0.05)]">
                            <div className="flex items-center gap-6 flex-1">
                                {/* Mini Image Preview */}
                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 shrink-0 hidden md:block">
                                    <img src={item.image} alt="" className="w-full h-full object-cover opacity-50" />
                                </div>
                                
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{item.title}</h3>
                                        <div className="px-3 py-1 bg-neon-pink/10 border border-neon-pink/20 rounded-full text-[9px] font-black uppercase tracking-widest text-neon-pink flex items-center justify-center">
                                            Active
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                                        <span className="flex items-center gap-1.5"><Calendar size={12} className="text-neon-pink" /> {item.date || 'PERPETUAL'}</span>
                                        <span className="flex items-center gap-1.5"><ClipboardList size={12} className="text-neon-pink" /> SURVEY</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 self-end md:self-center">
                                <div className="flex gap-2 mr-4 pr-4 border-r border-white/5">
                                    <button 
                                        onClick={() => handlePushNotification(item)}
                                        className="px-5 py-2.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-yellow-500 hover:text-black transition-all flex items-center gap-2 group/btn"
                                        title="Signal Boost"
                                    >
                                        <Megaphone size={14} className="group-hover/btn:rotate-12 transition-transform" />
                                        Promote
                                    </button>
                                    <button 
                                        onClick={() => handleShareWhatsApp(item)}
                                        className="p-2.5 bg-neon-pink/10 text-neon-pink border border-neon-pink/20 rounded-xl hover:bg-neon-pink hover:text-black transition-all"
                                        title="Share Link"
                                    >
                                        <Share2 size={16} />
                                    </button>
                                </div>

                                <Link to={`/admin/forms/edit/${item.id}`}>
                                    <button className="px-5 py-2.5 bg-white/5 border border-white/10 text-[9px] font-black text-white hover:text-black hover:bg-white uppercase tracking-widest rounded-xl transition-all">
                                        Edit Form
                                    </button>
                                </Link>
                                
                                <Link to={`/forms/${item.id}`} target="_blank">
                                    <button 
                                        className="p-2.5 bg-white/5 border border-white/10 text-gray-500 hover:text-white rounded-xl transition-all"
                                        title="View Live"
                                    >
                                        <Eye size={16} />
                                    </button>
                                </Link>
                                
                                <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-black rounded-xl transition-all"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </Card>
                    ))}

                    {forms.length === 0 && (
                        <div className="col-span-full py-16 text-center text-gray-500 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                            <p className="mb-2">No active forms available.</p>
                            <Link to="/admin/forms/create">
                                <Button variant="link" className="text-neon-pink p-0 h-auto font-black uppercase tracking-widest text-[10px]">
                                    Create first form
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default FormManager;
