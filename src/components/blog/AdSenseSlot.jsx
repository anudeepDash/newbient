import React, { useEffect } from 'react';
import { cn } from '../../lib/utils';

const AdSenseSlot = ({ 
    className = '', 
    adSlot = '', 
    adFormat = 'auto', 
    fullWidthResponsive = true,
    style = { display: 'block' }
}) => {
    const adClient = import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-8648872930946692';

    useEffect(() => {
        try {
            if (window.adsbygoogle && adClient) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (err) {
            console.error('AdSense error:', err);
        }
    }, [adSlot]);

    if (!adClient) {
        return (
            <div className={cn('relative group bg-white/[0.01] border border-dashed border-white/5 rounded-2xl flex items-center justify-center text-gray-800 text-[8px] font-black uppercase tracking-[0.4em] overflow-hidden min-h-[96px]', className)}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1500ms]" />
                <span className="relative z-10 opacity-30 group-hover:opacity-60 transition-opacity italic">// AD REVENUE SYSTEM DISCONNECTED //</span>
            </div>
        );
    }

    return (
        <div className={cn('overflow-hidden rounded-2xl', className)}>
            <ins 
                className="adsbygoogle"
                style={style}
                data-ad-client={adClient}
                data-ad-slot={adSlot}
                data-ad-format={adFormat}
                data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
            />
        </div>
    );
};

export default AdSenseSlot;
