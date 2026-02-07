import React from 'react';
import { motion } from 'framer-motion';
import { Construction, Sparkles, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

import { useStore } from '../../lib/store';

const Maintenance = () => {
    const navigate = useNavigate();
    const { user } = useStore();

    const isAdmin = ['developer', 'super_admin', 'editor', 'admin'].includes(user?.role);

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4 relative overflow-hidden">
            {/* ... background decor ... */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="absolute -top-20 -left-20 w-80 h-80 bg-neon-purple rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        rotate: [0, -90, 0],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 12, repeat: Infinity }}
                    className="absolute -bottom-20 -right-20 w-80 h-80 bg-neon-blue rounded-full blur-[100px]"
                />
            </div>

            <Card className="max-w-xl w-full p-8 md:p-12 relative z-10 border-white/10 backdrop-blur-xl bg-black/40 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <div className="flex flex-col items-center text-center space-y-8">
                    {/* Animated Icon */}
                    <motion.div
                        animate={{
                            rotate: [0, -10, 10, -10, 0],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="relative"
                    >
                        <div className="absolute inset-0 bg-neon-pink/20 blur-xl rounded-full" />
                        <div className="p-6 bg-gradient-to-br from-neon-pink to-neon-purple rounded-3xl text-white shadow-lg relative">
                            <Construction size={48} strokeWidth={1.5} />
                        </div>
                        <motion.div
                            animate={{ y: [-5, 5, -5], x: [-5, 5, -5] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute -top-2 -right-2 text-yellow-400"
                        >
                            <AlertTriangle size={24} fill="currentColor" />
                        </motion.div>
                        <motion.div
                            animate={{ scale: [0.8, 1.2, 0.8] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -bottom-2 -left-2 text-neon-blue"
                        >
                            <Sparkles size={24} />
                        </motion.div>
                    </motion.div>

                    {/* Professional Messaging */}
                    <div className="space-y-4">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-500 uppercase"
                        >
                            Under Maintenance
                        </motion.h1>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-2"
                        >
                            <p className="text-xl text-gray-300 font-medium">
                                We are currently performing scheduled maintenance to improve our system.
                            </p>
                            <p className="text-gray-400">
                                We expect to be back online shortly. Thank you for your patience.
                            </p>
                        </motion.div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-wrap justify-center gap-3">
                        <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-gray-400">
                            Status: Updating
                        </span>
                        <span className="px-4 py-1.5 rounded-full bg-neon-green/10 border border-neon-green/30 text-xs font-bold uppercase tracking-widest text-neon-green">
                            System: Secure ✅
                        </span>
                    </div>

                    {/* Back Button */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="w-full pt-4"
                    >
                        <Button
                            variant="outline"
                            onClick={() => navigate(isAdmin ? '/admin' : '/')}
                            className="w-full py-6 group relative overflow-hidden bg-transparent border-white/20 hover:border-white text-white transition-all duration-500"
                        >
                            <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            <span className="relative z-10 flex items-center justify-center gap-2 group-hover:text-black transition-colors">
                                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                                {isAdmin ? 'RETURN TO DASHBOARD' : 'RETURN TO HOME'}
                            </span>
                        </Button>
                    </motion.div>
                </div>
            </Card>
        </div>
    );
};

export default Maintenance;
