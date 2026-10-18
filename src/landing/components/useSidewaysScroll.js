import { useEffect } from 'react';

/*
 * The pinned sections whose slides move sideways with the scroll (Story,
 * CaseStudies) look like a swipe-right carousel, so people swipe sideways.
 * This makes that work too: while the section is pinned, a sideways swipe on
 * a phone, or a sideways trackpad gesture, scrolls the page by the amount
 * that moves the slides under the finger. Up/down scrolling is left alone.
 *
 * Only runs where the section actually pins (landing.css: scroll-driven
 * animations supported, no reduced motion); elsewhere the slides are a plain
 * sideways list that already swipes natively.
 */
const EDGE = 24; // leave the screen edges to Safari's back/forward swipe
const LOCK = 8; // px of movement before deciding sideways vs up/down

export default function useSidewaysScroll(sectionRef, trackSelector) {
    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return undefined;
        const pins = () => window.CSS?.supports?.('animation-timeline: scroll()')
            && window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
        if (!pins()) return undefined;

        const range = () => {
            const top = section.getBoundingClientRect().top + window.scrollY;
            return { top, end: top + section.offsetHeight - window.innerHeight };
        };
        const pinnedNow = () => {
            const r = section.getBoundingClientRect();
            return r.top <= 1 && r.bottom >= window.innerHeight - 1;
        };
        // Page pixels per pixel of sideways slide movement.
        const ratio = () => {
            const track = section.querySelector(trackSelector);
            const travel = (track?.offsetWidth || 0) - window.innerWidth;
            const { top, end } = range();
            return travel > 0 ? (end - top) / travel : 1;
        };
        const clampTo = (y) => {
            const { top, end } = range();
            return Math.min(end, Math.max(top, y));
        };

        // Touch: decide the axis after a few pixels; sideways drags drive the page.
        let t = null;
        const onStart = (e) => {
            const p = e.touches[0];
            if (e.touches.length !== 1 || !pinnedNow() || p.clientX < EDGE || p.clientX > window.innerWidth - EDGE) { t = null; return; }
            t = { x: p.clientX, y: p.clientY, scroll: window.scrollY, k: ratio(), axis: null, dx: 0 };
        };
        const onMove = (e) => {
            if (!t) return;
            const p = e.touches[0];
            const dx = p.clientX - t.x;
            const dy = p.clientY - t.y;
            if (!t.axis) {
                if (Math.abs(dx) < LOCK && Math.abs(dy) < LOCK) return;
                t.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            }
            if (t.axis !== 'x') return;
            e.preventDefault();
            t.dx = dx;
            // 'instant': the page has scroll-behavior: smooth, which would lag behind the finger.
            window.scrollTo({ top: clampTo(t.scroll - dx * t.k), behavior: 'instant' });
        };
        // On release, settle on a slide like a carousel: the next one in the swipe's
        // direction, or back to the nearest one after a small nudge.
        const onEnd = () => {
            if (t?.axis === 'x') {
                const track = section.querySelector(trackSelector);
                const slides = [...(track?.children || [])];
                const { top, end } = range();
                const travel = (track?.offsetWidth || 0) - window.innerWidth;
                if (slides.length > 1 && travel > 0 && end > top) {
                    const first = slides[0].getBoundingClientRect().left;
                    const edges = slides.map((el) => Math.min(travel, el.getBoundingClientRect().left - first));
                    const at = ((window.scrollY - top) / (end - top)) * travel; // how far the slides have moved
                    const nearest = edges.reduce((a, b) => (Math.abs(b - at) < Math.abs(a - at) ? b : a));
                    let target = nearest;
                    if (Math.abs(t.dx) >= 40) {
                        target = t.dx < 0
                            ? edges.find((x) => x > at + 1) ?? travel
                            : [...edges].reverse().find((x) => x < at - 1) ?? 0;
                    }
                    window.scrollTo({ top: clampTo(top + (target / travel) * (end - top)), behavior: 'smooth' });
                }
            }
            t = null;
        };

        // Trackpads and sideways mouse wheels.
        const onWheel = (e) => {
            if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || !pinnedNow()) return;
            const next = clampTo(window.scrollY + e.deltaX * ratio());
            if (Math.abs(next - window.scrollY) < 1) return; // at an end: let the page do its default
            e.preventDefault();
            window.scrollTo({ top: next, behavior: 'instant' });
        };

        section.addEventListener('touchstart', onStart, { passive: true });
        section.addEventListener('touchmove', onMove, { passive: false });
        section.addEventListener('touchend', onEnd, { passive: true });
        section.addEventListener('touchcancel', onEnd, { passive: true });
        section.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            section.removeEventListener('touchstart', onStart);
            section.removeEventListener('touchmove', onMove);
            section.removeEventListener('touchend', onEnd);
            section.removeEventListener('touchcancel', onEnd);
            section.removeEventListener('wheel', onWheel);
        };
    }, [sectionRef, trackSelector]);
}
