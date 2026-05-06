import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Gift, Search, Download, CheckCircle2, Trophy, Users, ArrowLeft, Filter, Trash2, Star, Shuffle, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadCSV } from '../../components/admin/CSVHandler';
import { cn } from '../../lib/utils';
import { notifySpecificUser } from '../../lib/notificationTriggers';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';

const GiveawayParticipants = () => {
    const { giveawayId } = useParams();
    const { giveaways, giveawayEntries, updateGiveaway, updateGiveawayEntry, deleteGiveawayEntry } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, winners, referrals

    const giveaway = giveaways.find(g => g.id === giveawayId);
    const campaignEntries = giveawayEntries.filter(e => e.campaignId === giveawayId);

    const filteredEntries = campaignEntries.filter(e => {
        const matchesSearch = (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (e.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        if (filter === 'winners') return matchesSearch && e.isWinner;
        if (filter === 'referrals') return matchesSearch && (e.referralCount || 0) > 0;
        return matchesSearch;
    }).sort((a, b) => (b.entryScore || 0) - (a.entryScore || 0));

    const topReferrers = [...campaignEntries]
        .sort((a, b) => (b.referralCount || 0) - (a.referralCount || 0))
        .slice(0, 5);

    const handleExport = () => {
        if (campaignEntries.length === 0) return;
        const data = campaignEntries.map(e => ({
            Name: e.name,
            Email: e.email,
            Phone: e.phone,
            College: e.college,
            City: e.city,
            Entries: e.entryScore,
            Referrals: e.referralCount,
            Answer: e.answer,
            IsWinner: e.isWinner ? 'YES' : 'NO'
        }));
        downloadCSV(data, `${giveaway?.name}_participants`);
    };

    const handleSelectWinner = async (entryId, prize = 'GA Ticket') => {
        try {
            const entry = campaignEntries.find(e => e.id === entryId);
            const isNowWinner = !entry.isWinner;

            await updateGiveawayEntry(entryId, { 
                isWinner: isNowWinner, 
                prize: isNowWinner ? prize : null,
                winnerSelectedAt: isNowWinner ? new Date().toISOString() : null
            });

            if (isNowWinner && entry.userId) {
                await notifySpecificUser(
                    entry.userId,
                    'YOU ARE A WINNER! 🏆',
                    `CONGRATULATIONS! YOU HAVE WON ${prize.toUpperCase()} IN THE ${giveaway.name.toUpperCase()} GIVEAWAY.`,
                    `/giveaway/${giveaway.slug}`,
                    'giveaway'
                );
            }
        } catch (error) {
            useStore.getState().addToast("Error selecting winner", 'error');
        }
    };

    const handleRandomDraw = async () => {
        if (campaignEntries.length === 0) return;
        
        // Weighted random selection based on entryScore
        let totalWeight = campaignEntries.reduce((acc, e) => acc + (e.entryScore || 0), 0);
        let random = Math.random() * totalWeight;
        
        let cumulativeWeight = 0;
        for (const entry of campaignEntries) {
            cumulativeWeight += (entry.entryScore || 0);
            if (random <= cumulativeWeight) {
                if (window.confirm(`Selected ${entry.name} at random. Confirm as winner?`)) {
                    await handleSelectWinner(entry.id);
                }
                break;
            }
        }
    };

    if (!giveaway) return <div className="p-20 text-center uppercase font-black text-gray-500">Giveaway not found</div>;

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[20%] left-[-5%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-24 md:pt-32">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
                    <div className="space-y-4">
                        <AdminDashboardLink className="mb-4" />
                        <h1 className="text-4xl md:text-5xl font-black font-heading tracking-tighter uppercase italic pr-4">
                            {giveaway.name} <span className="text-purple-500">PORTAL.</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest pl-1">
                            {campaignEntries.length} Active Participants • {campaignEntries.filter(e => e.isWinner).length} Winners Selected
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <Button 
                            onClick={() => {
                                const params = new URLSearchParams({
                                    subject: `UPDATE: ${giveaway.name} Giveaway`,
                                    header: giveaway.name,
                                    body: `Hello Tribe! We have exciting updates regarding the ${giveaway.name} giveaway.`,
                                    heroImage: giveaway.image || '',
                                    ctaText: 'CHECK WINNERS',
                                    ctaUrl: `${window.location.origin}/giveaway/${giveaway.slug}`
                                });
                                window.location.href = `/admin/mailing?${params.toString()}`;
                            }}
                            className="h-14 px-8 bg-neon-green text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-all shadow-lg"
                        >
                            <Mail className="mr-2" size={18} /> Broadcast to All
                        </Button>
                        <Button onClick={handleRandomDraw} className="h-14 px-8 border border-purple-500/30 bg-purple-500/10 text-purple-500 font-black uppercase tracking-widest rounded-2xl hover:bg-purple-500 hover:text-white transition-all">
                            <Shuffle className="mr-2" size={18} /> Weighted Draw
                        </Button>
                        <Button onClick={handleExport} className="h-14 px-8 bg-zinc-900 border border-white/5 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-white hover:text-black transition-all">
                            <Download className="mr-2" size={18} /> Export List
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Sidebar: Stats & Leaderboard */}
                    <div className="space-y-10">
                        <Card className="p-8 bg-zinc-900/40 border-white/5 rounded-[2rem] backdrop-blur-3xl">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                                <div className="w-8 h-px bg-purple-500" /> TOP REFERRERS
                            </h3>
                            <div className="space-y-6">
                                {topReferrers.map((ref, i) => (
                                    <div key={ref.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-500 group-hover:bg-purple-500/20 group-hover:text-purple-500 transition-all">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-tight">{ref.name}</p>
                                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{ref.college}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-purple-500">{ref.referralCount}</p>
                                            <p className="text-[8px] text-gray-600 font-bold uppercase">Referrals</p>
                                        </div>
                                    </div>
                                ))}
                                {topReferrers.length === 0 && <p className="text-[10px] text-gray-600 uppercase font-black text-center py-4 italic">No referrals yet</p>}
                            </div>
                        </Card>

                        <Card className="p-8 bg-zinc-900/40 border-white/5 rounded-[2rem] backdrop-blur-3xl">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                                <div className="w-8 h-px bg-neon-green" /> MISSION STATS
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                                    <p className="text-3xl font-black font-heading text-white">{campaignEntries.length}</p>
                                    <p className="text-[9px] text-gray-500 font-black uppercase mt-1">Total Entries</p>
                                </div>
                                <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                                    <p className="text-3xl font-black font-heading text-purple-500">{campaignEntries.reduce((acc, e) => acc + (e.entryScore || 0), 0)}</p>
                                    <p className="text-[9px] text-gray-500 font-black uppercase mt-1">Total Points</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Main Content: Participant List */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Combined Search & Filters Bar - Matching Invoice Style */}
                        <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-2 mb-16 backdrop-blur-3xl flex flex-col xl:flex-row items-center gap-4">
                            <div className="relative flex-1 w-full group">
                                <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={20} />
                                <input 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="SEARCH BY NAME OR EMAIL..."
                                    className="w-full bg-transparent h-16 pl-20 pr-8 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none transition-all placeholder:text-gray-600"
                                />
                                <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-3">
                                    <div className="w-px h-6 bg-white/10" />
                                    <Filter size={16} className="text-gray-600 hover:text-white cursor-pointer transition-colors" />
                                </div>
                            </div>
                            <div className="flex bg-black/40 p-1.5 rounded-[1.5rem] border border-white/5 w-full xl:w-auto mr-1">
                                {['all', 'winners', 'referrals'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={cn(
                                            "px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 min-w-[120px]",
                                            filter === f 
                                                ? "bg-purple-500 text-white shadow-[0_10px_25px_rgba(168,85,247,0.3)] scale-[1.02]" 
                                                : "text-gray-500 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {filteredEntries.map(entry => (
                                <Card key={entry.id} className={cn(
                                    "p-6 bg-zinc-900/40 border hover:border-white/10 transition-all rounded-[2rem] backdrop-blur-3xl relative overflow-hidden group",
                                    entry.isWinner ? 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'border-white/5'
                                )}>
                                    {entry.isWinner && <div className="absolute top-0 right-0 p-4 text-purple-500"><Trophy size={20} /></div>}
                                    
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-xl font-black group-hover:bg-purple-500 group-hover:text-white transition-all duration-500">
                                                {entry.entryScore}
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black uppercase tracking-tight flex items-center gap-3">
                                                    {entry.name}
                                                    {entry.hasFollowedInsta && <Star size={12} className="text-yellow-400 fill-yellow-400" title="Insta Follower" />}
                                                </h4>
                                                <div className="flex flex-wrap items-center gap-4 mt-1">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase">{entry.college}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-800" />
                                                    <span className="text-[10px] font-bold text-purple-500 uppercase">{entry.referralCount} Referrals</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="hidden md:block text-right mr-4">
                                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-1 italic">Why should win?</p>
                                                <p className="text-[10px] text-gray-400 max-w-[200px] line-clamp-1 italic">"{entry.answer}"</p>
                                            </div>
                                            <button
                                                onClick={() => handleSelectWinner(entry.id)}
                                                className={cn(
                                                    "h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                                    entry.isWinner 
                                                        ? 'bg-purple-500 text-white border-purple-500' 
                                                        : 'bg-white/5 text-gray-500 border-white/5 hover:text-white hover:border-white/20'
                                                )}
                                            >
                                                {entry.isWinner ? 'REVOKE WINNER' : 'SELECT WINNER'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const params = new URLSearchParams({
                                                        subject: entry.isWinner ? 'YOU WON! 🏆' : `UPDATE: ${giveaway.name}`,
                                                        header: entry.isWinner ? 'CONGRATULATIONS!' : giveaway.name,
                                                        body: entry.isWinner 
                                                            ? `HI ${entry.name.toUpperCase()}! YOU HAVE BEEN SELECTED AS A WINNER IN OUR ${giveaway.name.toUpperCase()} GIVEAWAY!`
                                                            : `HI ${entry.name.toUpperCase()}! THANKS FOR PARTICIPATING IN ${giveaway.name.toUpperCase()}. WE HAVE SOME UPDATES FOR YOU.`,
                                                        ctaText: 'SEE DETAILS',
                                                        ctaUrl: `${window.location.origin}/giveaway/${giveaway.slug}`
                                                    });
                                                    window.location.href = `/admin/mailing?${params.toString()}`;
                                                }}
                                                className="h-12 w-12 flex items-center justify-center rounded-xl bg-neon-blue/10 text-neon-blue border border-neon-blue/20 hover:bg-neon-blue hover:text-black transition-all"
                                                title="Send Targeted Email"
                                            >
                                                <Mail size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`Remove ${entry.name} from this giveaway?`)) {
                                                        deleteGiveawayEntry(entry.id);
                                                    }
                                                }}
                                                className="h-12 w-12 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                                                title="Delete Participant"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Expanded Detail (hover) */}
                                    <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 md:grid-cols-6 gap-6 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <div>
                                            <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">Email</p>
                                            <p className="text-[10px] font-bold text-white lowercase">{entry.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">Phone</p>
                                            <p className="text-[10px] font-bold text-white">{entry.phone}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">College</p>
                                            <p className="text-[10px] font-bold text-white uppercase truncate">{entry.college || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">City</p>
                                            <p className="text-[10px] font-bold text-white uppercase">{entry.city}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">Instagram</p>
                                            <p className="text-[10px] font-bold text-neon-pink">{entry.instagramUsername || entry.instagram || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">Why Should Win</p>
                                            <p className="text-[10px] font-bold text-white uppercase truncate">{entry.answer || 'N/A'}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            {filteredEntries.length === 0 && (
                                <div className="text-center py-20 bg-zinc-900/20 rounded-[3rem] border border-dashed border-white/5">
                                    <Users size={40} className="mx-auto text-gray-700 mb-4" />
                                    <p className="text-xs font-black text-gray-600 uppercase tracking-widest">No entries match your search</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GiveawayParticipants;
