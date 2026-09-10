import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Eye from 'lucide-react/dist/esm/icons/eye';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Unlock from 'lucide-react/dist/esm/icons/unlock';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Star from 'lucide-react/dist/esm/icons/star';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { Button } from '../../components/ui/Button';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { cn } from '../../lib/utils';
import { notifyAllUsers } from '../../lib/notificationTriggers';

const FormManager = () => {
    useStoreSubscription(['forms']);
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
            content: form.description || "Please take a moment to fill out this form. Your feedback helps us improve.",
            isPinned: false,
            link: `/forms/${form.id}`,
            image: form.image || "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop"
        };
        await addAnnouncement(announcement);
        
        await notifyAllUsers(
            `New Form: ${form.title}`,
            form.description || "We value your input! Please complete this form at your convenience.",
            `/forms/${form.id}`,
            'form'
        );
        
        useStore.getState().addToast('Notification sent to all users!', 'success');
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
            description="Create and manage forms for community feedback and registrations."
            accentColor="neon-pink"
            studioHeader={{
                title: "FORM",
                subtitle: "MANAGER",
                accentClass: "text-neon-pink"
            }}
            action={
                <Link to="/admin/forms/create">
                    <Button className="h-12 px-8 bg-neon-pink text-black font-bold uppercase tracking-widest text-[11px] rounded-xl shadow-[0_10px_30px_rgba(255,79,139,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all border-none flex items-center justify-center gap-2">
                        <Plus size={18} /> Create Form
                    </Button>
                </Link>
            }
        >
            <div className="relative z-10 max-w-[1400px] mx-auto pb-20">
                {forms.length === 0 ? (
                    <div className="py-32 text-center">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-dashed border-black/10 dark:border-white/10">
                            <FileText size={28} className="text-gray-400 dark:text-gray-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No forms yet</h3>
                        <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">Create your first form to start collecting responses from your community.</p>
                        <Link to="/admin/forms/create">
                            <Button className="h-11 px-8 bg-neon-pink text-black font-bold text-xs rounded-xl">
                                <Plus size={16} className="mr-2" /> Create Form
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {forms.map((item) => {
                            const isLive = item.activeLabel === 'Live' || !item.activeLabel;
                            const highlightColor = item.highlightColor || '#FF4F8B';

                            return (
                                <div 
                                    key={item.id} 
                                    className="bg-white dark:bg-zinc-950/50 border border-black/5 dark:border-white/5 rounded-2xl overflow-hidden group hover:border-black/10 dark:hover:border-white/10 transition-all duration-500 flex flex-col"
                                >
                                    {/* Card Header */}
                                    <div className="relative h-44 overflow-hidden">
                                        {item.image ? (
                                            <img 
                                                src={item.image} 
                                                alt={item.title} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${highlightColor}08, ${highlightColor}15)` }}>
                                                <FileText size={40} className="text-gray-300 dark:text-gray-700" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-950 via-transparent to-transparent" />

                                        {/* Status Badge */}
                                        <div className="absolute top-4 left-4">
                                            <div className={cn(
                                                "px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-xl border",
                                                isLive 
                                                    ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400" 
                                                    : "bg-red-500/10 border-red-500/20 text-red-500"
                                            )}>
                                                <div className={cn("w-1.5 h-1.5 rounded-full", isLive ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                                                {item.activeLabel || 'Live'}
                                            </div>
                                        </div>

                                        {/* Spotlight Badge */}
                                        {item.isPinned && (
                                            <div className="absolute top-4 right-4">
                                                <div className="w-7 h-7 rounded-lg bg-neon-pink/90 backdrop-blur-xl flex items-center justify-center">
                                                    <Star size={12} className="text-white fill-current" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Accent Bar */}
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(to right, transparent, ${highlightColor}40, transparent)` }} />
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5 line-clamp-1">
                                            {item.title}
                                        </h3>
                                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4 flex-1">
                                            {item.description || "No description provided."}
                                        </p>

                                        {item.bottomText && (
                                            <div className="mb-4">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.bottomText}</span>
                                            </div>
                                        )}

                                        {/* Quick Actions */}
                                        <div className="space-y-2 pt-3 border-t border-black/5 dark:border-white/5">
                                            {/* Primary Actions Row */}
                                            <div className="flex items-center gap-2">
                                                <Link to={`/admin/forms/edit/${item.id}`} className="flex-1">
                                                    <Button variant="outline" className="w-full h-10 rounded-xl border-black/5 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                                                        <Edit size={13} />
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">Edit</span>
                                                    </Button>
                                                </Link>
                                                <Button 
                                                    variant="outline" 
                                                    onClick={() => handlePushNotification(item)}
                                                    className="flex-1 h-10 rounded-xl border-black/5 dark:border-white/5 bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-black transition-all flex items-center justify-center gap-2"
                                                    title="Push notification to all users"
                                                >
                                                    <Megaphone size={13} />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Notify</span>
                                                </Button>
                                            </div>

                                            {/* Secondary Actions Row */}
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    onClick={() => {
                                                        const newLabel = isLive ? 'Closed' : 'Live';
                                                        useStore.getState().updateForm(item.id, { ...item, activeLabel: newLabel });
                                                    }}
                                                    className={cn(
                                                        "w-10 h-10 rounded-xl border-black/5 dark:border-white/5 transition-all flex items-center justify-center",
                                                        isLive 
                                                            ? "text-green-600 dark:text-green-400 hover:bg-green-500 hover:text-black" 
                                                            : "text-red-500 hover:bg-red-500 hover:text-white"
                                                    )}
                                                    title={isLive ? "Close form" : "Open form"}
                                                >
                                                    {isLive ? <Unlock size={14} /> : <Lock size={14} />}
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    onClick={() => handleShareWhatsApp(item)}
                                                    className="w-10 h-10 rounded-xl border-black/5 dark:border-white/5 text-green-600 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center"
                                                    title="Share on WhatsApp"
                                                >
                                                    <Share2 size={14} />
                                                </Button>
                                                <Link to={`/forms/${item.id}`} target="_blank" className="flex-1">
                                                    <Button variant="outline" className="w-full h-10 rounded-xl border-black/5 dark:border-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                                                        <Eye size={14} />
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">View</span>
                                                    </Button>
                                                </Link>
                                                <Button 
                                                    variant="outline" 
                                                    onClick={() => handleDelete(item.id)}
                                                    className="w-10 h-10 rounded-xl border-red-500/10 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all flex items-center justify-center"
                                                    title="Delete form"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AdminCommunityHubLayout>
    );
};

export default FormManager;
