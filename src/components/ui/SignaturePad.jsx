import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check, Undo } from 'lucide-react';

const SignaturePad = ({ onSave, onClear }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasContent, setHasContent] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const startDrawing = (e) => {
        setIsDrawing(true);
        const { offsetX, offsetY } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
        setHasContent(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches[0]) {
            return {
                offsetX: e.touches[0].clientX - rect.left,
                offsetY: e.touches[0].clientY - rect.top
            };
        }
        return {
            offsetX: e.nativeEvent.offsetX,
            offsetY: e.nativeEvent.offsetY
        };
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasContent(false);
        if (onClear) onClear();
    };

    const save = () => {
        if (!hasContent) return;
        const dataURL = canvasRef.current.toDataURL('image/png');
        onSave(dataURL);
    };

    return (
        <div className="space-y-4">
            <div className="relative bg-white border-2 border-black/10 rounded-2xl overflow-hidden shadow-inner cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    width={500}
                    height={200}
                    className="w-full h-[200px] touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                {!hasContent && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-gray-300 text-sm font-bold uppercase tracking-widest italic">Sign Here</p>
                    </div>
                )}
            </div>
            
            <div className="flex gap-3">
                <button 
                    onClick={clear}
                    className="flex-1 h-12 bg-zinc-900 text-white rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
                >
                    <Eraser size={14} /> Clear
                </button>
                <button 
                    onClick={save}
                    disabled={!hasContent}
                    className="flex-1 h-12 bg-purple-500 text-black rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale"
                >
                    <Check size={14} /> Capture Signature
                </button>
            </div>
        </div>
    );
};

export default SignaturePad;
