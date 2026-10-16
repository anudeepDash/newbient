// Poster-style section heading: a mono index label, a huge uppercase title with
// one word in green, and an optional supporting line.
export default function SectionHeading({ id, index, eyebrow, title, highlight, text, align = 'left', className = '' }) {
    const center = align === 'center';
    return (
        <div className={`nb-reveal ${center ? 'text-center mx-auto' : ''} ${className}`}>
            {(eyebrow || index) && (
                <p className={`flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500 ${center ? 'justify-center' : ''}`}>
                    {index && <span className="text-emerald-700 dark:text-neon-green">{index}</span>}
                    {index && eyebrow && <span aria-hidden="true" className="w-8 h-px bg-current opacity-40" />}
                    {eyebrow}
                </p>
            )}
            <h2 id={id} className="mt-4 font-heading font-extrabold tracking-[-0.03em] leading-[0.9] text-[2.6rem] sm:text-6xl lg:text-7xl xl:text-[5.5rem] text-gray-950 dark:text-white">
                {title}{highlight && <> <span className="text-emerald-600 dark:text-neon-green">{highlight}</span></>}
            </h2>
            {text && <p className={`mt-5 text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400 max-w-xl ${center ? 'mx-auto' : ''}`}>{text}</p>}
        </div>
    );
}
