import React from 'react';
import { motion } from 'framer-motion';
import { Linkedin, Mail } from 'lucide-react';

const Team = () => {
    const team = [
        { name: "Avinav", role: "Co-Founder", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Avinav&backgroundColor=b6e3f4" },
        { name: "Arya", role: "Co-Founder", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arya&backgroundColor=c0aede" },
        { name: "Naman", role: "Co-Founder", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Naman&backgroundColor=ffdfbf" },
    ];

    return (
        <section className="py-20 bg-dark relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="font-heading text-4xl md:text-5xl font-bold mb-16"
                >
                    Meet The <span className="text-neon-green">Team</span>
                </motion.h2>

                <div className="flex flex-wrap justify-center gap-10">
                    {team.map((member, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.2 }}
                            className="group relative w-72"
                        >
                            <div className="absolute inset-0 bg-neon-green/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm hover:-translate-y-2 transition-transform duration-300">
                                <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-2 border-neon-green/30 group-hover:border-neon-green transition-colors">
                                    <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                                </div>

                                <h3 className="text-2xl font-heading font-bold text-white mb-1">{member.name}</h3>
                                <p className="text-neon-green font-medium mb-4">{member.role}</p>

                                <div className="flex justify-center space-x-4">
                                    <button className="text-gray-400 hover:text-neon-green transition-colors">
                                        <Linkedin size={20} />
                                    </button>
                                    <button className="text-gray-400 hover:text-neon-green transition-colors">
                                        <Mail size={20} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Team;
