import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';

const Footer = () => {
    const { siteDetails } = useStore();

    return (
        <footer className="bg-dark border-t border-white/10 py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <Link to="/" className="inline-block group">
                            <h2 className="text-3xl md:text-4xl font-heading font-black tracking-tighter text-white group-hover:text-neon-green transition-colors uppercase">
                                NewBi <span className="text-stroke-1 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Entertainment</span>
                            </h2>
                        </Link>
                        <p className="text-gray-400 text-sm mt-2 max-w-md">Creating energetic experiences that resonate with the pulse of the youth.</p>
                    </div>

                    <div className="flex flex-col items-center md:items-end space-y-4">
                        <div className="flex items-center space-x-6 text-sm font-medium text-gray-300">
                            <Link to="/contact" className="hover:text-neon-green transition-colors hover:underline decoration-neon-green underline-offset-4">Contact</Link>
                            <span className="text-gray-600">|</span>
                            <a href={siteDetails?.instagram || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors">Instagram</a>
                            <a href={siteDetails?.linkedin || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors">LinkedIn</a>
                            <span className="text-gray-600">|</span>
                            <Link to="/admin" className="text-gray-600 hover:text-white transition-colors text-xs">Admin</Link>
                        </div>
                        <div className="text-xs text-gray-500">
                            &copy; {new Date().getFullYear()} NewBi Entertainment. All rights reserved.
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
