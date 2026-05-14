import React, { useRef, useEffect, useState } from 'react';
import { 
    Bold, Italic, List, ListOrdered, Undo2, Redo2, 
    Type, AlignLeft, AlignCenter, AlignRight, 
    Link as LinkIcon, Image as ImageIcon, Sparkles,
    Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEditorHistory } from '../../hooks/useEditorHistory';
import { useStore } from '../../lib/store';

const StudioRichEditor = ({ 
    value, 
    onChange, 
    placeholder = "Start typing...", 
    className,
    label,
    minHeight = "150px",
    accentColor = "neon-blue"
}) => {
    const editorRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    // Sync external value with internal contenteditable only when necessary
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    useEffect(() => {
        // Set default paragraph separator for better contentEditable behavior
        document.execCommand('defaultParagraphSeparator', false, 'p');
    }, []);

    const { undo, redo, canUndo, canRedo, updateValue } = useEditorHistory(value, onChange);

    const execCommand = (command, argument = null) => {
        document.execCommand(command, false, argument);
        if (editorRef.current) {
            updateValue(editorRef.current.innerHTML);
        }
    };

    const handleInput = () => {
        if (editorRef.current) {
            updateValue(editorRef.current.innerHTML);
        }
    };

    const handleKeyDown = (e) => {
        // Handle Tab
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertHTML', false, '&#160;&#160;&#160;&#160;');
        }
        
        // Handle Enter for markdown-style bullets and list continuation
        if (e.key === 'Enter') {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                let container = range.startContainer;
                
                // Find parent LI if it exists
                let li = container;
                while (li && li !== editorRef.current && li.nodeName !== 'LI') {
                    li = li.parentNode;
                }

                if (li && li.nodeName === 'LI') {
                    // Browser usually handles this, but let's ensure it works
                    // If we are at the end of an empty LI, Enter should break out of list
                    if (li.textContent.trim() === '' && li === li.parentNode.lastChild) {
                        // Let browser handle breaking out
                    }
                }
            }
        }

        // Auto-convert '* ' or '- ' to list
        if (e.key === ' ') {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const node = range.startContainer;
                const text = node.textContent || '';
                
                if (range.startOffset === 2 && (text.startsWith('*') || text.startsWith('-'))) {
                    e.preventDefault();
                    // Clear the '* ' text
                    range.setStart(node, 0);
                    range.setEnd(node, 2);
                    range.deleteContents();
                    // Convert to list
                    execCommand('insertUnorderedList');
                }
            }
        }

        // Handle Undo/Redo Shortcuts
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
            }
            if (e.key === 'y') {
                e.preventDefault();
                redo();
            }
        }
    };

    const ToolbarButton = ({ icon: Icon, onClick, active, disabled, title }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "p-2 rounded-lg transition-all duration-200 flex items-center justify-center",
                active 
                    ? `bg-${accentColor}/20 text-${accentColor} shadow-[0_0_10px_rgba(46,191,255,0.2)]` 
                    : "text-gray-500 hover:text-white hover:bg-white/5",
                disabled && "opacity-20 cursor-not-allowed"
            )}
            title={title}
        >
            <Icon size={16} />
        </button>
    );

    return (
        <div className={cn("space-y-2 group", className)}>
            {label && (
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                    {label}
                </label>
            )}
            
            <div className={cn(
                "relative bg-black/40 border transition-all duration-500 rounded-[2rem] overflow-hidden",
                isFocused ? `border-${accentColor}/50 shadow-[0_0_30px_rgba(46,191,255,0.1)]` : "border-white/5"
            )}>
                {/* Toolbar */}
                <div className="flex items-center flex-wrap gap-1 p-3 border-b border-white/5 bg-zinc-900/30 backdrop-blur-xl">
                    <div className="flex items-center gap-1 pr-2 border-r border-white/10">
                        <ToolbarButton icon={Undo2} onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" />
                        <ToolbarButton icon={Redo2} onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" />
                    </div>
                    
                    <div className="flex items-center gap-1 px-2 border-r border-white/10">
                        <ToolbarButton icon={Bold} onClick={() => execCommand('bold')} title="Bold" />
                        <ToolbarButton icon={Italic} onClick={() => execCommand('italic')} title="Italic" />
                    </div>

                    <div className="flex items-center gap-1 px-2 border-r border-white/10">
                        <ToolbarButton icon={List} onClick={() => execCommand('insertUnorderedList')} title="Bullet List" />
                        <ToolbarButton icon={ListOrdered} onClick={() => execCommand('insertOrderedList')} title="Numbered List" />
                    </div>

                    <div className="flex items-center gap-1 px-2 border-r border-white/10">
                        <ToolbarButton icon={AlignLeft} onClick={() => execCommand('justifyLeft')} title="Align Left" />
                        <ToolbarButton icon={AlignCenter} onClick={() => execCommand('justifyCenter')} title="Align Center" />
                        <ToolbarButton icon={AlignRight} onClick={() => execCommand('justifyRight')} title="Align Right" />
                    </div>

                    <div className="flex items-center gap-1 pl-2">
                        <ToolbarButton icon={LinkIcon} onClick={() => {
                            const url = prompt("Enter link URL:");
                            if (url) execCommand('createLink', url);
                        }} title="Insert Link" />
                        <ToolbarButton icon={ImageIcon} onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = async (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    setIsUploading(true);
                                    try {
                                        const url = await useStore.getState().uploadToCloudinary(file);
                                        if (url) {
                                            document.execCommand('insertImage', false, url);
                                            updateValue(editorRef.current.innerHTML);
                                        }
                                    } catch (err) {
                                        console.error("Toolbar upload failed:", err);
                                        useStore.getState().addToast?.("Upload failed.", "error");
                                    } finally {
                                        setIsUploading(false);
                                    }
                                }
                            };
                            input.click();
                        }} title="Upload Image" />
                    </div>

                </div>

                {/* Editor Surface */}
                <div 
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    onPaste={async (e) => {
                        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                        let hasImages = false;
                        
                        for (let i = 0; i < items.length; i++) {
                            const item = items[i];
                            if (item.kind === 'file' && item.type.startsWith('image/')) {
                                hasImages = true;
                                e.preventDefault();
                                const file = item.getAsFile();
                                if (!file) continue;

                                // Save selection
                                const selection = window.getSelection();
                                let savedRange = null;
                                if (selection.rangeCount > 0) {
                                    savedRange = selection.getRangeAt(0).cloneRange();
                                }

                                setIsUploading(true);
                                try {
                                    const url = await useStore.getState().uploadToCloudinary(file);
                                    if (url) {
                                        // Restore selection
                                        if (savedRange) {
                                            selection.removeAllRanges();
                                            selection.addRange(savedRange);
                                        }
                                        // Insert image at cursor
                                        document.execCommand('insertImage', false, url);
                                        updateValue(editorRef.current.innerHTML);
                                    }
                                } catch (err) {
                                    console.error("Paste upload failed:", err);
                                    useStore.getState().addToast?.("Upload failed.", "error");
                                } finally {
                                    setIsUploading(false);
                                }
                            }
                        }
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const files = e.dataTransfer.files;
                        if (files && files.length > 0) {
                            // Find drop position
                            const selection = window.getSelection();
                            let dropRange = null;
                            if (document.caretRangeFromPoint) {
                                dropRange = document.caretRangeFromPoint(e.clientX, e.clientY);
                            } else if (e.rangeParent) {
                                dropRange = document.createRange();
                                dropRange.setStart(e.rangeParent, e.rangeOffset);
                            }

                            for (let i = 0; i < files.length; i++) {
                                const file = files[i];
                                if (file.type.startsWith('image/')) {
                                    setIsUploading(true);
                                    try {
                                        const url = await useStore.getState().uploadToCloudinary(file);
                                        if (url) {
                                            // Restore drop position
                                            if (dropRange) {
                                                selection.removeAllRanges();
                                                selection.addRange(dropRange);
                                            }
                                            document.execCommand('insertImage', false, url);
                                            updateValue(editorRef.current.innerHTML);
                                        }
                                    } catch (err) {
                                        console.error("Drop upload failed:", err);
                                        useStore.getState().addToast?.("Upload failed.", "error");
                                    } finally {
                                        setIsUploading(false);
                                    }
                                }
                            }
                        }
                    }}
                    className={cn(
                        "w-full p-6 text-[11px] font-medium text-white/90 focus:outline-none leading-relaxed article-content prose prose-invert prose-sm max-w-none break-words article-content-force-white",
                        "min-h-[150px]",
                        isUploading && "opacity-50 pointer-events-none"
                    )}
                    style={{ minHeight, wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                />

                {/* Placeholder Overlay */}
                {!value && !isFocused && !isUploading && (
                    <div className="absolute top-[84px] left-6 pointer-events-none text-gray-700 text-[11px] font-medium italic">
                        {placeholder}
                    </div>
                )}

                {/* Uploading Overlay */}
                {isUploading && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
                        <div className="relative">
                            <div className={cn("absolute inset-0 blur-xl opacity-50 rounded-full", `bg-${accentColor}`)} />
                            <Loader2 className={cn("animate-spin relative z-10", `text-${accentColor}`)} size={32} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white animate-pulse">Processing Media...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudioRichEditor;
