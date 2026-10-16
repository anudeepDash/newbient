import { Link } from 'react-router-dom';
import { Instagram, Linkedin, Mail } from 'lucide-react';
import Logo from './Logo';
import { usePublicFeed } from '../feed';
import { APP_LINKS } from '../links';

const col = 'flex flex-col';
const item = 'inline-flex items-center min-h-[44px] text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white transition-colors';
const heading = 'text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1';

export default function LandingFooter() {
    const feed = usePublicFeed();
    const contact = feed?.contact || {};
    const email = contact.email || 'partnership@newbi.live';

    return (
        <footer className="border-t border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#05070a]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <div className="space-y-4">
                    <Logo height={34} />
                    <p className="text-sm text-gray-600 dark:text-zinc-400 max-w-xs leading-relaxed">
                        College activations, live shows and creator campaigns across India.
                    </p>
                    <div className="flex items-center gap-1 -ml-3">
                        {contact.instagram && (
                            <a href={contact.instagram} target="_blank" rel="noopener noreferrer" aria-label="Newbi on Instagram" className="w-11 h-11 inline-flex items-center justify-center rounded-xl text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10">
                                <Instagram size={19} aria-hidden="true" />
                            </a>
                        )}
                        {contact.linkedin && (
                            <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" aria-label="Newbi on LinkedIn" className="w-11 h-11 inline-flex items-center justify-center rounded-xl text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10">
                                <Linkedin size={19} aria-hidden="true" />
                            </a>
                        )}
                        <a href={`mailto:${email}`} aria-label={`Email ${email}`} className="w-11 h-11 inline-flex items-center justify-center rounded-xl text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10">
                            <Mail size={19} aria-hidden="true" />
                        </a>
                    </div>
                </div>

                <nav aria-label="Newbi" className={col}>
                    <p className={heading}>Newbi</p>
                    <Link to="/#services" className={item}>What we do</Link>
                    <Link to="/#work" className={item}>Work</Link>
                    <Link to="/#enquire" className={item}>Work with us</Link>
                    <Link to="/contact" className={item}>Contact</Link>
                </nav>

                <nav aria-label="Join in" className={col}>
                    <p className={heading}>Join in</p>
                    <Link to="/creator" className={item}>For creators</Link>
                    <a href={APP_LINKS.home} className={item}>Open the app</a>
                    <a href="/concertzone" className={item}>ConcertZone</a>
                    <a href="https://artistant.in" target="_blank" rel="noopener noreferrer" className={item}>Artistant</a>
                </nav>

                <nav aria-label="Legal" className={col}>
                    <p className={heading}>Legal</p>
                    <Link to="/terms" className={item}>Terms</Link>
                    <Link to="/privacy" className={item}>Privacy</Link>
                </nav>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-black/[0.06] dark:border-white/[0.06] text-xs text-gray-500 dark:text-zinc-500">
                © <span suppressHydrationWarning>{new Date().getFullYear()}</span> Newbi Entertainment &amp; Marketing LLP
            </div>
        </footer>
    );
}
