// A word set like the logo's ".live": neon fill, black outline, black offset
// shadow. In dark mode a thin white edge (drawn from data-text in landing.css)
// sits behind it, so it reads the same as in light mode. `subtle` is the quieter
// version for section titles; the hero uses the full one.
export default function Sticker({ children, subtle = false, tilt }) {
    const rotate = tilt ?? (subtle ? '' : '-rotate-[1.5deg]');
    return <span className={`nb-sticker inline-block ${subtle ? 'nb-sticker-sm' : ''} ${rotate}`} data-text={children}>{children}</span>;
}
