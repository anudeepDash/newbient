import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Image as ImageIcon, Camera } from 'lucide-react';
import { useStore } from '../lib/store';

const MediaGallery = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const { galleryImages: mediaItems } = useStore();

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-32 pb-32 px-4 relative overflow-hidden">
            {/* Background Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-neon-pink/5 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[20%] left-[-5%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto">

                {/* Header Container */}
                <div className="flex flex-col items-center text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
                    >
                        <ImageIcon size={16} className="text-neon-pink" />
                        <span className="text-xs font-heading font-bold uppercase tracking-widest text-gray-300">
                            Visual Stories
                        </span>
                    </motion.div>
 
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-8xl font-black font-heading text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-white to-neon-blue mb-6 tracking-tight leading-none text-center"
                    >
                        MEDIA GALLERY
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-gray-400 max-w-2xl mx-auto text-base md:text-xl font-medium leading-relaxed"
                    >
                        Visual stories, moments, and backstage energy captured by the Newbi team.
                    </motion.p>
                </div>

                {/* Gallery Container */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-4 md:p-8 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-80 h-80 bg-neon-blue/5 blur-[100px] -mr-40 -mt-40 pointer-events-none" />

                    {mediaItems && mediaItems.length > 0 ? (
                        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4 relative z-10">
                            {mediaItems.map((item, index) => (
                                <motion.div
                                    key={item.id || index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.06 }}
                                    className="break-inside-avoid"
                                >
                                    <div
                                        className="relative group rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-white/10 transition-all"
                                        onClick={() => setSelectedImage(item)}
                                    >
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 z-10" />
                                        <img
                                            src={item.src}
                                            alt={item.title}
                                            className="w-full h-auto transform group-hover:scale-105 transition-transform duration-500"
                                        />

                                        {/* Overlay Content */}
                                        <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <span className="text-neon-green text-[10px] font-black uppercase tracking-wider mb-1">
                                                {item.category}
                                            </span>
                                            <h3 className="text-white font-black text-sm truncate uppercase">{item.title}</h3>
                                            {item.type === 'video' && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                        <Play className="w-6 h-6 text-white fill-current" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="relative z-10 py-20 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                <ImageIcon size={36} className="text-gray-600" />
                            </div>
                            <h3 className="text-xl font-black font-heading uppercase tracking-tighter text-white mb-2">No Media Yet</h3>
                            <p className="text-gray-500 text-sm font-medium max-w-xs">
                                The gallery is being curated. Check back soon for exclusive content.
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
                        onClick={() => setSelectedImage(null)}
                    >
                        <button
                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all z-10"
                            onClick={() => setSelectedImage(null)}
                        >
                            <X size={18} />
                        </button>

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-5xl w-full max-h-[85vh] rounded-[2rem] overflow-hidden border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={selectedImage.src}
                                alt={selectedImage.title}
                                className="w-full h-full object-contain"
                            />
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
                                <h3 className="text-xl font-black text-white tracking-tight uppercase">{selectedImage.title}</h3>
                                <p className="text-neon-green text-[10px] font-black uppercase tracking-widest mt-1">{selectedImage.category}</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MediaGallery;
