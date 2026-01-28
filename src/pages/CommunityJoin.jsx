import React, { useEffect } from 'react';
import { useStore } from '../lib/store';
import FormViewer from './FormViewer';
import { Button } from '../components/ui/Button';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Lock, Share2 } from 'lucide-react';

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

                    <div className="bg-zinc-900 rounded-2xl overflow-hidden shadow-lg border border-white/10">
                        <iframe
                            src="https://docs.google.com/forms/d/e/1FAIpQLScQv55cT-hPBqTtw7PFqOZND6QfPkmjzT8_4Sf4G53_UYwSQg/viewform?embedded=true"
                            width="100%"
                            height="1600"
                            frameBorder="0"
                            marginHeight="0"
                            marginWidth="0"
                            className="w-full bg-transparent"
                            style={{ filter: 'invert(1) hue-rotate(180deg)' }}
                            title="NewBi Tribe Registration"
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

                    {volunteerGigs && volunteerGigs.length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-6">
                            {volunteerGigs.map((gig) => (
                                <div
                                    key={gig.id}
                                    id={`gig-${gig.id}`}
                                    className={`bg-zinc-900/50 border rounded-xl p-6 transition-all group relative ${new URLSearchParams(location.search).get('gig') === gig.id
                                            ? 'border-neon-blue shadow-[0_0_30px_rgba(0,243,255,0.2)]'
                                            : 'border-white/10 hover:border-neon-blue/50'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-2xl font-bold text-white group-hover:text-neon-blue transition-colors pr-8">{gig.title}</h3>
                                        <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${gig.status === 'Open' ? 'bg-neon-green/20 text-neon-green' : 'bg-red-500/20 text-red-500'}`}>
                                            {gig.status}
                                        </span>
                                    </div>

                                    {/* Share Button */}
                                    <button
                                        onClick={() => {
                                            const url = `${window.location.origin}/community-join?gig=${gig.id}`;
                                            navigator.clipboard.writeText(url);
                                            alert('Link copied to clipboard!');
                                        }}
                                        className="absolute top-6 right-16 p-2 text-gray-400 hover:text-white transition-colors"
                                        title="Share Gig"
                                    >
                                        <Share2 size={18} />
                                    </button>

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


                                    {
                                        gig.applyType === 'whatsapp' ? (
                                            <a
                                                href={`https://wa.me/${gig.applyLink || ''}?text=${encodeURIComponent(`Hi, I'd like to apply for the volunteer gig: ${gig.title}`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white border-none transition-all shadow-lg shadow-green-500/20">
                                                    <div className="flex items-center justify-center gap-2">
                                                        Apply via WhatsApp
                                                    </div>
                                                </Button>
                                            </a>
                                        ) : (
                                            <a href={gig.applyLink || "#"} target="_blank" rel="noopener noreferrer">
                                                <Button className="w-full bg-none border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-black transition-all">
                                                    Apply for Gig
                                                </Button>
                                            </a>
                                        )
                                    }
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
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-10 w-1 bg-yellow-400 rounded-full"></div>
                        <h2 className="text-3xl font-bold font-heading">Active Forms & Surveys</h2>
                    </div>

                    {forms && forms.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {forms.map((form) => (
                                <div key={form.id} className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 hover:border-yellow-400/50 transition-colors group flex flex-col justify-between h-full">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">{form.title}</h3>
                                        <p className="text-gray-400 text-sm mb-6 line-clamp-3">{form.description}</p>
                                    </div>
                                    <div className="mt-auto">
                                        <Link to={`/forms/${form.id}`} target="_blank">
                                            <Button className="w-full bg-none border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition-all">
                                                Open Form
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

            </div >
        </div >
    );
};

export default CommunityJoin;
