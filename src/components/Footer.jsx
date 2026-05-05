import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Instagram, Linkedin, Twitter, ArrowUp, Mail, MapPin, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const Footer = () => {
    const { siteDetails } = useStore();

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="bg-black pt-24 pb-12 px-6 md:px-12 relative overflow-hidden">
            {/* Background Texture & Light Effects */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            {/* Subtle Ambient Glows */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-neon-blue/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-[1500px] mx-auto relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 mb-20">
                    {/* Brand Column */}
                    <div className="lg:col-span-6 space-y-10">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="flex flex-col"
                        >
                            <span className="text-5xl md:text-7xl font-black font-heading italic tracking-tighter text-white select-none">
                                NEWBI ENT.
                            </span>
                            <div className="mt-8 space-y-2">
                                <p className="text-gray-400 text-base md:text-xl font-medium leading-relaxed tracking-tight max-w-md">
                                    Creating energetic experiences that resonate with the pulse of the youth.
                                </p>
                            </div>
                        </motion.div>

                        <div className="flex items-center gap-6">
                            <a href="https://instagram.com/newbi.ent" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.3em]">INSTAGRAM</a>
                            <a href="https://linkedin.com/company/newbi-ent" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.3em]">LINKEDIN</a>
                            <a href="mailto:hello@newbi.ent" className="text-gray-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.3em]">EMAIL</a>
                        </div>
                    </div>

                    {/* Navigation Columns */}
                    <div className="lg:col-span-6 grid grid-cols-2 gap-12 lg:justify-end relative">
                        <div className="space-y-8 lg:text-right">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Navigation</h4>
                            <nav className="flex flex-col gap-6 text-xs font-black text-white uppercase tracking-[0.2em]">
                                <Link to="/" className="hover:text-neon-green transition-colors">HOME</Link>
                                <Link to="/community" className="hover:text-neon-green transition-colors">COMMUNITY</Link>
                                <Link to="/artistant" className="hover:text-neon-pink transition-colors">ARTISTANT</Link>
                                <Link to="/creator" className="hover:text-neon-green transition-colors">CREATORS</Link>
                                <Link to="/concertzone" className="hover:text-neon-green transition-colors">CONCERT ZONE</Link>
                            </nav>
                        </div>

                        <div className="space-y-8 lg:text-right">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Portal</h4>
                            <nav className="flex flex-col gap-6 text-xs font-black text-white uppercase tracking-[0.2em]">
                                <Link to="/contact" className="hover:text-neon-blue transition-colors">CONTACT</Link>
                                <Link to="/admin" className="hover:text-neon-blue transition-colors">ADMIN</Link>
                            </nav>
                            
                            <div className="pt-10 flex lg:justify-end">
                                <button 
                                    onClick={scrollToTop}
                                    className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all duration-500 group shadow-xl"
                                    title="Back to Top"
                                >
                                    <ArrowUp size={20} className="group-hover:-translate-y-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-700">
                            &copy; {new Date().getFullYear()} NEWBI ENTERTAINMENT. ALL RIGHTS RESERVED.
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <Link to="/terms" className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-colors">TERMS</Link>
                            <Link to="/privacy" className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-colors">PRIVACY</Link>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-800">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                            <span>With ❤️Newbi.Live</span>
                        </div>
                    </div>
                </div>

            </div>
        </footer>
    );
};

export default Footer;
