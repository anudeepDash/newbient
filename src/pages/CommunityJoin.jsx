import React, { useEffect } from 'react';
import { useStore } from '../lib/store';
import FormViewer from './FormViewer';
import { Button } from '../components/ui/Button';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Lock, Share2, ClipboardList, ExternalLink, ArrowRight } from 'lucide-react';

const CommunityJoin = () => {
    const { forms, siteDetails, volunteerGigs } = useStore();
    const location = useLocation();

    // Auto-scroll to gig if query param exists
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const gigId = params.get('gig');
        if (gigId && volunteerGigs.length > 0) {
            const element = document.getElementById(`gig-${gigId}`);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 500); // Small delay to ensure render
            }
        }
    }, [location.search, volunteerGigs]);

    return (
        <div className="min-h-screen bg-black text-white pt-20 md:pt-24 pb-16 md:pb-20 px-4 scroll-smooth">
            <div className="max-w-6xl mx-auto space-y-12 md:space-y-20">

                {/* Header */}
                <div className="text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-6xl font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-blue mb-4 md:mb-6"
                    >
                        Volunteer & Community Hub
                    </motion.h1>
                    <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-2">
                        Join the Newbi Tribe. Get access to exclusive gigs, community perks, and the inner circle.
                    </p>
                </div>

                {/* Section 1: Registration Form */}
                <section>
                    <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                        <div className="h-8 md:h-10 w-1 bg-neon-green rounded-full"></div>
                        <h2 className="text-2xl md:text-3xl font-bold font-heading">Step 1: Join the Tribe</h2>
                    </div>

                    <div className="w-full max-w-4xl mx-auto aspect-[1/2] sm:aspect-[4/5] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                        <iframe
                            src="https://docs.google.com/forms/d/e/1FAIpQLScQv55cT-hPBqTtw7PFqOZND6QfPkmjzT8_4Sf4G53_UYwSQg/viewform?embedded=true"
                            className="w-full h-full border-0"
                            style={{ filter: 'invert(1) hue-rotate(180deg)', background: 'transparent' }}
                            title="NewBi Tribe Registration"
                        >
                            Loading form...
                        </iframe>
                    </div>
                </section>

                {/* Section 2: Whatsapp Community */}
                <section className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-r from-[#25D366]/20 to-green-900/20 border border-[#25D366]/30 p-6 md:p-12 text-center">
                    <div className="absolute top-0 right-0 p-24 md:p-32 bg-[#25D366]/10 blur-[80px] md:blur-[100px] rounded-full pointer-events-none"></div>

                    <h2 className="text-2xl md:text-3xl font-bold font-heading text-white mb-4">Step 2: Join the Inner Circle</h2>
                    <p className="text-gray-300 max-w-2xl mx-auto mb-6 md:mb-8 text-base md:text-lg">
                        Get instant updates, gig alerts, and connect with fellow volunteers in our exclusive WhatsApp community.
                    </p>

                    {siteDetails.whatsappCommunity ? (
                        <a href={siteDetails.whatsappCommunity} target="_blank" rel="noopener noreferrer">
                            <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white border-none text-lg md:text-xl px-8 md:px-10 py-5 md:py-6 h-auto shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:shadow-[0_0_35px_rgba(37,211,102,0.6)] rounded-full transition-all hover:scale-105 w-full md:w-auto">
                                <Users className="mr-3 w-5 h-5 md:w-6 md:h-6" /> Join WhatsApp Community
                            </Button>
                        </a>
                    ) : (
                        <Button disabled className="bg-gray-700 text-gray-400">Link Unavailable</Button>
                    )}
                </section>

                {/* Section 3: Open Gigs */}
                <section>
                    <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                        <div className="h-8 md:h-10 w-1 bg-neon-blue rounded-full"></div>
                        <h2 className="text-2xl md:text-3xl font-bold font-heading">Upcoming Volunteer Gigs</h2>
                    </div>

                    {volunteerGigs && volunteerGigs.length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                            {volunteerGigs.map((gig) => (
                                <div
                                    key={gig.id}
                                    id={`gig-${gig.id}`}
                                    className={`bg-zinc-900/50 border rounded-xl p-5 md:p-6 transition-all group relative ${new URLSearchParams(location.search).get('gig') === gig.id
                                        ? 'border-neon-blue shadow-[0_0_30px_rgba(0,243,255,0.2)]'
                                        : 'border-white/10 hover:border-neon-blue/50'
                                        }`}
                                >
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                                        <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-neon-blue transition-colors pr-2">{gig.title}</h3>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={`px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-full ${gig.status === 'Open' ? 'bg-neon-green/20 text-neon-green' : 'bg-red-500/20 text-red-500'}`}>
                                                {gig.status}
                                            </span>
                                        </div>
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
                                        {gig.roles && (
                                            <div className="flex items-start gap-3">
                                                <Users className="w-5 h-5 text-gray-500 mt-1" />
                                                <div className="flex flex-wrap gap-2">
                                                    {Array.isArray(gig.roles) ? gig.roles.map((role, idx) => (
                                                        <span key={idx} className="bg-white/5 px-2 py-1 rounded text-sm text-gray-300">{role}</span>
                                                    )) : (
                                                        <span className="bg-white/5 px-2 py-1 rounded text-sm text-gray-300">{gig.roles}</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>


                                    {/* Action Row */}
                                    <div className="flex gap-3 mt-auto">
                                        <button
                                            onClick={() => {
                                                const url = `${window.location.origin}/community-join?gig=${gig.id}`;
                                                navigator.clipboard.writeText(url);
                                                alert('Link copied to clipboard!');
                                            }}
                                            className="p-3 bg-zinc-800 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-zinc-700 transition-colors"
                                            title="Share Gig"
                                        >
                                            <Share2 size={20} />
                                        </button>

                                        {gig.applyType === 'whatsapp' ? (
                                            <a
                                                href={`https://wa.me/${gig.applyLink || ''}?text=${encodeURIComponent(`Hi, I'd like to apply for the volunteer gig: ${gig.title}`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1"
                                            >
                                                <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white border-none transition-all shadow-lg shadow-green-500/20 h-full">
                                                    <div className="flex items-center justify-center gap-2">
                                                        Apply via WhatsApp
                                                    </div>
                                                </Button>
                                            </a>
                                        ) : (
                                            <a href={gig.applyLink || "#"} target="_blank" rel="noopener noreferrer" className="flex-1">
                                                <Button className="w-full bg-none border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-black transition-all h-full">
                                                    Apply for Gig
                                                </Button>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-zinc-900/30 border border-white/10 rounded-2xl p-12 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
                            <div className="relative z-10">
                                <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Users className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">No Open Gigs Currently</h3>
                                <p className="text-gray-400 max-w-lg mx-auto">
                                    We don't have any active volunteer listings right now, but things move fast here!
                                    <br />
                                    <span className="text-neon-green block mt-2 font-bold">Join the WhatsApp Community to get alerted the moment a gig drops.</span>
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                {/* Section 4: Community Forms & Applications */}
                <section>
                    <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                        <div className="h-8 md:h-10 w-1 bg-yellow-400 rounded-full"></div>
                        <h2 className="text-2xl md:text-3xl font-bold font-heading">Active Forms & Surveys</h2>
                    </div>

                    {forms && forms.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {forms.map((form) => (
                                <div key={form.id} className="bg-zinc-900/50 border border-white/10 rounded-xl p-5 md:p-6 hover:border-yellow-400/50 transition-colors group flex flex-col justify-between h-full hover:bg-zinc-900/80">
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="p-2 bg-yellow-400/10 rounded-lg text-yellow-400 group-hover:scale-110 transition-transform duration-300">
                                                <ClipboardList size={24} />
                                            </div>
                                            {form.deadline && (
                                                <span className="text-[10px] uppercase font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded">
                                                    Due: {form.deadline}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors leading-tight">{form.title}</h3>
                                        <p className="text-gray-400 text-sm mb-6 line-clamp-3">{form.description}</p>
                                    </div>
                                    <div className="mt-auto pt-4 border-t border-white/5">
                                        <Link to={`/forms/${form.id}`}>
                                            <Button className="w-full bg-transparent border border-white/20 text-white hover:border-yellow-400 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all font-medium flex items-center justify-center gap-2 group-hover:border-yellow-400">
                                                <span>View Form</span>
                                                <ArrowRight size={16} />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 bg-white/5 rounded-xl border border-white/5">
                            <p>No active forms or surveys at the moment.</p>
                        </div>
                    )}
                </section>

                {/* Section 4: Secret Store */}
                <section>
                    <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                        <div className="h-8 md:h-10 w-1 bg-neon-pink rounded-full"></div>
                        <h2 className="text-2xl md:text-3xl font-bold font-heading">Secret Store</h2>
                    </div>

                    <div className="relative bg-zinc-900/50 border border-white/5 rounded-2xl p-8 md:p-12 overflow-hidden text-center group">
                        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="mb-4 md:mb-6 p-4 md:p-6 bg-zinc-800 rounded-full border border-white/10 group-hover:border-neon-pink/50 group-hover:shadow-[0_0_30px_rgba(255,0,255,0.3)] transition-all duration-500">
                                <Lock className="w-8 h-8 md:w-12 md:h-12 text-gray-400 group-hover:text-neon-pink transition-colors" />
                            </div>

                            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Coming Soon</h3>
                            <p className="text-gray-400 max-w-lg mx-auto mb-6 md:mb-8 text-sm md:text-base">
                                Exclusive ticket drops, guestlist spots, and flash sales for our community members. Stay tuned!
                            </p>

                            <Button disabled className="bg-zinc-800 text-gray-500 border-zinc-700 cursor-not-allowed uppercase tracking-widest text-[10px] md:text-xs">
                                Access Locked
                            </Button>
                        </div>
                    </div>
                </section>

            </div >
        </div >
    );
};

export default CommunityJoin;
