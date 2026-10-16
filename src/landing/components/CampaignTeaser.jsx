import { Instagram, FileText, ArrowUpRight, MapPin, Users, Award, Flame } from 'lucide-react';
import { APP_LINKS, sizedImage } from '../links';

/*
 * An open campaign on the /creator landing, in the campaign card style
 * (src/components/ui/CampaignCard.jsx) but static: it links to the campaign in
 * the app, needs no store, and leaves out anything the campaign doesn't have.
 */
export default function CampaignTeaser({ campaign: c }) {
    const chips = [
        c.reward && { icon: Award, label: 'Reward', value: c.reward },
        c.taskCount && { icon: FileText, label: 'Tasks', value: String(c.taskCount) },
        c.minInstagramFollowers && { icon: Users, label: 'Followers', value: `${Number(c.minInstagramFollowers).toLocaleString('en-IN')}+` },
    ].filter(Boolean);
    const spots = c.spotsLeft !== null && c.spotsLeft !== undefined ? c.spotsLeft : null;

    return (
        <a
            href={APP_LINKS.campaign(c.id)}
            className="relative group rounded-3xl overflow-hidden flex flex-col h-full bg-white dark:bg-[#0c0e14] border border-gray-200 dark:border-white/[0.07] shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] hover:border-neon-green/40 dark:hover:border-white/[0.15] transition-colors duration-300"
        >
            <div className="relative w-full aspect-video shrink-0 overflow-hidden">
                <div className="absolute inset-0" style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 40%, transparent 100%)', maskImage: 'linear-gradient(to bottom, #000 40%, transparent 100%)' }}>
                    {c.thumbnail ? (
                        <img src={sizedImage(c.thumbnail, 720)} alt="" width="720" height="405" loading="lazy" decoding="async" className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-gray-100 via-gray-50 to-white dark:from-zinc-950 dark:via-[#121620] dark:to-[#0c0e14]" />
                    )}
                </div>
                <div className="absolute top-3.5 left-3.5 flex items-center gap-2 z-20">
                    <span className="p-1.5 rounded-xl bg-black/60 border border-white/15 text-neon-green"><Instagram size={13} aria-hidden="true" /></span>
                    {c.targetCity && (
                        <span className="px-2.5 py-1 rounded-xl bg-black/60 border border-white/15 text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-1.5 font-mono">
                            <MapPin size={10} className="text-neon-green" aria-hidden="true" /> {c.targetCity}
                        </span>
                    )}
                </div>
                {spots !== null && (
                    <span className="absolute top-3.5 right-3.5 z-20 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-black/60 text-white border-white/15 flex items-center gap-1 font-mono">
                        <Flame size={10} className="text-amber-400 fill-amber-400" aria-hidden="true" />
                        {spots === 0 ? 'Full' : `${spots} left`}
                    </span>
                )}
            </div>

            <div className="flex flex-col flex-1 px-5 pt-4 pb-5">
                {c.brand && <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-neon-green truncate mb-1.5">{c.brand}</p>}
                <h3 className="text-lg font-black font-heading text-gray-900 dark:text-white tracking-tight leading-snug">{c.title}</h3>
                {c.description && <p className="mt-2 text-gray-600 dark:text-zinc-500 text-[13px] line-clamp-2 leading-relaxed">{c.description}</p>}

                {chips.length > 0 && (
                    <div className="mt-5 flex items-center gap-2">
                        {chips.map((ch) => (
                            <div key={ch.label} className="flex-1 min-w-0 flex flex-col items-center py-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                                <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                    <ch.icon size={10} className="text-emerald-600 dark:text-neon-green" aria-hidden="true" /> {ch.label}
                                </span>
                                <span className="text-emerald-700 dark:text-neon-green text-xs font-black truncate max-w-full px-1">{ch.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-auto pt-5">
                    <span className="flex items-center justify-between px-4 h-11 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.07] dark:group-hover:bg-neon-green dark:group-hover:border-neon-green transition-colors">
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-600 dark:text-zinc-400 dark:group-hover:text-black">View campaign</span>
                        <ArrowUpRight size={15} className="text-gray-400 dark:text-zinc-500 dark:group-hover:text-black" aria-hidden="true" />
                    </span>
                </div>
            </div>
        </a>
    );
}
