import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Instagram } from 'lucide-react';
import { Button } from '../components/ui/Button';

const ConcertZone = () => {
    return (
        <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-black z-0" />
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-black z-0 pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl md:text-7xl font-bold font-heading mb-8 text-white"
                >
                    CONCERT <span className="text-neon-pink text-glow-pink">ZONE</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl text-gray-300 max-w-2xl mb-12"
                >
                    Experience the energy. Relive the moments. Join the movement.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col sm:flex-row gap-6"
                >
                    <a href="https://concert.zone" target="_blank" rel="noopener noreferrer">
                        <Button variant="primary" className="text-lg px-8 py-4 bg-neon-pink hover:bg-neon-pink/80 border-neon-pink text-white rounded-full">
                            Visit Concert.zone <ExternalLink className="ml-2 h-5 w-5" />
                        </Button>
                    </a>
                </motion.div>

                {/* Instagram Embed Placeholder */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-20 w-full max-w-4xl"
                >
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                        <div className="flex items-center justify-center mb-6 text-neon-pink">
                            <Instagram size={40} className="mr-3" />
                            <h3 className="text-2xl font-bold">Latest Vibes</h3>
                        </div>
                        <div className="aspect-video w-full rounded-lg bg-black/50 flex items-center justify-center border border-white/5">
                            <p className="text-gray-400">
                                <span className="block text-center mb-4">Instagram Feed Loading...</span>
                                <a href="https://instagram.com/concert.zone" target="_blank" rel="noopener noreferrer" className="text-neon-pink hover:underline">
                                    View on Instagram
                                </a>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ConcertZone;
