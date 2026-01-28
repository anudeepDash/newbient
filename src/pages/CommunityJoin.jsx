import React from 'react';
import { useStore } from '../lib/store';
import FormViewer from './FormViewer';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Lock } from 'lucide-react';

const CommunityJoin = () => {
    const { forms, siteDetails } = useStore();
    const communityForm = forms.find(f => f.isCommunityForm);

    const upcomingGigs = [
        {
            id: 1,
            title: "Sunburn Arena ft. Alan Walker",
            date: "Oct 25, 2025",
            location: "Jio Gardens, Mumbai",
            roles: ["Crowd Management", "Artist Hospitality"],
            status: "Open"
        },
        {
            id: 2,
            title: "Lollapalooza India",
            date: "Jan 12-14, 2026",
            location: "Mahalaxmi Race Course",
            roles: ["Backstage Crew", "Ticketing"],
            status: "Filing Fast"
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white pt-24 pb-20 px-4">
            <div className="max-w-6xl mx-auto space-y-20">

                {/* Header */}
                <div className="text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-blue mb-6"
                    >
                        Volunteer & Community Hub
                    </motion.h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Join the Newbi Tribe. Get access to exclusive gigs, community perks, and the inner circle.
                    </p>
                </div>

                {/* Section 1: Registration Form */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-10 w-1 bg-neon-green rounded-full"></div>
                        <h2 className="text-3xl font-bold font-heading">Step 1: Join the Tribe</h2>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden aspect-video relative">
                        <iframe
                            src="https://docs.google.com/forms/d/e/1FAIpQLScsX8qX8qX8qX8qX8qX8qX8q/viewform?embedded=true"
                            className="absolute inset-0 w-full h-full"
                            frameBorder="0"
                            marginHeight="0"
                            marginWidth="0"
                            title="Registration Form"
                        >
                            Loading…
                        </iframe>
                    </div>
                </section>

                {/* Section 2: Whatsapp Community */}
                <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#25D366]/20 to-green-900/20 border border-[#25D366]/30 p-8 md:p-12 text-center">
                    <div className="absolute top-0 right-0 p-32 bg-[#25D366]/10 blur-[100px] rounded-full pointer-events-none"></div>

                    <h2 className="text-3xl font-bold font-heading text-white mb-4">Step 2: Join the Inner Circle</h2>
                    <p className="text-gray-300 max-w-2xl mx-auto mb-8 text-lg">
                        Get instant updates, gig alerts, and connect with fellow volunteers in our exclusive WhatsApp community.
                    </p>

                    {siteDetails.whatsapp ? (
                        <a href={siteDetails.whatsapp} target="_blank" rel="noopener noreferrer">
                            <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white border-none text-xl px-10 py-6 h-auto shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:shadow-[0_0_35px_rgba(37,211,102,0.6)] rounded-full transition-all hover:scale-105">
                                <Users className="mr-3 w-6 h-6" /> Join WhatsApp Community
                            </Button>
                        </a>
                    ) : (
                        <Button disabled className="bg-gray-700 text-gray-400">Link Unavailable</Button>
                    )}
                </section>

                {/* Section 3: Open Gigs */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-10 w-1 bg-neon-blue rounded-full"></div>
                        <h2 className="text-3xl font-bold font-heading">Upcoming Volunteer Gigs</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {upcomingGigs.map((gig) => (
                            <div key={gig.id} className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 hover:border-neon-blue/50 transition-colors group">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-2xl font-bold text-white group-hover:text-neon-blue transition-colors">{gig.title}</h3>
                                    <span className="px-3 py-1 bg-neon-blue/20 text-neon-blue text-xs font-bold uppercase tracking-wider rounded-full">
                                        {gig.status}
                                    </span>
                                </div>

                                <div className="space-y-3 mb-6 text-gray-400">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-5 h-5 text-gray-500" />
                                        <span>{gig.date}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <MapPin className="w-5 h-5 text-gray-500" />
                                        <span>{gig.location}</span>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Users className="w-5 h-5 text-gray-500 mt-1" />
                                        <div className="flex flex-wrap gap-2">
                                            {gig.roles.map(role => (
                                                <span key={role} className="bg-white/5 px-2 py-1 rounded text-sm text-gray-300">{role}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <Button className="w-full bg-none border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-black transition-all">
                                    Apply for Gig
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 4: Secret Store */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-10 w-1 bg-neon-pink rounded-full"></div>
                        <h2 className="text-3xl font-bold font-heading">Secret Store</h2>
                    </div>

                    <div className="relative bg-zinc-900/50 border border-white/5 rounded-2xl p-12 overflow-hidden text-center group">
                        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="mb-6 p-6 bg-zinc-800 rounded-full border border-white/10 group-hover:border-neon-pink/50 group-hover:shadow-[0_0_30px_rgba(255,0,255,0.3)] transition-all duration-500">
                                <Lock className="w-12 h-12 text-gray-400 group-hover:text-neon-pink transition-colors" />
                            </div>

                            <h3 className="text-3xl font-bold text-white mb-2">Coming Soon</h3>
                            <p className="text-gray-400 max-w-lg mx-auto mb-8">
                                Exclusive ticket drops, guestlist spots, and flash sales for our community members. Stay tuned!
                            </p>

                            <Button disabled className="bg-zinc-800 text-gray-500 border-zinc-700 cursor-not-allowed uppercase tracking-widest text-xs">
                                Access Locked
                            </Button>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default CommunityJoin;
