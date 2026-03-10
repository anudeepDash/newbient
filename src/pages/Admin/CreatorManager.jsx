import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { PREDEFINED_CITIES } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Users, Search, MapPin, Instagram, Mail, Phone, ExternalLink, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CreatorManager = () => {
    const { creators, updateCreator } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCity, setFilterCity] = useState('All');
    const [selectedCreator, setSelectedCreator] = useState(null);

    // Get unique cities for filter, combining predefined and any edge cases in DB
    const cities = ['All', ...new Set([...PREDEFINED_CITIES, ...creators.map(c => c.city)])];

    const filteredCreators = creators.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.niches.some(n => n.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCity = filterCity === 'All' || c.city === filterCity;
        return matchesSearch && matchesCity;
    });

    const handleUpdateStatus = async (uid, newStatus) => {
        try {
            await updateCreator(uid, { profileStatus: newStatus });
            if (selectedCreator && selectedCreator.uid === uid) {
                setSelectedCreator({ ...selectedCreator, profileStatus: newStatus });
            }
        } catch (error) {
            alert("Failed to update status");
        }
    };

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-black text-white">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                            <Users className="text-neon-pink" size={32} /> Creator Directory
                        </h1>
                        <p className="text-gray-400 mt-2">Manage influencers and brand ambassadors.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search names or niches..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-neon-pink transition-colors w-full sm:w-64"
                            />
                        </div>
                        <select
                            value={filterCity}
                            onChange={(e) => setFilterCity(e.target.value)}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-neon-pink transition-colors appearance-none"
                        >
                            {cities.map(city => <option key={city} value={city} className="bg-zinc-900">{city}</option>)}
                        </select>
                    </div>
                </div>

                {creators.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                        <p className="text-gray-500">No creators have onboarded yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCreators.map(creator => (
                            <motion.div
                                key={creator.uid}
                                layout
                                onClick={() => setSelectedCreator(creator)}
                                className="bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-neon-pink/50 cursor-pointer transition-colors group relative overflow-hidden"
                            >
                                <div className={`absolute top-0 left-0 w-1 h-full ${creator.profileStatus === 'approved' ? 'bg-neon-green' : 'bg-yellow-500'}`}></div>

                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-xl font-bold font-heading">
                                        {creator.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight group-hover:text-neon-pink transition-colors">{creator.name}</h3>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin size={10} /> {creator.city}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {creator.niches.slice(0, 3).map((n, i) => (
                                        <span key={i} className="text-[9px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-gray-400">{n}</span>
                                    ))}
                                    {creator.niches.length > 3 && <span className="text-[9px] px-2 py-0.5 text-gray-500">+{creator.niches.length - 3} more</span>}
                                </div>
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                    <span className="text-xs text-gray-500 capitalize">{creator.profileStatus || 'Pending'}</span>
                                    <div className="flex gap-2">
                                        {creator.instagram && <Instagram size={14} className="text-gray-400" />}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Creator Detail Modal */}
            <AnimatePresence>
                {selectedCreator && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setSelectedCreator(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="relative bg-zinc-900 border border-white/10 rounded-[2rem] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
                        >
                            <button onClick={() => setSelectedCreator(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white">✕</button>

                            <div className="flex items-start gap-6 mb-8">
                                <div className="w-20 h-20 bg-gradient-to-br from-neon-pink to-blue-500 rounded-full p-1 shrink-0">
                                    <div className="w-full h-full bg-black rounded-full flex items-center justify-center text-3xl font-bold font-heading">
                                        {selectedCreator.name.charAt(0)}
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold font-heading mb-1">{selectedCreator.name}</h2>
                                    <p className="text-neon-pink text-sm uppercase tracking-widest font-bold mb-3">{selectedCreator.city}</p>
                                    <p className="text-gray-400 text-sm">Joined {new Date(selectedCreator.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Contact Details</h3>
                                    <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
                                        <p className="text-sm flex items-center gap-3"><Mail size={16} className="text-gray-400" /> {selectedCreator.email}</p>
                                        <p className="text-sm flex items-center gap-3"><Phone size={16} className="text-gray-400" /> {selectedCreator.phone}</p>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Social Links & Stats</h3>
                                    <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
                                        {selectedCreator.instagram && (
                                            <div>
                                                <a href={`https://instagram.com/${selectedCreator.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-sm font-bold flex items-center gap-2 hover:text-neon-pink transition-colors mb-1">
                                                    <Instagram size={16} className="text-pink-500" /> {selectedCreator.instagram} <ExternalLink size={12} />
                                                </a>
                                                {selectedCreator.instagramFollowers && (
                                                    <p className="text-xs text-gray-400 flex items-center gap-1 ml-6">
                                                        <Activity size={10} className="text-neon-pink" /> {Number(selectedCreator.instagramFollowers).toLocaleString()} Followers
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {selectedCreator.youtube && (
                                            <div className="pt-2 border-t border-white/5">
                                                <a href={selectedCreator.youtube.includes('http') ? selectedCreator.youtube : `https://${selectedCreator.youtube}`} target="_blank" rel="noreferrer" className="text-sm font-bold flex items-center gap-2 hover:text-red-500 transition-colors mb-1">
                                                    <div className="w-4 h-4 bg-red-500 rounded-sm flex items-center justify-center"><ExternalLink size={10} className="text-white" /></div> YouTube Channel <ExternalLink size={12} />
                                                </a>
                                                {selectedCreator.youtubeSubscribers && (
                                                    <p className="text-xs text-gray-400 flex items-center gap-1 ml-6">
                                                        <Activity size={10} className="text-red-500" /> {Number(selectedCreator.youtubeSubscribers).toLocaleString()} Subscribers
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {selectedCreator.portfolioInfo && (
                                            <div className="pt-2 border-t border-white/5">
                                                <a href={selectedCreator.portfolioInfo.includes('http') ? selectedCreator.portfolioInfo : `https://${selectedCreator.portfolioInfo}`} target="_blank" rel="noreferrer" className="text-sm font-bold flex items-center gap-2 hover:text-neon-blue transition-colors text-neon-blue">
                                                    <ExternalLink size={16} /> Media Kit / Portfolio
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Creator Bio</h3>
                                <p className="text-gray-300 text-sm italic bg-white/5 p-4 rounded-xl border border-white/5 leading-relaxed">
                                    "{selectedCreator.bio}"
                                </p>
                            </div>

                            <div className="mb-8">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Niches</h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedCreator.niches.map((n, i) => (
                                        <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium">{n}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-6 border-t border-white/10">
                                {selectedCreator.profileStatus !== 'approved' && (
                                    <Button
                                        onClick={() => handleUpdateStatus(selectedCreator.uid, 'approved')}
                                        className="flex-1 bg-neon-green text-black hover:bg-neon-green/80 font-bold gap-2"
                                    >
                                        <CheckCircle2 size={18} /> Approve
                                    </Button>
                                )}
                                {selectedCreator.profileStatus !== 'rejected' && (
                                    <Button
                                        onClick={() => handleUpdateStatus(selectedCreator.uid, 'rejected')}
                                        variant="outline"
                                        className="flex-1 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-black font-bold gap-2"
                                    >
                                        <XCircle size={18} /> Reject
                                    </Button>
                                )}
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default CreatorManager;
