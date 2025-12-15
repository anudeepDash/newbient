import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Users, Award } from 'lucide-react';

const WhyChooseUs = () => {
    const reasons = [
        {
            title: "Speed",
            subtitle: "Rapid Event Execution",
            desc: "We handle everything from concept to execution in record time. Our experienced team ensures seamless coordination for events of any scale.",
            icon: Zap,
        },
        {
            title: "Network",
            subtitle: "50+ Artist Roster",
            desc: "Access to India's top performers, comedians, and musicians. Our extensive network ensures you get the perfect talent for your event.",
            icon: Users,
        },
        {
            title: "Excellence",
            subtitle: "Premium Production Quality",
            desc: "State-of-the-art sound, lighting, and stage production. We deliver professional-grade events that create lasting memories for your audience.",
            icon: Award,
        },
    ];

    return (
        <section className="py-20 bg-black relative px-4">
            {/* Background elements (subtle lines/glows from image) */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="font-heading text-4xl md:text-5xl font-bold mb-4 text-white"
                    >
                        Why Choose Us
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {reasons.map((reason, index) => (
                        <Card key={index} reason={reason} index={index} />
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
            transition={{ duration: 0.5, delay: index * 0.2 }}
            className="bg-black border border-white/5 rounded-2xl p-8 hover:border-gray-700 transition-colors group relative overflow-hidden"
        >
            <div className="w-16 h-16 bg-[#0B2406] rounded-2xl flex items-center justify-center mb-6 text-neon-green group-hover:scale-110 transition-transform duration-300">
                <reason.icon size={32} />
            </div>

            <h3 className="text-2xl font-bold font-heading text-white mb-2">{reason.title}</h3>
            <h4 className="text-lg font-medium text-gray-400 mb-4">{reason.subtitle}</h4>

            <p className="text-gray-400 leading-relaxed text-sm mb-6">
                {reason.desc}
            </p>



            {/* Glow effect on hover */}
            <div className="absolute -inset-px border border-transparent group-hover:border-neon-green/20 rounded-2xl transition-all duration-500 pointer-events-none" />
        </motion.div>
    );
};

export default WhyChooseUs;
