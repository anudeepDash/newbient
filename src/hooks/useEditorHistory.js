import { useState, useCallback, useEffect } from 'react';

export const useEditorHistory = (initialValue, onChange) => {
    const [history, setHistory] = useState([initialValue]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const updateValue = useCallback((newValue, pushToHistory = true) => {
        if (newValue === history[currentIndex]) return;

        if (pushToHistory) {
            const newHistory = history.slice(0, currentIndex + 1);
            newHistory.push(newValue);
            
            // Limit history size to 50
            if (newHistory.length > 50) {
                newHistory.shift();
            } else {
                setCurrentIndex(newHistory.length - 1);
            }
            setHistory(newHistory);
            setCurrentIndex(newHistory.length - 1);
        }
        
        onChange(newValue);
    }, [history, currentIndex, onChange]);

    const undo = useCallback(() => {
        if (currentIndex > 0) {
            const prevValue = history[currentIndex - 1];
            setCurrentIndex(currentIndex - 1);
            onChange(prevValue);
        }
    }, [currentIndex, history, onChange]);

    const redo = useCallback(() => {
        if (currentIndex < history.length - 1) {
            const nextValue = history[currentIndex + 1];
            setCurrentIndex(currentIndex + 1);
            onChange(nextValue);
        }
    }, [currentIndex, history, onChange]);

    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;

    return { updateValue, undo, redo, canUndo, canRedo };
};
