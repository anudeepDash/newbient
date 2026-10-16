import React, { useEffect, useState } from 'react';
import Type from 'lucide-react/dist/esm/icons/type';
import PenTool from 'lucide-react/dist/esm/icons/pen-tool';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import SignaturePad from './SignaturePad';
import Sheet from '../admin/Sheet';
import { cn } from '../../lib/utils';

/*
 * Signature capture (type, draw or upload). Used in the admin builders and on
 * the public proposal/contract signing pages. onSave(imageDataUrl, name).
 */
const TABS = [
    { id: 'type', label: 'Type', icon: Type },
    { id: 'draw', label: 'Draw', icon: PenTool },
    { id: 'upload', label: 'Upload', icon: Upload },
];

const SignatureModal = ({ isOpen, onClose, onSave, initialName = '' }) => {
    const [activeTab, setActiveTab] = useState('type');
    const [typedName, setTypedName] = useState(initialName);
    const [uploadedImage, setUploadedImage] = useState(null);
    const [drawnSignature, setDrawnSignature] = useState(null);
    const [uploadError, setUploadError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTypedName(initialName || '');
            setUploadError('');
        }
    }, [isOpen, initialName]);

    const ready = typedName.trim() && (activeTab === 'type' || (activeTab === 'draw' && drawnSignature) || (activeTab === 'upload' && uploadedImage));

    const handleSave = () => {
        if (!ready) return;
        if (activeTab === 'type') {
            // Render the typed name as a signature image.
            const canvas = document.createElement('canvas');
            canvas.width = 600;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'black';
            ctx.font = 'italic 60px "Caveat", "Brush Script MT", cursive';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(typedName.trim(), canvas.width / 2, canvas.height / 2, canvas.width - 40);
            onSave(canvas.toDataURL('image/png'), typedName.trim());
        } else if (activeTab === 'draw') {
            onSave(drawnSignature, typedName.trim());
        } else {
            onSave(uploadedImage, typedName.trim());
        }
        onClose();
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) { setUploadError('Choose an image file (PNG or JPG).'); return; }
        if (file.size > 5 * 1024 * 1024) { setUploadError('That image is over 5 MB.'); return; }
        setUploadError('');
        const reader = new FileReader();
        reader.onload = (re) => setUploadedImage(re.target.result);
        reader.readAsDataURL(file);
    };

    return (
        <Sheet
            open={isOpen}
            onClose={onClose}
            variant="dialog"
            size="lg"
            zIndex={1000}
            title="Your signature"
            subtitle="Type, draw or upload it. It's added to the document with your name."
            footer={(
                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="h-12 rounded-xl px-5 text-[14px] font-semibold text-gray-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5">Cancel</button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!ready}
                        className="h-12 flex-1 rounded-xl bg-neon-green text-[14px] font-semibold text-black transition-opacity disabled:opacity-40"
                    >
                        Use this signature
                    </button>
                </div>
            )}
            bodyClassName="space-y-4"
        >
            <label className="block">
                <span className="mb-1 block text-[12px] font-bold text-gray-500">Full name</span>
                <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    autoComplete="name"
                    className="h-12 w-full rounded-xl border border-black/10 bg-white px-3.5 text-[16px] font-semibold text-gray-900 outline-none focus:border-emerald-500/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                    placeholder="As it should appear on the document"
                />
            </label>

            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-black/[0.04] p-1 dark:bg-white/[0.05]" role="tablist">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn('flex h-10 items-center justify-center gap-2 rounded-xl text-[13px] font-semibold transition-colors',
                            activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm dark:bg-white/[0.12] dark:text-white' : 'text-gray-500')}
                    >
                        <tab.icon size={15} /> {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'type' && (
                <div className="flex h-40 items-center justify-center rounded-2xl border border-black/10 bg-white p-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
                    {typedName.trim() ? (
                        <span className="select-none font-serif text-4xl italic text-gray-900 dark:text-white sm:text-5xl">{typedName}</span>
                    ) : (
                        <span className="text-[14px] text-gray-500">Type your name above to see it here</span>
                    )}
                </div>
            )}

            {activeTab === 'draw' && <SignaturePad onSave={(data) => setDrawnSignature(data)} />}

            {activeTab === 'upload' && (
                <div className="space-y-2">
                    {uploadedImage ? (
                        <div className="relative flex h-40 items-center justify-center rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <img src={uploadedImage} alt="Uploaded signature" className="max-h-full max-w-full object-contain dark:invert" />
                            <button type="button" onClick={() => setUploadedImage(null)} aria-label="Remove image" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ) : (
                        <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/10 p-6 text-center hover:border-black/25 dark:border-white/10 dark:hover:border-white/25">
                            <Upload size={24} className="text-gray-400" />
                            <span className="text-[14px] font-semibold">Upload a signature image</span>
                            <span className="text-[12px] text-gray-500">PNG or JPG, ideally on a plain background</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        </label>
                    )}
                    {uploadError && <p className="text-[13px] font-semibold text-red-600">{uploadError}</p>}
                </div>
            )}
        </Sheet>
    );
};

export default SignatureModal;
