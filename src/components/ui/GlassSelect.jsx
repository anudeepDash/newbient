import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Check from 'lucide-react/dist/esm/icons/check';
import { cn } from '../../lib/utils';
import GlassSheet, { isPhone } from './GlassSheet';

/*
 * Drop-in replacement for <select> with a liquid glass list (the browser's own
 * dropdown can't be styled). Same API: value / defaultValue, onChange(event)
 * with event.target.value, <option> and <optgroup> children, disabled, name,
 * required. Keyboard: arrows, Home/End, Enter/Space, Escape, type to jump.
 * `picked` styles the chosen row (Newbi green by default; the admin passes its
 * section accent). Phones get a glass sheet from the bottom.
 */

const collectOptions = (children) => {
    const out = [];
    const walk = (nodes, group) => {
        React.Children.forEach(nodes, (child) => {
            if (!React.isValidElement(child)) return;
            if (child.type === React.Fragment) { walk(child.props.children, group); return; }
            if (child.type === 'optgroup') { walk(child.props.children, child.props.label); return; }
            if (child.type === 'option') {
                const text = React.Children.toArray(child.props.children).join('');
                const value = child.props.value !== undefined ? String(child.props.value) : text;
                out.push({ value, label: text || value, disabled: Boolean(child.props.disabled), group });
            }
        });
    };
    walk(children);
    return out;
};

