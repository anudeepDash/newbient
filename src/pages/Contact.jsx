import React from 'react';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import { cn } from '../lib/utils';
import EnquiryForm from '../landing/components/EnquiryForm';
import { usePublicFeed } from '../landing/feed';

/*
 * /contact on the landing site: prerendered, no Firestore. Contact details
 * come from the cached public feed; the form posts to the enquiry handler.
 */
const Contact = () => {
    const feed = usePublicFeed();
    const c = feed?.contact || {};
    const phoneDigits = (c.phone || '').replace(/[^0-9]/g, '');

    const methods = [
        phoneDigits && { icon: MessageSquare, label: 'WhatsApp', val: c.phone, href: `https://wa.me/${phoneDigits}`, accent: 'neon-green' },
        c.email && { icon: Mail, label: 'Email', val: c.email, href: `mailto:${c.email}`, accent: 'neon-blue' },
        c.instagram && { icon: Instagram, label: 'Instagram', val: '@' + (c.instagram.replace(/\/+$/, '').split('/').pop() || 'newbi.live'), href: c.instagram, accent: 'neon-pink' },
        c.address && { icon: MapPin, label: 'Office', val: c.address, href: `https://maps.google.com/?q=${encodeURIComponent(c.address)}`, accent: 'white' },
    ].filter(Boolean);

    return (
        <div className="relative min-h-screen bg-gray-50 dark:bg-dark text-gray-900 dark:text-white pt-12 md:pt-20 pb-20 px-4 w-full max-w-[100vw] overflow-x-clip">
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="max-w-2xl mb-10 md:mb-14">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-heading tracking-tight leading-tight mb-5">
                        Let's build{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-600 to-gray-400 dark:from-white dark:via-white dark:to-gray-400">something remarkable.</span>
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg font-medium max-w-lg leading-relaxed">
                        Planning a campus activation, a show or a creator campaign? Tell us about it and the team will reply by email.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-16 items-start">
                    <div className="space-y-6 order-2 lg:order-1">
                        <h2 className="text-2xl font-bold font-heading tracking-tight text-gray-900 dark:text-white">Get in touch</h2>
                        {methods.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {methods.map((m) => <ContactMethod key={m.label} {...m} />)}
                            </div>
                        ) : (
                            <p className="text-gray-600 dark:text-gray-400">Use the form and we'll reply by email.</p>
                        )}
                    </div>

                    <div className="order-1 lg:order-2">
                        <EnquiryForm page="contact" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const ContactMethod = ({ icon: Icon, label, val, href, accent }) => (
    <a
        href={href}
        target={href.startsWith('mailto:') ? undefined : '_blank'}
        rel="noopener noreferrer"
        className="group p-5 md:p-6 bg-white dark:bg-slate-900/20 border border-gray-200 dark:border-white/5 rounded-2xl hover:border-gray-300 dark:hover:border-white/10 transition-colors block shadow-sm dark:shadow-none"
    >
        <div className={cn(
            'w-11 h-11 rounded-2xl flex items-center justify-center mb-4',
            accent === 'neon-green' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : (accent === 'neon-blue' ? 'bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' : (accent === 'neon-pink' ? 'bg-pink-100 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white'))
        )}>
            <Icon size={20} aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</p>
        <p className="text-sm font-bold text-gray-900 dark:text-white break-words">{val}</p>
    </a>
);

export default Contact;
