import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';

const Footer = () => {
    const { siteDetails } = useStore();

    return (
        <footer className="bg-[#020202] border-t border-white/5 py-12 md:py-8 mt-auto px-6 overflow-hidden relative">
            {/* Subtle Footer Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-12 md:gap-8">
                    <div className="text-center md:text-left space-y-4">
                        <Link to="/" className="inline-block group">
                            <h2 className="text-4xl md:text-4xl font-heading font-black tracking-tighter text-white group-hover:text-neon-green transition-colors uppercase italic">
                                NewBi <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">ENT.</span>
                            </h2>
                        </Link>
                        <p className="text-gray-500 text-sm max-w-xs mx-auto md:mx-0 font-medium leading-relaxed">
                            Creating energetic experiences that resonate with the pulse of the youth.
                        </p>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-6">
                        <div className="flex flex-wrap justify-center items-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
                            <a href={siteDetails?.instagram || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-neon-pink transition-colors">Instagram</a>
                            <a href={siteDetails?.linkedin || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-neon-blue transition-colors">LinkedIn</a>
                            <Link to="/admin" className="hover:text-white transition-colors">Admin</Link>
                        </div>
                        <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest text-center md:text-right">
                            &copy; {new Date().getFullYear()} NewBi Entertainment. <br className="md:hidden" /> All rights reserved.
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
