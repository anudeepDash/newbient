import { sizedImage } from '../links';

// Repeat a row so it is always wider than the screen while it slides.
const fill = (row, min = 8) => {
    if (!row.length) return [];
    const out = [];
    while (out.length < Math.max(min, row.length * 2)) out.push(...row);
    return out;
};

function Row({ items, className }) {
    return (
        <ul className={`flex gap-3 md:gap-4 w-max ${className}`}>
            {items.map((img, i) => (
                <li key={`${img.id}-${i}`} className="shrink-0 w-[220px] md:w-[340px] aspect-[3/2] rounded-2xl overflow-hidden bg-gray-200 dark:bg-white/[0.05]">
                    <img
                        src={sizedImage(img.src, 680)}
                        alt=""
                        width="680"
                        height="453"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                    />
                </li>
            ))}
        </ul>
    );
}

/*
 * Two rows of real event photos that slide in opposite directions as the page
 * scrolls (CSS scroll-driven animation; a still collage where that is
 * unsupported or motion is reduced). Hidden until there are enough photos.
 */
export default function Showreel({ images = [] }) {
    if (images.length < 4) return null;
    const rowA = fill(images.filter((_, i) => i % 2 === 0));
    const rowB = fill(images.filter((_, i) => i % 2 === 1));
    return (
        <section aria-label="Photos from shows and campaigns we have run" className="py-8 md:py-14 overflow-hidden">
            <Row items={rowA} className="nb-row-left" />
            <Row items={rowB} className="nb-row-right mt-3 md:mt-4 -ml-[12%]" />
        </section>
    );
}
