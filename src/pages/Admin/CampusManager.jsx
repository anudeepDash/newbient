import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { Users, Search, CheckCircle2, XCircle, Mail, Phone, MapPin, GraduationCap, ChevronLeft, Calendar, Hash, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import useDynamicMeta from '../../hooks/useDynamicMeta';

const CampusManager = () => {
    useDynamicMeta({
        title: "Manage Campus Ambassadors",
    });

    const { campusProfiles, updateCampusProfile, deleteCampusProfile, creators } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, pending, approved, rejected
    const [selectedProfile, setSelectedProfile] = useState(null);

    // Filter campus creators (who are approved and niche includes student/campus)
    const campusInfluencersFromCreators = React.useMemo(() => {
        return (creators || []).filter(c => 
            c.status === 'approved' && 
            (c.niche?.toLowerCase().includes('student') || c.niche?.toLowerCase().includes('campus'))
        ).map(c => ({
            ...c,
            fullName: c.name || c.fullName,
            isCreatorImport: true,
            profileStatus: 'approved',
            role: 'campus_influencer'
        }));
    }, [creators]);

    const allProfiles = [...(campusProfiles || []), ...campusInfluencersFromCreators];

    const filteredProfiles = allProfiles.filter(prof => {
        const matchesSearch = (prof.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (prof.university || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (prof.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || prof.profileStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleStatusChange = async (uid, newStatus) => {
        await updateCampusProfile(uid, { profileStatus: newStatus });
        if (selectedProfile?.uid === uid) {
            setSelectedProfile(prev => ({ ...prev, profileStatus: newStatus }));
        }
    };

    const handleDelete = async (uid) => {
        if (window.confirm("Are you sure you want to delete this profile?")) {
            await deleteCampusProfile(uid);
            if (selectedProfile?.uid === uid) {
                setSelectedProfile(null);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0F17] text-white font-['Outfit'] pt-24 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#0B0F17]/80 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/admin" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                            <ChevronLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                <GraduationCap className="text-neon-blue" />
                                Campus <span className="text-neon-blue">Network</span>
                            </h1>
                            <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest mt-1">
                                {filteredProfiles.length} Profiles
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <Link to="/admin/campus/activation/new" className="h-10 px-4 bg-neon-purple/20 text-neon-purple hover:bg-neon-purple hover:text-black font-bold uppercase tracking-widest text-xs rounded-xl flex items-center justify-center transition-all">
                            + New Campaign
                        </Link>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search profiles..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 bg-black border border-white/10 rounded-xl pl-10 pr-4 text-sm focus:border-neon-blue focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="flex bg-black border border-white/10 rounded-xl p-1">
                            {['all', 'pending', 'approved', 'rejected'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                                        statusFilter === status ? "bg-neon-blue text-black" : "text-zinc-500 hover:text-white"
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 md:px-8 py-8 flex gap-8">
                {/* List View */}
                <div className={cn("flex-1 space-y-4", selectedProfile ? "hidden lg:block lg:w-1/2" : "w-full")}>
                    {filteredProfiles.length === 0 ? (
                        <div className="text-center py-20 border border-white/5 rounded-3xl bg-white/5">
                            <GraduationCap size={48} className="mx-auto text-zinc-600 mb-4" />
                            <h3 className="text-xl font-bold mb-2">No Applications Found</h3>
                            <p className="text-zinc-400 text-sm">Adjust your search or filter settings.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {filteredProfiles.map((amb) => (
                                <div 
                                    key={prof.uid}
                                    onClick={() => setselectedProfile(amb)}
                                    className={cn(
                                        "group p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4",
                                        selectedProfile?.uid === prof.uid ? "bg-neon-blue/10 border-neon-blue/50" : "bg-black/40 border-white/5 hover:border-white/20"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                            <span className="text-lg font-black text-white group-hover:text-neon-blue transition-colors">
                                                {prof.fullName?.charAt(0) || 'U'}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg flex items-center gap-2">
                                                {prof.fullName || 'Unknown'}
                                                {prof.profileStatus === 'approved' && <CheckCircle2 size={14} className="text-neon-green" />}
                                                {prof.profileStatus === 'pending' && <span className="w-2 h-2 rounded-full bg-yellow-500" />}
                                                {prof.profileStatus === 'rejected' && <XCircle size={14} className="text-red-500" />}
                                            </h3>
                                            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                                                <span className="flex items-center gap-1"><GraduationCap size={12}/> {prof.university || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-2">
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                            prof.profileStatus === 'approved' ? "bg-neon-green/10 text-neon-green border border-neon-green/20" :
                                            prof.profileStatus === 'rejected' ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                                            "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                                        )}>
                                            {prof.profileStatus || 'pending'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Details Panel */}
                {selectedProfile && (
                    <div className="flex-1 lg:w-1/2">
                        <div className="sticky top-28 bg-black/40 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0">
                                        <span className="text-2xl font-black text-neon-blue">
                                            {selectedProfile.fullName?.charAt(0)}
                                        </span>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black">{selectedProfile.fullName}</h2>
                                        <p className="text-neon-blue font-medium text-sm">{selectedProfile.course} • {selectedProfile.graduationYear}</p>
                                    </div>
                                </div>
                                <button onClick={() => setselectedProfile(null)} className="lg:hidden p-2 bg-white/5 rounded-xl text-zinc-400">
                                    <XCircle size={20} />
                                </button>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4 mb-8">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                                        <Mail size={16} className="text-zinc-500" />
                                        <a href={`mailto:${selectedProfile.email}`} className="hover:text-neon-blue truncate">{selectedProfile.email}</a>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                                        <Phone size={16} className="text-zinc-500" />
                                        <span>{selectedProfile.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                                        <MapPin size={16} className="text-zinc-500" />
                                        <span>{selectedProfile.city}</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                                        <GraduationCap size={16} className="text-zinc-500" />
                                        <span className="truncate">{selectedProfile.university}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                                        <Users size={16} className="text-zinc-500" />
                                        <a href={`https://instagram.com/${selectedProfile.instagram?.replace('@', '')}`} target="_blank" rel="noreferrer" className="hover:text-neon-blue truncate">
                                            {selectedProfile.instagram || 'N/A'}
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Why Join?</h4>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-sm text-zinc-300 leading-relaxed italic">
                                    "{selectedProfile.whyJoin}"
                                </div>
                            </div>

                            {selectedProfile.profileStatus === 'approved' && selectedProfile.referralCode && (
                                <div className="mb-8 p-4 bg-neon-green/10 border border-neon-green/20 rounded-2xl">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-neon-green mb-3 flex items-center gap-2">
                                        <Hash size={14} /> Referral Tracking
                                    </h4>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-zinc-400 mb-1">Referral Code</p>
                                            <p className="font-mono text-lg font-bold text-white">{selectedProfile.referralCode}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-zinc-400 mb-1">Total Referrals</p>
                                            <p className="text-2xl font-black text-neon-green">{selectedProfile.referralsCount || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                {selectedProfile.profileStatus === 'pending' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => handleStatusChange(selectedProfile.uid, 'approved')}
                                            className="h-12 bg-neon-green text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 size={16} /> Approve
                                        </button>
                                        <button 
                                            onClick={() => handleStatusChange(selectedProfile.uid, 'rejected')}
                                            className="h-12 bg-red-500/20 text-red-500 font-black uppercase tracking-widest text-xs rounded-xl hover:bg-red-500/30 transition-all flex items-center justify-center gap-2"
                                        >
                                            <XCircle size={16} /> Reject
                                        </button>
                                    </div>
                                )}
                                {selectedProfile.profileStatus === 'approved' && (
                                    <button 
                                        onClick={() => handleStatusChange(selectedProfile.uid, 'rejected')}
                                        className="h-12 bg-white/5 text-zinc-400 font-black uppercase tracking-widest text-xs rounded-xl hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        Revoke Status
                                    </button>
                                )}
                                {selectedProfile.profileStatus === 'rejected' && (
                                    <button 
                                        onClick={() => handleStatusChange(selectedProfile.uid, 'approved')}
                                        className="h-12 bg-white/5 text-zinc-400 font-black uppercase tracking-widest text-xs rounded-xl hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        Approve Instead
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleDelete(selectedProfile.uid)}
                                    className="h-12 mt-4 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-500/10 rounded-xl transition-all"
                                >
                                    Delete Application
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CampusManager;
