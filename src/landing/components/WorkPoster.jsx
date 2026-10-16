import { Play } from 'lucide-react';
import { sizedImage } from '../links';

const monthYear = (iso) => {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00+05:30`);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

export const workMeta = (item) => [item.category, item.sector, monthYear(item.date) || item.year].filter(Boolean).join(' · ');

// A portfolio poster in its 4:5 frame, keeping the framing the team set in the
// admin (imageTransform: zoom and x/y offset). Caption sits under the frame.
export default function WorkPoster({ item, index, eager = false, className = '' }) {
    const t = item.imageTransform || {};
    const meta = workMeta(item);
    return (
        <figure className={`group ${className}`}>
            <div className="relative aspect-[4/5] rounded-[1.5rem] overflow-hidden bg-zinc-900 border border-white/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
                <img
                    src={sizedImage(item.image, 900)}
                    alt={item.title}
                    width="800"
                    height="1000"
                    loading={eager ? 'eager' : 'lazy'}
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    style={{ objectPosition: `calc(50% + ${t.x || 0}%) calc(50% + ${t.y || 0}%)`, transform: `scale(${t.scale || 1})`, transformOrigin: 'center' }}
                />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                {index !== undefined && <span className="absolute top-4 left-4 font-mono text-[11px] font-bold tracking-[0.2em] text-white/85">{String(index + 1).padStart(2, '0')}</span>}
                {item.highlightUrl && (
                    <a href={item.highlightUrl} target="_blank" rel="noopener noreferrer" aria-label={`Watch the reel: ${item.title}`} className="absolute top-3 right-3 w-11 h-11 rounded-full bg-neon-green text-black flex items-center justify-center hover:scale-110 transition-transform">
                        <Play size={16} fill="currentColor" aria-hidden="true" />
                    </a>
                )}
            </div>
            <figcaption className="mt-4">
                <span className="block font-heading font-extrabold tracking-[-0.03em] text-xl md:text-2xl leading-tight text-white">{item.title}</span>
                {meta && <span className="mt-1.5 block font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">{meta}</span>}
            </figcaption>
        </figure>
    );
}
