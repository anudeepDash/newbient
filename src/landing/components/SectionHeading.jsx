import Sticker from './Sticker';
import SectionLabel from './SectionLabel';
import { useT } from '../../i18n';

// Section heading: the glass label chip, a big title in ink with its key words
// as a neon sticker (like the hero's "show up."), and an optional supporting line.
export default function SectionHeading({ id, index, eyebrow, title, highlight, text, align = 'left', className = '' }) {
    const t = useT();
    const center = align === 'center';
    return (
        <div className={`nb-reveal ${center ? 'text-center mx-auto' : ''} ${className}`}>
            {(eyebrow || index) && <SectionLabel index={index} center={center}>{eyebrow && t(eyebrow)}</SectionLabel>}
            <h2 id={id} className="mt-5 font-heading font-extrabold tracking-[-0.03em] leading-[0.95] text-[2.6rem] sm:text-6xl lg:text-7xl xl:text-[5.5rem] text-gray-950 dark:text-white">
                {t(title)}{highlight && <> <Sticker subtle>{t(highlight)}</Sticker></>}
            </h2>
            {text && <p className={`mt-5 text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400 max-w-xl ${center ? 'mx-auto' : ''}`}>{t(text)}</p>}
        </div>
    );
}
