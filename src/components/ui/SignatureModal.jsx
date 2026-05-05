import React, { useState, useRef, useEffect } from 'react';
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
        if (activeTab === 'type') {
            if (!typedName.trim()) return;
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
            onSave(drawnSignature, initialName);
        } else if (activeTab === 'upload') {
            if (!uploadedImage) return;
            onSave(uploadedImage, initialName);
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

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Digital Signature.</h3>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Select your preferred signing method</p>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-white/5">
                        {[
                            { id: 'type', label: 'Type', icon: Type },
                            { id: 'draw', label: 'Draw', icon: PenTool },
                            { id: 'upload', label: 'Upload', icon: Upload }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex-1 py-6 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative",
                                    activeTab === tab.id ? "text-neon-green" : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                {activeTab === tab.id && (
                                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-neon-green" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-10 min-h-[300px] flex flex-col justify-center">
                        {activeTab === 'type' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-4 text-center">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Type your full name</p>
                                    <input
                                        type="text"
                                        value={typedName}
                                        onChange={(e) => setTypedName(e.target.value)}
                                        className="w-full bg-transparent border-b-2 border-white/10 h-20 text-center text-4xl sm:text-6xl font-signature text-white outline-none focus:border-neon-green/40 transition-all placeholder:text-white/5"
                                        placeholder="John Doe"
                                        autoFocus
                                    />
                                </div>
                                <p className="text-center text-[10px] text-gray-500 italic">This will generate a secure digital signature in script font.</p>
                            </div>
                        )}

                        {activeTab === 'draw' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <SignaturePad onSave={(sig) => setDrawnSignature(sig)} onClear={() => setDrawnSignature(null)} />
                                <p className="text-center text-[10px] text-gray-500 italic mt-6">Use your mouse or touch screen to draw your signature.</p>
                            </div>
                        )}

                        {activeTab === 'upload' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {uploadedImage ? (
                                    <div className="relative group aspect-video bg-white rounded-2xl flex items-center justify-center p-8 overflow-hidden">
                                        <img src={uploadedImage} alt="Uploaded Signature" className="max-h-full object-contain" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                                            <button onClick={() => setUploadedImage(null)} className="p-4 bg-red-500 text-white rounded-full hover:scale-110 transition-all">
                                                <Trash2 size={24} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => document.getElementById('sig-upload').click()}
                                        className="aspect-video border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/[0.02] hover:border-neon-green/20 transition-all group"
                                    >
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-all">
                                            <Upload size={24} className="text-gray-400 group-hover:text-neon-green" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-white uppercase tracking-widest">Upload Signature Image</p>
                                            <p className="text-[9px] text-gray-500 mt-1">PNG, JPG or SVG with clear background</p>
                                        </div>
                                        <input id="sig-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-white/5 flex gap-4">
                        <button 
                            onClick={onClose}
                            className="flex-1 h-16 bg-white/5 text-gray-400 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/10 transition-all"
                        >
                            Cancel
                        </button>
                        <Button 
                            onClick={handleSave}
                            disabled={(activeTab === 'type' && !typedName.trim()) || (activeTab === 'draw' && !drawnSignature) || (activeTab === 'upload' && !uploadedImage)}
                            className="flex-[2] h-16 bg-neon-green text-black font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-[0_10px_30px_rgba(57,255,20,0.2)] disabled:opacity-30"
                        >
                            Confirm Signature
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SignatureModal;
