import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mic2, Megaphone, CalendarCheck, Music, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

const Services = () => {
    const services = [
        {
            title: "On-Ground Management",
            shortDesc: "Complete venue & crowd operations.",
            fullDesc: "From security and crowd management to backstage coordination, production logistics, and housekeeping, we ensure every on-ground detail is handled with precision.",
            icon: Shield,
            className: "md:col-span-1 md:row-span-1"
        },
        {
            title: "Artist Management",
            shortDesc: "Booking & TBL for top talent.",
            fullDesc: "Comprehensive artist management including bookings, Artist TBL (Travel, Boarding, Lodging) management, schedules, and promotion for top-tier talent.",
            icon: Mic2,
            className: "md:col-span-2 md:row-span-1 bg-gradient-to-r from-neon-green/10 to-transparent border-neon-green/20"
        },
        {
            title: "Promotions & Activations",
            shortDesc: "Brand activation & PR campaigns.",
            fullDesc: "Strategic PR campaigns combined with immersive college brand activations. We create engaging content and manage digital platforms to amplify your brand's reach.",
            icon: Megaphone,
            className: "md:col-span-1 md:row-span-1"
        },
        {
            title: "College Fests",
            shortDesc: "Campus event experts.",
            fullDesc: "Specialized planning and execution for large-scale college festivals, bringing the best artists and production quality to campus grounds.",
            icon: Music,
            className: "md:col-span-1 md:row-span-1"
        },
        {
            title: "End to End Management",
            shortDesc: "Concept to execution.",
            fullDesc: "A holistic approach where we handle everything from initial concept and budgeting to vendor management, execution, and post-event analysis.",
            icon: CheckCircle,
            className: "md:col-span-1 md:row-span-1"
        },
    ];

    return (
        <section className="py-20 bg-black relative px-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="font-heading text-4xl md:text-5xl font-bold mb-4"
                    >
                        Our <span className="text-neon-green">Expertise</span>
                    </motion.h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">Building experiences that leave a lasting impact through comprehensive event solutions.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {services.map((service, index) => (
                        <ServiceCard key={index} service={service} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
};

const ServiceCard = ({ service, index }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setIsHovered(!isHovered)}
            className={cn(
                "group glass-card p-6 relative overflow-hidden transition-all duration-300 hover:border-neon-green/50 hover:shadow-[0_0_20px_rgba(57,255,20,0.1)] cursor-pointer min-h-[220px] flex flex-col justify-end",
                service.className
            )}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                <service.icon size={80} />
            </div>

            <motion.div layout className="relative z-10">
                <div className="mb-4 text-neon-green">
                    <service.icon size={32} />
                </div>
                <motion.h3 layout="position" className="text-2xl font-bold font-heading mb-2 text-white group-hover:text-neon-green transition-colors">
                    {service.title}
                </motion.h3>

                <AnimatePresence mode="wait">
                    {isHovered ? (
                        <motion.p
                            key="full"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-gray-300 text-sm leading-relaxed"
                        >
                            {service.fullDesc}
                        </motion.p>
                    ) : (
                        <motion.p
                            key="short"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-gray-400 text-sm"
                        >
                            {service.shortDesc} <span className="text-neon-green text-xs ml-1 opacity-60">(More info)</span>
                        </motion.p>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
};

export default Services;
