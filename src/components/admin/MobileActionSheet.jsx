import React, { useRef } from 'react';

/*
 * Phone version of menus and dropdowns: a sheet from the bottom with big rows,
 * a Cancel button and room for the iPhone home bar.
 */
export const isPhone = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(max-width: 767px)').matches);

const MobileActionSheet = ({ onClose, children, title, panelRef, onKeyDown }) => {
    // The sheet opens under the finger; ignore the rest of that same tap so it
    // can't pick the row that appears beneath it.
    const openedAt = useRef(Date.now());
    const guard = (e) => {
        if (Date.now() - openedAt.current < 400) { e.preventDefault(); e.stopPropagation(); }
    };
    return (
    <>
        <div className="fixed inset-0 z-[10000] bg-black/40 dark:bg-black/60" onClickCapture={guard} onClick={onClose} aria-hidden="true" />
        <div
            ref={panelRef}
            role="dialog"
            aria-label={title || 'Options'}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            onClickCapture={guard}
            className="fixed inset-x-0 bottom-0 z-[10001] max-h-[75dvh] overflow-y-auto overscroll-contain rounded-t-[1.75rem] border-t border-black/[0.08] bg-white px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 font-heading shadow-2xl outline-none dark:border-white/[0.08] dark:bg-[#14161d]"
        >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-black/15 dark:bg-white/15" />
            {title && <p className="px-3 pb-2 text-[13px] font-bold text-gray-500">{title}</p>}
            {children}
            <button type="button" onClick={onClose} className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-black/[0.04] text-[15px] font-semibold text-gray-700 dark:bg-white/[0.06] dark:text-zinc-200">
                Cancel
            </button>
        </div>
    </>
    );
};

export default MobileActionSheet;
