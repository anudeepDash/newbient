import React, { useState } from 'react';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import Plus from 'lucide-react/dist/esm/icons/plus';
import X from 'lucide-react/dist/esm/icons/x';
import Settings2 from 'lucide-react/dist/esm/icons/settings-2';
import Check from 'lucide-react/dist/esm/icons/check';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import StudioRichEditor from '../ui/StudioRichEditor';
import { Button } from '../ui/Button';

const CompanyProfileManager = ({ onInsert }) => {
    const { siteSettings, updateSiteSettings, addToast } = useStore();
    const [isEditing, setIsEditing] = useState(false);
    const [tempContent, setTempContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleOpenEdit = () => {
        setTempContent(siteSettings?.companyProfile || '');
        setIsEditing(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateSiteSettings({ companyProfile: tempContent });
            addToast('Company profile saved successfully', 'success');
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save company profile:", error);
            addToast('Failed to save company profile', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleInsert = () => {
        if (!siteSettings?.companyProfile) {
            addToast('Company profile is empty. Please edit the template first.', 'error');
            return;
        }
        if (onInsert) {
            onInsert(siteSettings.companyProfile);
            addToast('Company profile inserted', 'success');
        }
    };

    return (
        <>
            <div className="flex items-center gap-2 mb-4 p-3 bg-white/5 border border-white/10 rounded-xl w-full">
                <Building2 size={16} className="text-neon-blue shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Company Profile</p>
                    <p className="text-[8px] font-medium text-gray-500 uppercase tracking-widest truncate">Global Template</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleOpenEdit}
                        className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
                        title="Edit Company Profile Template"
                    >
                        <Settings2 size={14} />
                    </button>
                    <button
                        onClick={handleInsert}
                        className="px-3 py-1.5 bg-neon-blue/10 text-neon-blue border border-neon-blue/20 hover:bg-neon-blue hover:text-black font-black text-[9px] uppercase tracking-widest rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        <Plus size={12} /> INSERT
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8"
                    >
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isSaving && setIsEditing(false)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-sm" 
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-neon-blue/10 border border-neon-blue/20 rounded-xl text-neon-blue">
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Edit Company Profile</h3>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Update the global company profile template</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => !isSaving && setIsEditing(false)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                <StudioRichEditor 
                                    value={tempContent}
                                    onChange={setTempContent}
                                    placeholder="Write your company profile here..."
                                    minHeight="400px"
                                    accentColor="neon-blue"
                                />
                            </div>

                            <div className="p-6 border-t border-white/5 shrink-0 flex justify-end gap-3">
                                <Button
                                    onClick={() => !isSaving && setIsEditing(false)}
                                    className="bg-transparent border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/5"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-neon-blue text-black font-black text-[10px] uppercase tracking-widest hover:bg-neon-blue/80 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSaving ? 'Saving...' : <><Check size={14} /> Save Template</>}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default CompanyProfileManager;
