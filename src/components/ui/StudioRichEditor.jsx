import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
    Bold, Italic, List, ListOrdered, Undo2, Redo2, 
    Type, AlignLeft, AlignCenter, AlignRight, 
    Link as LinkIcon, Image as ImageIcon, Sparkles,
    Loader2, Heading1, Heading2, Table, Split
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
    const fileInputRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showTableSelector, setShowTableSelector] = useState(false);
    const [hoveredGrid, setHoveredGrid] = useState({ rows: 0, cols: 0 });

    // States for image resizing and styling
    const [selectedImage, setSelectedImage] = useState(null);
    const [imageTooltipPos, setImageTooltipPos] = useState({ top: 0, left: 0 });

    // States for editor active formatting status
    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        list: false,
        orderedList: false,
        alignLeft: true,
        alignCenter: false,
        alignRight: false,
        blockType: 'p'
    });
    const [showStyleDropdown, setShowStyleDropdown] = useState(false);

    const updateActiveFormats = () => {
        if (!editorRef.current) return;
        
        try {
            const bold = document.queryCommandState('bold');
            const italic = document.queryCommandState('italic');
            const list = document.queryCommandState('insertUnorderedList');
            const orderedList = document.queryCommandState('insertOrderedList');
            
            const alignLeft = document.queryCommandState('justifyLeft');
            const alignCenter = document.queryCommandState('justifyCenter');
            const alignRight = document.queryCommandState('justifyRight');
            
            let blockType = 'p';
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                let parent = selection.getRangeAt(0).startContainer.parentNode;
                while (parent && parent !== editorRef.current) {
                    if (parent.tagName) {
                        const tagName = parent.tagName.toLowerCase();
                        if (tagName === 'h1' || tagName === 'h2') {
                            blockType = tagName;
                            break;
                        }
                    }
                    parent = parent.parentNode;
                }
            }

            setActiveFormats({
                bold,
                italic,
                list,
                orderedList,
                alignLeft: alignLeft || (!alignCenter && !alignRight),
                alignCenter,
                alignRight,
                blockType
            });
        } catch (e) {
            // Ignore error if selection is out of focus
        }
    };

    // Listen for selection changes inside the document to update formats in real time
    useEffect(() => {
        const handleSelectionChange = () => {
            if (document.activeElement === editorRef.current) {
                updateActiveFormats();
            }
        };
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    // Dismiss Style Dropdown on click outside
    useEffect(() => {
        if (!showStyleDropdown) return;
        const handleStyleOutsideClick = (e) => {
            if (!e.target.closest('.style-dropdown-container')) {
                setShowStyleDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleStyleOutsideClick);
        return () => document.removeEventListener('mousedown', handleStyleOutsideClick);
    }, [showStyleDropdown]);

    // Dismiss Table Selector on click outside
    useEffect(() => {
        if (!showTableSelector) return;
        const handleTableOutsideClick = (e) => {
            if (!e.target.closest('.table-selector-container')) {
                setShowTableSelector(false);
            }
        };
        document.addEventListener('mousedown', handleTableOutsideClick);
        return () => document.removeEventListener('mousedown', handleTableOutsideClick);
    }, [showTableSelector]);

    const handleEditorClick = (e) => {
        if (e.target.tagName === 'IMG') {
            if (selectedImage && selectedImage !== e.target) {
                selectedImage.removeAttribute('data-selected');
            }
            e.target.setAttribute('data-selected', 'true');
            setSelectedImage(e.target);
        } else {
            if (selectedImage) {
                selectedImage.removeAttribute('data-selected');
            }
            setSelectedImage(null);
        }
    };

    useEffect(() => {
        if (selectedImage && editorRef.current) {
            const updateTooltipPosition = () => {
                if (!selectedImage) return;
                const imgRect = selectedImage.getBoundingClientRect();
                const containerRect = editorRef.current.parentNode.getBoundingClientRect();
                
                // Position tooltip at top-center of the image
                const top = imgRect.top - containerRect.top - 50; // 50px above the image
                const left = imgRect.left - containerRect.left + (imgRect.width / 2);
                
                setImageTooltipPos({ top, left });
            };

            updateTooltipPosition();
            
            window.addEventListener('resize', updateTooltipPosition);
            return () => {
                window.removeEventListener('resize', updateTooltipPosition);
            };
        }
    }, [selectedImage]);

    useEffect(() => {
        if (!selectedImage) return;

        const handleDocumentClick = (e) => {
            const isClickInside = editorRef.current?.contains(e.target);
            const isClickOnTooltip = e.target.closest('.image-tooltip-popover');
            
            if (!isClickInside && !isClickOnTooltip) {
                selectedImage.removeAttribute('data-selected');
                setSelectedImage(null);
            }
        };

        const timer = setTimeout(() => {
            document.addEventListener('click', handleDocumentClick);
        }, 10);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleDocumentClick);
        };
    }, [selectedImage]);

    const resizeImage = (widthPercent) => {
        if (selectedImage) {
            selectedImage.style.width = widthPercent;
            selectedImage.style.height = 'auto'; // Prevent elongation!
            selectedImage.setAttribute('width', widthPercent);
            updateValue(editorRef.current.innerHTML);
            setTimeout(() => {
                if (selectedImage && editorRef.current) {
                    const imgRect = selectedImage.getBoundingClientRect();
                    const containerRect = editorRef.current.parentNode.getBoundingClientRect();
                    setImageTooltipPos({
                        top: imgRect.top - containerRect.top - 50,
                        left: imgRect.left - containerRect.left + (imgRect.width / 2)
                    });
                }
            }, 50);
        }
    };

    const alignImage = (alignment) => {
        if (selectedImage) {
            selectedImage.style.display = 'block';
            if (alignment === 'left') {
                selectedImage.style.marginLeft = '0';
                selectedImage.style.marginRight = 'auto';
            } else if (alignment === 'center') {
                selectedImage.style.marginLeft = 'auto';
                selectedImage.style.marginRight = 'auto';
            } else if (alignment === 'right') {
                selectedImage.style.marginLeft = 'auto';
                selectedImage.style.marginRight = '0';
            }
            updateValue(editorRef.current.innerHTML);
        }
    };

    const removeImage = () => {
        if (selectedImage) {
            selectedImage.remove();
            setSelectedImage(null);
            updateValue(editorRef.current.innerHTML);
        }
    };

    const handleImageFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (editorRef.current) {
                editorRef.current.focus();
            }
            const selection = window.getSelection();
            let savedRange = null;
            if (selection.rangeCount > 0) {
                savedRange = selection.getRangeAt(0).cloneRange();
            }

            setIsUploading(true);
            try {
                const url = await useStore.getState().uploadToCloudinary(file);
                if (url) {
                    if (savedRange) {
                        selection.removeAllRanges();
                        selection.addRange(savedRange);
                    }
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

    const handleInsertTable = (rowCount, colCount) => {
        setShowTableSelector(false);
        setHoveredGrid({ rows: 0, cols: 0 });
        
        if (editorRef.current) {
            editorRef.current.focus();
        }
        
        let tableHtml = `<table class="w-full text-left border-collapse border border-black my-6">`;
        
        // Header Row
        tableHtml += `<thead><tr class="bg-black text-[9px] font-black uppercase text-white tracking-[0.3em]">`;
        for (let c = 1; c <= colCount; c++) {
            const isLastCol = c === colCount;
            tableHtml += `<th class="p-4 ${isLastCol ? '' : 'border-r border-white/20'}">Header ${c}</th>`;
        }
        tableHtml += `</tr></thead>`;
        
        // Body Rows
        const bodyRowsCount = rowCount > 1 ? rowCount - 1 : 0;
        if (bodyRowsCount > 0) {
            tableHtml += `<tbody class="divide-y divide-black/10">`;
            for (let r = 1; r <= bodyRowsCount; r++) {
                tableHtml += `<tr class="hover:bg-gray-50">`;
                for (let c = 1; c <= colCount; c++) {
                    const isLastCol = c === colCount;
                    tableHtml += `<td class="p-4 text-[12px] font-medium text-black ${isLastCol ? '' : 'border-r border-black/10'}">Cell ${r}-${c}</td>`;
                }
                tableHtml += `</tr>`;
            }
            tableHtml += `</tbody>`;
        }
        
        tableHtml += `</table><p><br></p>`;
        
        execCommand('insertHTML', tableHtml);
    };
    
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
            updateActiveFormats();
        }
    };

    const handleInput = () => {
        if (editorRef.current) {
            updateValue(editorRef.current.innerHTML);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            if (selectedImage) {
                selectedImage.removeAttribute('data-selected');
            }
            setSelectedImage(null);
        }

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

    const activeBtnClass = {
        'neon-blue': 'bg-neon-blue/15 text-neon-blue border-neon-blue/30 shadow-[0_0_10px_rgba(0,240,255,0.15)]',
        'neon-green': 'bg-neon-green/15 text-neon-green border-neon-green/30 shadow-[0_0_10px_rgba(57,255,20,0.15)]',
        'neon-purple': 'bg-neon-purple/15 text-neon-purple border-neon-purple/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
    }[accentColor] || 'bg-neon-blue/15 text-neon-blue border-neon-blue/30 shadow-[0_0_10px_rgba(0,240,255,0.15)]';

    const focusBorderClass = {
        'neon-blue': 'border-neon-blue/50 shadow-[0_0_30px_rgba(0,240,255,0.1)]',
        'neon-green': 'border-neon-green/50 shadow-[0_0_30px_rgba(57,255,20,0.1)]',
        'neon-purple': 'border-neon-purple/50 shadow-[0_0_30px_rgba(168,85,247,0.1)]'
    }[accentColor] || 'border-neon-blue/50 shadow-[0_0_30px_rgba(0,240,255,0.1)]';

    const uploadBgClass = {
        'neon-blue': 'bg-neon-blue',
        'neon-green': 'bg-neon-green',
        'neon-purple': 'bg-neon-purple'
    }[accentColor] || 'bg-neon-blue';

    const loaderTextClass = {
        'neon-blue': 'text-neon-blue',
        'neon-green': 'text-neon-green',
        'neon-purple': 'text-neon-purple'
    }[accentColor] || 'text-neon-blue';

    const activeTextClass = {
        'neon-blue': 'text-neon-blue',
        'neon-green': 'text-neon-green',
        'neon-purple': 'text-neon-purple'
    }[accentColor] || 'text-neon-blue';

    const activeBorderClass = {
        'neon-blue': 'border-neon-blue/40 shadow-[0_0_10px_rgba(0,240,255,0.1)]',
        'neon-green': 'border-neon-green/40 shadow-[0_0_10px_rgba(57,255,20,0.1)]',
        'neon-purple': 'border-neon-purple/40 shadow-[0_0_10px_rgba(168,85,247,0.1)]'
    }[accentColor] || 'border-neon-blue/40 shadow-[0_0_10px_rgba(0,240,255,0.15)]';

    const ToolbarButton = ({ icon: Icon, onClick, active, disabled, title }) => (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "p-2 rounded-lg transition-all duration-200 flex items-center justify-center border border-transparent",
                active 
                    ? activeBtnClass
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
                "relative bg-black/40 border transition-all duration-500 rounded-[2rem]",
                isFocused ? focusBorderClass : "border-white/5"
            )}>
                {/* Toolbar */}
                <div className={cn(
                    "flex items-center flex-wrap gap-2.5 p-2.5 border-b border-white/5 bg-zinc-900/40 backdrop-blur-xl rounded-t-[2rem] justify-between",
                    (showTableSelector || showStyleDropdown) ? "relative z-30" : "relative z-10"
                )}>
                    <div className="flex items-center flex-wrap gap-2.5">
                        {/* History Group */}
                        <div className="flex items-center bg-zinc-950/40 border border-white/5 rounded-xl p-0.5">
                            <ToolbarButton icon={Undo2} onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" />
                            <div className="w-[1px] h-4 bg-white/5" />
                            <ToolbarButton icon={Redo2} onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" />
                        </div>

                        {/* Divider */}
                        <div className="w-[1px] h-5 bg-gradient-to-b from-transparent via-white/10 to-transparent self-center hidden sm:block" />

                        {/* Custom Style Dropdown */}
                        <div className="relative style-dropdown-container">
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-zinc-900/50 hover:bg-zinc-800/50 text-gray-300 hover:text-white transition-all text-[11px] font-bold min-w-[125px] justify-between",
                                    showStyleDropdown && activeBorderClass
                                )}
                            >
                                <span className="flex items-center gap-1.5">
                                    {activeFormats.blockType === 'h1' && <Heading1 size={13} className={activeTextClass} />}
                                    {activeFormats.blockType === 'h2' && <Heading2 size={13} className={activeTextClass} />}
                                    {activeFormats.blockType === 'p' && <Type size={13} />}
                                    <span>
                                        {activeFormats.blockType === 'h1' && 'Heading 1'}
                                        {activeFormats.blockType === 'h2' && 'Heading 2'}
                                        {activeFormats.blockType === 'p' && 'Normal Text'}
                                    </span>
                                </span>
                                <svg className={cn("w-3 h-3 text-gray-500 transition-transform duration-200", showStyleDropdown && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            
                            {showStyleDropdown && (
                                <div className="absolute top-full left-0 mt-1.5 w-44 bg-zinc-950/95 border border-white/10 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            execCommand('formatBlock', 'p');
                                            execCommand('removeFormat');
                                            setShowStyleDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-xl text-[11px] transition-all flex items-center gap-2 font-bold border border-transparent",
                                            activeFormats.blockType === 'p' 
                                                ? activeBtnClass
                                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <Type size={14} />
                                        <span>Normal Text</span>
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            execCommand('formatBlock', 'h1');
                                            setShowStyleDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-xl text-[11px] transition-all flex items-center gap-2 font-bold border border-transparent",
                                            activeFormats.blockType === 'h1' 
                                                ? activeBtnClass
                                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <Heading1 size={14} />
                                        <span>Heading 1</span>
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            execCommand('formatBlock', 'h2');
                                            setShowStyleDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-xl text-[11px] transition-all flex items-center gap-2 font-bold border border-transparent",
                                            activeFormats.blockType === 'h2' 
                                                ? activeBtnClass
                                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <Heading2 size={14} />
                                        <span>Heading 2</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Formatting Group */}
                        <div className="flex items-center bg-zinc-950/40 border border-white/5 rounded-xl p-0.5">
                            <ToolbarButton icon={Bold} onClick={() => execCommand('bold')} active={activeFormats.bold} title="Bold" />
                            <div className="w-[1px] h-4 bg-white/5" />
                            <ToolbarButton icon={Italic} onClick={() => execCommand('italic')} active={activeFormats.italic} title="Italic" />
                        </div>

                        {/* Divider */}
                        <div className="w-[1px] h-5 bg-gradient-to-b from-transparent via-white/10 to-transparent self-center hidden sm:block" />

                        {/* Lists Group */}
                        <div className="flex items-center bg-zinc-950/40 border border-white/5 rounded-xl p-0.5">
                            <ToolbarButton icon={List} onClick={() => execCommand('insertUnorderedList')} active={activeFormats.list} title="Bullet List" />
                            <div className="w-[1px] h-4 bg-white/5" />
                            <ToolbarButton icon={ListOrdered} onClick={() => execCommand('insertOrderedList')} active={activeFormats.orderedList} title="Numbered List" />
                        </div>

                        {/* Divider */}
                        <div className="w-[1px] h-5 bg-gradient-to-b from-transparent via-white/10 to-transparent self-center hidden sm:block" />

                        {/* Alignment Group */}
                        <div className="flex items-center bg-zinc-950/40 border border-white/5 rounded-xl p-0.5">
                            <ToolbarButton icon={AlignLeft} onClick={() => execCommand('justifyLeft')} active={activeFormats.alignLeft} title="Align Left" />
                            <div className="w-[1px] h-4 bg-white/5" />
                            <ToolbarButton icon={AlignCenter} onClick={() => execCommand('justifyCenter')} active={activeFormats.alignCenter} title="Align Center" />
                            <div className="w-[1px] h-4 bg-white/5" />
                            <ToolbarButton icon={AlignRight} onClick={() => execCommand('justifyRight')} active={activeFormats.alignRight} title="Align Right" />
                        </div>

                        {/* Divider */}
                        <div className="w-[1px] h-5 bg-gradient-to-b from-transparent via-white/10 to-transparent self-center hidden sm:block" />

                        {/* Inserts Group */}
                        <div className="flex items-center bg-zinc-950/40 border border-white/5 rounded-xl p-0.5 table-selector-container">
                            <ToolbarButton icon={LinkIcon} onClick={() => {
                                const url = prompt("Enter link URL:");
                                if (url) execCommand('createLink', url);
                            }} title="Insert Link" />
                            <div className="w-[1px] h-4 bg-white/5" />
                            <ToolbarButton 
                                icon={ImageIcon} 
                                onClick={() => {
                                    if (fileInputRef.current) {
                                        fileInputRef.current.value = '';
                                        fileInputRef.current.click();
                                    }
                                }} 
                                title="Add Image (Upload)" 
                            />
                            <div className="w-[1px] h-4 bg-white/5" />
                            
                            <div className="relative flex items-center justify-center">
                                <ToolbarButton 
                                    icon={Table} 
                                    onClick={() => setShowTableSelector(!showTableSelector)} 
                                    active={showTableSelector}
                                    title="Insert Table" 
                                />
                                {showTableSelector && (
                                    <div 
                                        onMouseDown={(e) => e.preventDefault()}
                                        className="absolute top-full mt-2.5 right-0 bg-zinc-950 border border-white/10 rounded-2xl p-4 shadow-2xl z-[90] space-y-2 animate-in fade-in slide-in-from-top-1 duration-150"
                                        onMouseLeave={() => setHoveredGrid({ rows: 0, cols: 0 })}
                                    >
                                        <div className="text-[9px] font-black uppercase tracking-wider text-neon-green text-center">
                                            {hoveredGrid.rows > 0 && hoveredGrid.cols > 0 
                                                ? `${hoveredGrid.rows} x ${hoveredGrid.cols} Table` 
                                                : "Select Table Size"}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            {Array.from({ length: 6 }).map((_, rIdx) => (
                                                <div key={rIdx} className="flex gap-1">
                                                    {Array.from({ length: 6 }).map((_, cIdx) => {
                                                        const row = rIdx + 1;
                                                        const col = cIdx + 1;
                                                        const isHighlighted = row <= hoveredGrid.rows && col <= hoveredGrid.cols;
                                                        return (
                                                            <button
                                                                key={cIdx}
                                                                type="button"
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onMouseEnter={() => setHoveredGrid({ rows: row, cols: col })}
                                                                onClick={() => handleInsertTable(row, col)}
                                                                className={cn(
                                                                    "w-5 h-5 rounded transition-all border",
                                                                    isHighlighted 
                                                                        ? "bg-neon-green/30 border-neon-green shadow-[0_0_5px_rgba(57,255,20,0.3)]" 
                                                                        : "bg-white/5 border-white/10 hover:border-white/20"
                                                                )}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Editor Surface & Placeholder Container */}
                <div 
                    onClick={handleEditorClick}
                    className={cn(
                        "relative rounded-b-[2rem]",
                        selectedImage ? "z-30" : "z-20"
                    )}
                >
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
                                    return;
                                }
                            }

                            // Sanitize HTML paste to remove white/black colors, font sizes, font families
                            const html = e.clipboardData.getData('text/html');
                            if (html) {
                                e.preventDefault();
                                
                                const cleanHtmlOnPaste = (htmlString) => {
                                    // Convert h3, h4, h5, h6 headings to standard paragraph p tags to prevent unsupported heading sizes
                                    let processedHtml = htmlString
                                        .replace(/<h[3-6]([^>]*)>/gi, '<p$1>')
                                        .replace(/<\/h[3-6]>/gi, '</p>');

                                    const parser = new DOMParser();
                                    const docObj = parser.parseFromString(processedHtml, 'text/html');
                                    
                                    const cleanElement = (element) => {
                                        // Strip all inline styles except text alignment (text-align)
                                        if (element.hasAttribute('style')) {
                                            const textAlign = element.style.textAlign;
                                            element.removeAttribute('style');
                                            if (textAlign) {
                                                element.style.textAlign = textAlign;
                                            }
                                        }
                                        
                                        if (element.tagName.toLowerCase() === 'font') {
                                            element.removeAttribute('color');
                                            element.removeAttribute('face');
                                            element.removeAttribute('size');
                                        }
                                        
                                        element.removeAttribute('class');
                                        element.removeAttribute('id');
                                        
                                        for (let i = 0; i < element.children.length; i++) {
                                            cleanElement(element.children[i]);
                                        }
                                    };
                                    
                                    if (docObj.body) {
                                        cleanElement(docObj.body);
                                        return docObj.body.innerHTML;
                                    }
                                    return processedHtml;
                                };

                                const cleanedHtml = cleanHtmlOnPaste(html);
                                document.execCommand('insertHTML', false, cleanedHtml);
                                updateValue(editorRef.current.innerHTML);
                            } else {
                                const text = e.clipboardData.getData('text/plain');
                                if (text) {
                                    e.preventDefault();
                                    document.execCommand('insertText', false, text);
                                    updateValue(editorRef.current.innerHTML);
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
                            "w-full p-6 text-[11px] font-medium text-white/90 focus:outline-none leading-relaxed article-content prose prose-invert prose-sm max-w-none break-words article-content-force-white rounded-b-[2rem]",
                            "min-h-[150px]",
                            isUploading && "opacity-50 pointer-events-none"
                        )}
                        style={{ minHeight, wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                    />

                    {/* Placeholder Overlay */}
                    {!value && !isFocused && !isUploading && (
                        <div className="absolute top-0 left-0 p-6 pointer-events-none text-gray-700 text-[11px] font-medium italic leading-relaxed">
                            {placeholder}
                        </div>
                    )}

                    {/* Image Toolbar Popover */}
                    {selectedImage && (
                        <div 
                            className="image-tooltip-popover absolute bg-zinc-950 border border-white/10 rounded-2xl p-2 shadow-2xl z-[80] flex items-center gap-2 backdrop-blur-md transition-all duration-200"
                            style={{
                                top: `${imageTooltipPos.top}px`,
                                left: `${imageTooltipPos.left}px`,
                                transform: 'translateX(-50%)'
                            }}
                            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
                        >
                            <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider px-1">Size</span>
                                {['25%', '50%', '75%', '100%'].map((w) => (
                                    <button
                                        key={w}
                                        type="button"
                                        onClick={() => resizeImage(w)}
                                        className={cn(
                                            "px-2 py-1 rounded text-[10px] font-bold transition-all",
                                            selectedImage.style.width === w 
                                                ? "bg-neon-green/20 text-neon-green" 
                                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        {w}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider px-1">Align</span>
                                {[
                                    { id: 'left', label: 'Left' },
                                    { id: 'center', label: 'Center' },
                                    { id: 'right', label: 'Right' }
                                ].map((a) => (
                                    <button
                                        key={a.id}
                                        type="button"
                                        onClick={() => alignImage(a.id)}
                                        className="px-2 py-1 rounded text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/5"
                                    >
                                        {a.label}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={removeImage}
                                className="px-2 py-1 rounded text-[10px] font-bold text-red-500 hover:bg-red-500/10 transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>

                {/* Uploading Overlay */}
                {isUploading && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3 rounded-[2rem]">
                        <div className="relative">
                            <div className={cn("absolute inset-0 blur-xl opacity-50 rounded-full", uploadBgClass)} />
                            <Loader2 className={cn("animate-spin relative z-10", loaderTextClass)} size={32} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white animate-pulse">Processing Media...</span>
                    </div>
                )}

                {/* Hidden input for direct OS uploader */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageFileChange} 
                />
            </div>
        </div>
    );
};

export const MultiPageRichEditor = ({
    value = '',
    onChange,
    label,
    placeholder,
    minHeight = "200px",
    accentColor = "neon-green"
}) => {
    // Split value into pages by the page-break div markup
    const pages = useMemo(() => {
        if (!value) return [''];
        const parts = value.split(/<div[^>]*class="[^"]*page-break[^"]*"[^>]*><\/div>/gi);
        return parts.length > 0 ? parts : [''];
    }, [value]);

    const handlePageChange = (index, newContent) => {
        const newPages = [...pages];
        newPages[index] = newContent;
        const joined = newPages.join('<div class="page-break"></div>');
        onChange(joined);
    };

    const addPage = () => {
        const newPages = [...pages, ''];
        const joined = newPages.join('<div class="page-break"></div>');
        onChange(joined);
    };

    const removePage = (index) => {
        if (pages.length <= 1) return;
        const newPages = pages.filter((_, i) => i !== index);
        const joined = newPages.join('<div class="page-break"></div>');
        onChange(joined);
    };

    return (
        <div className="space-y-6">
            {pages.map((pageContent, idx) => (
                <div key={idx} className="relative bg-zinc-950/20 border border-white/5 rounded-[2rem] p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <span className="text-[10px] font-black text-neon-green/60 uppercase tracking-widest bg-neon-green/5 border border-neon-green/10 px-3 py-1 rounded-full">
                            {label} — Page {idx + 1}
                        </span>
                        {pages.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removePage(idx)}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 transition-all rounded-xl text-[9px] font-black uppercase tracking-wider"
                                title="Remove Page Break"
                            >
                                Remove Page
                            </button>
                        )}
                    </div>
                    <StudioRichEditor
                        value={pageContent}
                        onChange={(val) => handlePageChange(idx, val)}
                        placeholder={placeholder}
                        minHeight={minHeight}
                        accentColor={accentColor}
                    />
                </div>
            ))}
            <button
                type="button"
                onClick={addPage}
                className="w-full py-4 border border-dashed border-white/10 hover:border-neon-green/30 hover:bg-neon-green/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-neon-green transition-all flex items-center justify-center gap-2"
            >
                <span>+ Add Page Break (Create New Page)</span>
            </button>
        </div>
    );
};

export default StudioRichEditor;
