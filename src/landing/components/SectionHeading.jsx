// The landing's section heading: a small label, a bold title with a gradient
// phrase (as on the original site), and an optional supporting line.
export default function SectionHeading({ id, eyebrow, title, highlight, after = '', text, align = 'left', className = '' }) {
    const center = align === 'center';
    return (
        <div className={`nb-reveal ${center ? 'text-center mx-auto' : ''} max-w-3xl ${className}`}>
            {eyebrow && (
                <p className={`flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-zinc-400 ${center ? 'justify-center' : ''}`}>
                    <span className="w-6 h-px bg-neon-green" aria-hidden="true" />
                    {eyebrow}
                </p>
            )}
            <h2 id={id} className="mt-4 font-heading text-[2.1rem] leading-[1.05] sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-950 dark:text-white">
                {title} {highlight && <span className="nb-gradient">{highlight}</span>}{after}
            </h2>
            {text && <p className={`mt-4 text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400 ${center ? 'mx-auto' : ''} max-w-2xl`}>{text}</p>}
        </div>
    );
}
