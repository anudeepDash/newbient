import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import logo from '../../assets/logo.png';

const Hero = () => {
    return (
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-green/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-pink/20 rounded-full blur-[100px] animate-pulse delay-1000" />

                {/* Abstract Shapes/Scribbles (Simulated with CSS) */}
                <svg className="absolute top-20 right-20 w-32 h-32 text-neon-green/30 animate-spin-slow" viewBox="0 0 100 100" fill="none">
                    <path d="M50 0 L61 35 L98 35 L68 57 L79 91 L50 70 L21 91 L32 57 L2 35 L39 35 Z" fill="currentColor" />
                </svg>
                <div className="absolute bottom-20 left-20 w-24 h-24 border-4 border-neon-pink/30 rotate-45" />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-8 flex justify-center"
                >
                    <img src={logo} alt="NewBi Entertainment" className="h-32 md:h-48 lg:h-56 w-auto drop-shadow-[0_0_25px_rgba(57,255,20,0.5)]" />
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="font-heading text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6"
                >
                    <span className="text-white">Entertainment. </span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-emerald-400">Events. Energy.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto font-light"
                >
                    A vibrant community-driven platform dedicated to creating <span className="text-white font-medium">unforgettable</span> event experiences.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <a
                        href="/contact"
                        className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-black transition-all duration-200 bg-neon-green font-heading hover:bg-[#2eff0a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neon-green focus:ring-offset-gray-900 rounded-full w-full sm:w-auto"
                    >
                        Work With Us
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        <div className="absolute -inset-3 rounded-full bg-neon-green/30 opacity-0 group-hover:opacity-100 transition-opacity blur-lg" />
                    </a>

                    <a
                        href="/community-join"
                        className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 border-2 border-white/20 hover:border-neon-blue hover:bg-neon-blue/10 font-heading focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neon-blue focus:ring-offset-gray-900 rounded-full w-full sm:w-auto"
                    >
                        Join Us
                        <div className="absolute -inset-3 rounded-full bg-neon-blue/20 opacity-0 group-hover:opacity-100 transition-opacity blur-lg" />
                    </a>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500"
            >
                <span className="text-sm uppercase tracking-widest">Scroll</span>
                <div className="w-[1px] h-12 bg-gradient-to-b from-neon-green to-transparent" />
            </motion.div>
        </section>
    );
};

export default Hero;
