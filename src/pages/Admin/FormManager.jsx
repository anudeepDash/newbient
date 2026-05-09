import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Eye from 'lucide-react/dist/esm/icons/eye';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import Pin from 'lucide-react/dist/esm/icons/pin';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Info from 'lucide-react/dist/esm/icons/info';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Zap from 'lucide-react/dist/esm/icons/zap';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Unlock from 'lucide-react/dist/esm/icons/unlock';
import { useStore } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
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
        
        await notifyAllUsers(
            `FORM ACCESS: ${form.title.toUpperCase()}`,
            form.description || "YOUR FEEDBACK IS REQUIRED. PARTICIPATE IN THIS FORM NOW.",
            `/forms/${form.id}`,
            'form'
        );
        
        useStore.getState().addToast('Form pushed to announcements and notifications triggered!', 'success');
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
            description="Manage data collection pipelines and community intake systems."
            studioHeader={{
                title: "FORM",
                subtitle: "ENGINE",
                accentClass: "text-neon-pink"
            }}
            action={
                <Link to="/admin/forms/create">
                    <Button className="h-16 px-12 bg-neon-pink text-black font-black uppercase tracking-[0.3em] text-[12px] rounded-[1rem] shadow-[0_15px_40px_rgba(255,79,139,0.2)] hover:scale-105 active:scale-95 transition-all border-none flex items-center justify-center gap-3">
                        <Plus size={24} /> CREATE NEW
                    </Button>
                </Link>
            }
        >
            <div className="relative z-10 max-w-[1400px] mx-auto pb-32">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {forms.map((item) => (
                        <Card key={item.id} className="p-0 bg-zinc-950/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] overflow-hidden group hover:border-neon-pink/30 transition-all duration-700 shadow-2xl flex flex-col h-full">
                            {/* Card Header Media */}
                            <div className="h-48 relative overflow-hidden">
                                {item.image ? (
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-40 group-hover:opacity-70 group-hover:scale-110 transition-all duration-1000" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
                                        <FileText size={48} className="text-white/10" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                                
                                <div className="absolute top-6 right-6 flex gap-2">
                                    <div className={cn(
                                        "px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5",
                                        item.activeLabel === 'Live' ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                                    )}>
                                        <div className="w-1 h-1 rounded-full bg-current animate-pulse" />
                                        {item.activeLabel || 'LIVE'}
                                    </div>
                                </div>

                                <div className="absolute bottom-6 left-8 right-8">
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white truncate drop-shadow-2xl">{item.title}</h3>
                                    <div className="flex items-center gap-4 mt-2 opacity-60">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <Calendar size={10} className="text-neon-pink" /> {item.date || 'PERPETUAL'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-8 flex-grow flex flex-col justify-between">
                                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-widest line-clamp-2 italic leading-relaxed">
                                    {item.description || "EMPTY."}
                                </p>

                                <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Button 
                                            variant="outline" 
                                            onClick={() => handlePushNotification(item)}
                                            className="flex-1 h-12 rounded-xl border-white/5 bg-yellow-500/5 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all flex items-center justify-center gap-2 group/btn"
                                        >
                                            <Megaphone size={14} className="group-hover/btn:rotate-12 transition-transform" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">NOTIFY</span>
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            onClick={() => handleShareWhatsApp(item)}
                                            className="w-12 h-12 rounded-xl border-white/5 bg-neon-pink/5 text-neon-pink hover:bg-neon-pink hover:text-black transition-all flex items-center justify-center"
                                        >
                                            <Share2 size={16} />
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button 
                                            variant="outline" 
                                            onClick={() => {
                                                const newLabel = item.activeLabel === 'Live' ? 'Closed' : 'Live';
                                                useStore.getState().updateForm(item.id, { ...item, activeLabel: newLabel });
                                            }}
                                            className={cn(
                                                "w-12 h-14 rounded-2xl border-white/5 transition-all flex items-center justify-center",
                                                item.activeLabel === 'Live' ? "bg-white/5 text-neon-green hover:bg-neon-green hover:text-black" : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                                            )}
                                            title={item.activeLabel === 'Live' ? "Close Form" : "Open Form"}
                                        >
                                            {item.activeLabel === 'Live' ? <Unlock size={18} /> : <Lock size={18} />}
                                        </Button>
                                        <Link to={`/admin/forms/edit/${item.id}`} className="flex-1">
                                            <Button variant="outline" className="w-full h-14 rounded-2xl border-white/5 hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2">
                                                <Edit size={16} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">EDIT</span>
                                            </Button>
                                        </Link>
                                        <Link to={`/forms/${item.id}`} target="_blank">
                                            <Button variant="outline" className="w-14 h-14 rounded-2xl border-white/5 text-gray-500 hover:text-white hover:bg-white/5 flex items-center justify-center">
                                                <Eye size={18} />
                                            </Button>
                                        </Link>
                                        <Button 
                                            variant="outline" 
                                            onClick={() => handleDelete(item.id)}
                                            className="w-14 h-14 rounded-2xl bg-red-500 text-white border-none hover:bg-red-600 transition-all flex items-center justify-center shrink-0"
                                        >
                                            <Trash2 size={20} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}

                    {forms.length === 0 && (
                        <div className="col-span-full py-40 text-center">
                            <div className="w-20 h-20 bg-white/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 border border-dashed border-white/10">
                                <FileText size={32} className="text-white/20" />
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

export default FormManager;
