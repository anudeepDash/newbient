import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Type, PenTool, Upload, Trash2, Check, RefreshCw } from 'lucide-react';
import SignaturePad from './SignaturePad';
import { cn } from '../../lib/utils';
import { Button } from './Button';

const SignatureModal = ({ isOpen, onClose, onSave, initialName = '' }) => {
    const [activeTab, setActiveTab] = useState('type');
    const [typedName, setTypedName] = useState(initialName);
    const [uploadedImage, setUploadedImage] = useState(null);
    const [drawnSignature, setDrawnSignature] = useState(null);
    const typedRef = useRef(null);

    const handleSave = () => {
        if (!typedName.trim()) return;

        if (activeTab === 'type') {
            // Convert typed text to image (simple canvas approach)
            const canvas = document.createElement('canvas');
            canvas.width = 600;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'black';
            ctx.font = 'italic 60px "Caveat", cursive';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
            onSave(canvas.toDataURL('image/png'), typedName);
        } else if (activeTab === 'draw') {
            if (!drawnSignature) return;
            onSave(drawnSignature, typedName);
        } else if (activeTab === 'upload') {
            if (!uploadedImage) return;
            onSave(uploadedImage, typedName);
        }
        onClose();
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (re) => setUploadedImage(re.target.result);
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-2xl bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
                >
                    <div className="overflow-y-auto flex-1 flex flex-col">
                        {/* Header */}
                        <div className="p-6 sm:p-8 border-b border-black/10 dark:border-white/5 flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Digital Signature.</h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Authorize and execute this instrument</p>
                            </div>
                            <button onClick={onClose} className="p-2 sm:p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all">
                                <X size={20} className="sm:w-6 sm:h-6" />
                            </button>
                        </div>

                        {/* Name Input - Always Visible */}
                        <div className="px-6 sm:px-10 pt-4 sm:pt-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neon-green uppercase tracking-[0.3em] pl-1">Signatory Full Name</label>
                                <input
                                    type="text"
                                    value={typedName}
                                    onChange={(e) => setTypedName(e.target.value)}
                                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 h-12 sm:h-14 rounded-xl px-4 sm:px-6 text-lg sm:text-xl font-bold text-gray-900 dark:text-white outline-none focus:border-neon-green/40 transition-all placeholder:text-gray-400 dark:placeholder:text-white/10"
                                    placeholder="Legal name for record..."
                                />
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-black/10 dark:border-white/5 mt-2 sm:mt-4">
                            {[
                                { id: 'type', label: 'Type', icon: Type },
                                { id: 'draw', label: 'Draw', icon: PenTool },
                                { id: 'upload', label: 'Upload', icon: Upload }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex-1 py-4 sm:py-6 flex items-center justify-center gap-2 sm:gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative",
                                        activeTab === tab.id ? "text-neon-green" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    )}
                                >
                                    <tab.icon size={14} className="sm:w-4 sm:h-4" />
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-neon-green" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-6 sm:p-10 min-h-[180px] sm:min-h-[250px] flex flex-col justify-center flex-1">
                            {/* Signature Area */}
                            {activeTab === 'type' && (
                                <div className="h-40 sm:h-48 rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center justify-center p-6 text-center">
                                    {typedName ? (
                                        <span className="font-serif italic text-3xl sm:text-5xl text-gray-900 dark:text-white select-none">{typedName}</span>
                                    ) : (
                                        <span className="text-gray-500 italic text-sm">Enter your name above to see signature preview</span>
                                    )}
                                </div>
                            )}

                            {activeTab === 'draw' && (
                                <div className="space-y-2">
                                    <SignaturePad onSave={(data) => setDrawnSignature(data)} />
                                </div>
                            )}

                            {activeTab === 'upload' && (
                                <div className="space-y-4">
                                    {uploadedImage ? (
                                        <div className="relative h-40 sm:h-48 rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center justify-center p-4">
                                            <img src={uploadedImage} alt="Uploaded Signature" className="max-h-full max-w-full object-contain filter dark:invert" />
                                            <button 
                                                onClick={() => setUploadedImage(null)}
                                                className="absolute top-3 right-3 p-2 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500/30 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div 
                                            onClick={() => document.getElementById('sig-upload').click()}
                                            className="h-40 sm:h-48 rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 hover:border-neon-purple/50 bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all group"
                                        >
                                            <Upload size={32} className="text-gray-400 group-hover:text-neon-purple transition-all mb-2" />
                                            <p className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Click to upload signature image</p>
                                            <p className="text-[9px] text-gray-500 mt-1">PNG, JPG or SVG with clear background</p>
                                        </div>
                                    )}
                                    <input id="sig-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="p-6 sm:p-8 border-t border-black/10 dark:border-white/5 flex gap-3 sm:gap-4 bg-gray-50 dark:bg-[#0a0a0a]">
                        <button 
                            onClick={onClose}
                            className="flex-1 h-12 sm:h-16 bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                        >
                            Cancel
                        </button>
                        <Button 
                            onClick={handleSave}
                            disabled={!typedName.trim() || (activeTab === 'draw' && !drawnSignature) || (activeTab === 'upload' && !uploadedImage)}
                            className="flex-[2] h-12 sm:h-16 bg-neon-green text-black font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-[0_10px_30px_rgba(57,255,20,0.2)] disabled:opacity-30"
                        >
                            Confirm Signature
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};

export default SignatureModal;