const GlassSelect = React.forwardRef(({
    value, defaultValue, onChange, children, className, disabled, name, id, required,
    placeholder = 'Select…', style, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, title,
    onBlur, onFocus, autoFocus, picked = 'nb-glass-picked', ...rest
}, forwardedRef) => {
    // data-* and aria-* attributes go on the button, like they would on a <select>.
    const passThrough = Object.fromEntries(Object.entries(rest).filter(([k]) => k.startsWith('data-') || k.startsWith('aria-')));
    const options = useMemo(() => collectOptions(children), [children]);
    const controlled = value !== undefined;
    const [inner, setInner] = useState(defaultValue !== undefined ? String(defaultValue) : (options[0]?.value ?? ''));
    const current = controlled ? String(value ?? '') : inner;
    const selected = options.find(o => o.value === current);

    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [pos, setPos] = useState(null);
    const [phone, setPhone] = useState(false);
    const buttonRef = useRef(null);
    const listRef = useRef(null);
    const typed = useRef({ text: '', at: 0 });
    const listId = useId();

    const setButtonRef = (el) => {
        buttonRef.current = el;
        if (typeof forwardedRef === 'function') forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
    };

    const place = useCallback(() => {
        const r = buttonRef.current?.getBoundingClientRect();
        if (!r) return;
        const below = window.innerHeight - r.bottom;
        const height = Math.min(320, options.length * 40 + 12 + (options.some(o => o.group) ? 28 : 0));
        const up = below < height + 12 && r.top > below;
        const width = Math.max(r.width, 200);
        const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
        setPos({ left, width, ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }), maxHeight: Math.max(160, (up ? r.top : below) - 16) });
    }, [options]);

    const openList = () => {
        if (disabled) return;
        setPhone(isPhone());
        place();
        setActive(Math.max(0, options.findIndex(o => o.value === current)));
        setOpen(true);
    };
    const close = (focusButton = true) => {
        setOpen(false);
        if (focusButton) buttonRef.current?.focus();
    };

    const choose = (opt) => {
        if (!opt || opt.disabled) return;
        if (!controlled) setInner(opt.value);
        if (opt.value !== current) {
            const target = { value: opt.value, name, id };
            onChange?.({ target, currentTarget: target, preventDefault() {}, stopPropagation() {} });
        }
        close();
    };

    useLayoutEffect(() => { if (open) place(); }, [open, place]);
    // Safari doesn't focus a clicked button, so the open list takes focus for the keyboard.
    useEffect(() => { if (open && pos) listRef.current?.focus({ preventScroll: true }); }, [open, Boolean(pos)]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => {
            if (phone) return; // the sheet's backdrop handles taps outside
            if (buttonRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        const onScroll = (e) => { if (!phone && !listRef.current?.contains(e.target)) setOpen(false); };
        const prevOverflow = document.body.style.overflow;
        if (phone) document.body.style.overflow = 'hidden';
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown, { passive: true });
        window.addEventListener('resize', place);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', onScroll, true);
            if (phone) document.body.style.overflow = prevOverflow;
        };
    }, [open, place, phone]);

    // Keep the highlighted option in view.
    useEffect(() => {
        if (!open || active < 0) return;
        listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [open, active]);

    const move = (dir) => {
        if (!options.length) return;
        let i = active;
        for (let step = 0; step < options.length; step++) {
            i = (i + dir + options.length) % options.length;
            if (!options[i].disabled) break;
        }
        setActive(i);
    };

    const onKeyDown = (e) => {
        if (disabled) return;
        if (!open) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList(); }
            return;
        }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
        if (e.key === 'Tab') { setOpen(false); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); return; }
        if (e.key === 'Home') { e.preventDefault(); setActive(options.findIndex(o => !o.disabled)); return; }
        if (e.key === 'End') { e.preventDefault(); for (let i = options.length - 1; i >= 0; i--) if (!options[i].disabled) { setActive(i); break; } return; }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(options[active]); return; }
        if (e.key.length === 1) {
            const now = Date.now();
            typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + e.key.toLowerCase(), at: now };
            const hit = options.findIndex(o => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text));
            if (hit >= 0) setActive(hit);
        }
    };

    let lastGroup;
    return (
        <>
            <button
                {...passThrough}
                ref={setButtonRef}
                type="button"
                id={id}
                title={title}
                disabled={disabled}
                autoFocus={autoFocus}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                aria-required={required || undefined}
                onClick={() => (open ? close() : openList())}
                onKeyDown={onKeyDown}
                onBlur={onBlur}
                onFocus={onFocus}
                style={style}
                className={cn(
                    'relative flex items-center justify-between gap-2 text-left',
                    // Callers pass input classes (fieldCls etc.); these add the dropdown parts.
                    className || 'h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-[14px] font-semibold dark:border-white/10 dark:bg-white/[0.04]',
                    'cursor-pointer pr-9 disabled:cursor-not-allowed',
                    open && 'border-emerald-500/60 dark:border-neon-green/50'
                )}
            >
                <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-gray-400')}>{selected ? selected.label : placeholder}</span>
                <ChevronDown size={15} className={cn('pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform', open && 'rotate-180')} />
            </button>
            {name && <input type="hidden" name={name} value={current} />}
            {open && phone && createPortal(
                <GlassSheet onClose={() => close(false)} title={ariaLabel || placeholder} panelRef={listRef} onKeyDown={onKeyDown}>
                    <div role="listbox" id={listId} className="space-y-0.5">
                        {options.map((opt, i) => {
                            const isSelected = opt.value === current;
                            return (
                                <button
                                    key={`${opt.value}-${i}`}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    disabled={opt.disabled}
                                    data-index={i}
                                    onClick={() => choose(opt)}
                                    className={cn(
                                        'flex min-h-12 w-full items-center gap-3 rounded-xl px-3.5 text-left text-[16px] transition-colors disabled:opacity-40',
                                        isSelected ? cn(picked, 'font-semibold') : 'text-gray-900 active:bg-black/[0.05] dark:text-zinc-100 dark:active:bg-white/[0.08]'
                                    )}
                                >
                                    <span className="min-w-0 flex-1">
                                        {opt.group && (i === 0 || options[i - 1].group !== opt.group) && <span className="block text-[11.5px] font-bold text-gray-400">{opt.group}</span>}
                                        <span className="block truncate">{opt.label}</span>
                                    </span>
                                    {isSelected && <Check size={18} className="shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </GlassSheet>,
                document.body
            )}
            {open && !phone && pos && createPortal(
                <div
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    tabIndex={-1}
                    onKeyDown={onKeyDown}
                    aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                    style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: Math.min(320, pos.maxHeight) }}
                    data-side={pos.bottom !== undefined ? 'top' : 'bottom'}
                    className="nb-glass-menu z-[10001] overflow-y-auto overscroll-contain rounded-[1.1rem] p-1.5 font-heading outline-none"
                >
                    {options.length === 0 && <p className="px-3 py-2 text-[13px] text-gray-500">No options</p>}
                    {options.map((opt, i) => {
                        const isSelected = opt.value === current;
                        const header = opt.group && opt.group !== lastGroup ? opt.group : null;
                        lastGroup = opt.group;
                        return (
                            <React.Fragment key={`${opt.group || ''}-${opt.value}-${i}`}>
                                {header && <p className="px-3 pb-1 pt-2 text-[11.5px] font-bold text-gray-400">{header}</p>}
                                <div
                                    id={`${listId}-${i}`}
                                    data-index={i}
                                    role="option"
                                    aria-selected={isSelected}
                                    aria-disabled={opt.disabled || undefined}
                                    onMouseEnter={() => !opt.disabled && setActive(i)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => choose(opt)}
                                    className={cn(
                                        'nb-glass-option flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-xl px-3 py-2 text-[14px]',
                                        opt.disabled ? 'cursor-not-allowed opacity-40' : '',
                                        isSelected ? cn(picked, 'font-semibold') : 'text-gray-800 dark:text-zinc-200'
                                    )}
                                    data-active={i === active && !opt.disabled ? 'true' : undefined}
                                >
                                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                                    {isSelected && <Check size={15} className="shrink-0" />}
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>,
                document.body
            )}
        </>
    );
});
GlassSelect.displayName = 'GlassSelect';

export default GlassSelect;
