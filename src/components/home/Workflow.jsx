import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneCall, Calendar, UserCheck, Megaphone, Music, CheckSquare } from 'lucide-react';
import { cn } from '../../lib/utils';

const Workflow = () => {
    const steps = [
        { id: "01", title: "Consult", shortDesc: "Vision & Goals", fullDesc: "Understanding your vision, audience, and requirements. We discuss budget, venue preferences, and event goals.", icon: PhoneCall },
        { id: "02", title: "Plan", shortDesc: "Blueprint & Logistics", fullDesc: "Detailed event blueprint with timelines, vendor selection, and logistics planning for seamless execution.", icon: Calendar },
        { id: "03", title: "Book", shortDesc: "Talent & Venues", fullDesc: "Secure top artists, performers, and venues. Handle all contracts, technical riders, and coordination.", icon: UserCheck },
        { id: "04", title: "Promote", shortDesc: "Marketing & Reach", fullDesc: "Strategic marketing campaigns across social media, partnerships, and targeted outreach to maximize attendance.", icon: Megaphone },
        { id: "05", title: "Execute", shortDesc: "On-Ground Action", fullDesc: "On-ground event management with full technical production, crowd control, and real-time coordination.", icon: Music },
        { id: "06", title: "Deliver", shortDesc: "Success Analysis", fullDesc: "Post-event analysis, attendee feedback, and comprehensive reports to measure success and ROI.", icon: CheckSquare },
    ];

    return (
        <section className="py-20 bg-black relative px-4 text-white">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="font-heading text-4xl md:text-5xl font-bold mb-4 tracking-tight uppercase text-white"
                    >
                        Want us for your <span className="text-neon-green">event?</span>
                    </motion.h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        From initial consultation to post-event success. Our proven process ensures flawless execution.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {steps.map((step, index) => (
                        <WorkflowCard key={index} step={step} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
};

const WorkflowCard = ({ step, index }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, border: '1px solid rgba(255,255,255,0)' }}
            whileInView={{ opacity: 1, border: '1px solid rgba(255,255,255,0.1)' }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setIsHovered(!isHovered)}
            className="bg-black/40 rounded-2xl p-8 relative group hover:bg-white/5 transition-colors duration-300 cursor-pointer min-h-[280px] flex flex-col justify-start"
        >
            <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-white/5 rounded-xl text-white group-hover:text-neon-green transition-colors">
                    <step.icon size={28} />
                </div>
                <span className="text-7xl font-black text-white/5 font-heading group-hover:text-white/10 transition-colors absolute top-4 right-4">{step.id}</span>
            </div>

            <motion.div layout className="relative z-10">
                <h3 layout="position" className="text-xl font-bold font-heading mb-3 group-hover:text-neon-green transition-colors">{step.title}</h3>

                <AnimatePresence mode="wait">
                    {isHovered ? (
                        <motion.p
                            key="full"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-gray-300 text-sm leading-relaxed"
                        >
                            {step.fullDesc}
                        </motion.p>
                    ) : (
                        <motion.p
                            key="short"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-gray-400 text-sm font-medium"
                        >
                            {step.shortDesc} <span className="text-neon-green text-xs ml-1 opacity-60">(More info)</span>
                        </motion.p>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
};

export default Workflow;
