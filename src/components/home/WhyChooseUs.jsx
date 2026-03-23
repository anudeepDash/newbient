import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Megaphone, Calendar, ArrowUpRight } from 'lucide-react';

const WhyChooseUs = () => {
    const carouselRef = useRef(null);
    const [isAutoScrolling, setIsAutoScrolling] = useState(true);

    const reasons = [
        {
            title: "CAMPUS MARKETING",
            subtitle: "DOMINATING COLLEGIATE SPACES",
            desc: "Our USP lies in our deep root network across 100+ colleges in India. We turn campus grounds into brand activation hubs that resonate with GenZ.",
            icon: Megaphone,
            gradient: "from-neon-green to-emerald-500",
            shadow: "shadow-neon-green/20"
        },
        {
            title: "PROMOTIONS",
            subtitle: "HIGH-OCTANE HYPE",
            desc: "From influencer network takeovers to secret local drops, our promotional engine is built to generate maximum noise and conversion in record time.",
            icon: Zap,
            gradient: "from-neon-pink to-purple-500",
            shadow: "shadow-neon-pink/20"
        },
        {
            title: "EVENTS",
            subtitle: "UNMATCHED ENERGY",
            desc: "State-of-the-art production meets community spirit. We deliver high-fidelity, professional-grade events that transform into lasting memories.",
            icon: Calendar,
            gradient: "from-neon-blue to-cyan-500",
            shadow: "shadow-neon-blue/20"
        },
    ];

    useEffect(() => {
        if (!isAutoScrolling) return;
        const interval = setInterval(() => {
            if (carouselRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
                if (scrollLeft + clientWidth >= scrollWidth - 10) {
                    carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    carouselRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                }
            }
        }, 1500);
        return () => clearInterval(interval);
    }, [isAutoScrolling]);

    return (
        <section className="py-16 md:py-32 bg-[#020202] relative px-4 overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-64 h-64 bg-neon-green/5 blur-[100px] rounded-full" />
            <div className="absolute -right-20 bottom-0 w-96 h-96 bg-neon-blue/5 blur-[120px] rounded-full" />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6"
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest text-neon-green">The Newbi Advantage</span>
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="font-heading text-4xl md:text-6xl font-black mb-6 text-white tracking-tight"
                    >
                        Why Partner <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-blue">With Us?</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-gray-500 max-w-2xl mx-auto text-lg font-medium"
                    >
                        We merge creative chaos with corporate precision to deliver results that don't just meet expectations—they shatter them.
                    </motion.p>
                </div>

                <div 
                    ref={carouselRef}
                    className="flex md:grid md:grid-cols-3 gap-6 md:gap-8 overflow-x-auto md:overflow-visible pb-8 md:pb-0 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0"
                    onMouseEnter={() => setIsAutoScrolling(false)}
                    onMouseLeave={() => setIsAutoScrolling(true)}
                    onTouchStart={() => setIsAutoScrolling(false)}
                >
                    {reasons.map((reason, index) => (
                        <div key={index} className="min-w-[85vw] md:min-w-0 snap-center">
                            <Card reason={reason} index={index} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const Card = ({ reason, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.15 }}
            className="group relative"
        >
            <div className={`absolute -inset-px rounded-[2rem] bg-gradient-to-b ${reason.gradient} opacity-0 md:group-hover:opacity-10 transition-opacity duration-500 blur-xl`} />
            
            <div className="relative bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-10 h-full flex flex-col transition-all duration-500 md:group-hover:border-white/10 md:group-hover:-translate-y-2">
                <div className={`w-16 h-16 bg-gradient-to-br ${reason.gradient} rounded-2xl flex items-center justify-center mb-8 shadow-2xl ${reason.shadow} md:group-hover:scale-110 transition-transform duration-500`}>
                    <reason.icon size={32} className="text-black" />
                </div>

                <div className="flex-1">
                    <h3 className="text-2xl font-black font-heading text-white mb-2 tracking-tight uppercase">{reason.title}</h3>
                    <h4 className={`text-sm font-black uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${reason.gradient} mb-6`}>{reason.subtitle}</h4>
                    <p className="text-gray-400 font-medium leading-relaxed mb-8">
                        {reason.desc}
                    </p>
                </div>

                <button 
                    onClick={() => document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })}
                    className="pt-8 border-t border-white/5 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors w-full"
                >
                    <span>LEARN MORE</span>
                    <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
            </div>
        </motion.div>
    );
};

export default WhyChooseUs;
