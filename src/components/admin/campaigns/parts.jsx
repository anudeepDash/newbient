import React, { useState } from 'react';
import Target from 'lucide-react/dist/esm/icons/target';
import Check from 'lucide-react/dist/esm/icons/check';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Medal from 'lucide-react/dist/esm/icons/medal';
import { cn } from '../../../lib/utils';
import { Badge, Button } from '../ui';
import Sheet from '../Sheet';
import { Toggle } from '../uploads/UploadKit';
import { CAMPAIGN_STATUS, campaignStatus, stageMeta } from './campaignModel';

/* Small pieces shared by the campaign screens. */

export const CampaignStatusPill = ({ campaign }) => {
    const cfg = CAMPAIGN_STATUS[campaignStatus(campaign)];
    return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
};

export const StageBadge = ({ stage, className }) => {
    const m = stageMeta(stage);
    return <Badge tone={m.tone} className={className}>{m.label}</Badge>;
};

/** Campaign artwork, or a coloured placeholder. */
/* A creator's referral tier, e.g. "Connector". Connector and up are shortlisted first. */
export const ReferralTierBadge = ({ standing, className }) => {
    if (!standing?.tier) return null;
    const { tier, approved } = standing;
    return (
        <Badge tone={tier.tone} className={className} title={`Brought in ${approved} approved creator${approved === 1 ? '' : 's'}`}>
            <Medal size={10} /> {tier.label}
        </Badge>
    );
};

export const CampaignThumb = ({ campaign, className, iconSize = 22 }) => {
    const [failed, setFailed] = useState(false);
    const src = campaign?.thumbnail && !failed ? campaign.thumbnail : '';
    return (
        <div className={cn('relative overflow-hidden bg-pink-500/10 dark:bg-neon-pink/10', className)}>
            {src ? (
                <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
            ) : (
                <Target size={iconSize} className="absolute inset-0 m-auto text-pink-500 dark:text-neon-pink" />
            )}
        </div>
    );
};

export const BrandMark = ({ campaign, size = 20 }) => {
    if (!campaign?.brand && !campaign?.brandLogo) return null;
    return (
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-gray-500 dark:text-zinc-400">
            {campaign.brandLogo && (
                <img src={campaign.brandLogo} alt="" className="shrink-0 rounded-md bg-white object-contain p-0.5 ring-1 ring-black/5 dark:ring-white/10" style={{ width: size, height: size }} />
            )}
            {campaign.brand && <span className="truncate">{campaign.brand}</span>}
        </span>
    );
};

/** Square checkbox with a 40px tap area. `mixed` shows a dash. */
export const CheckBox = ({ checked, mixed, onChange, label, className }) => (
    <button
        type="button"
        role="checkbox"
        aria-checked={mixed ? 'mixed' : checked}
        aria-label={label}
        onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
        className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', className)}
    >
        <span className={cn(
            'flex h-5 w-5 items-center justify-center rounded-md border transition-colors',
            checked || mixed ? 'border-pink-500 bg-pink-500 text-white dark:border-neon-pink dark:bg-neon-pink dark:text-black' : 'border-black/20 bg-white dark:border-white/20 dark:bg-white/5'
        )}>
            {mixed ? <Minus size={13} strokeWidth={3} /> : checked ? <Check size={13} strokeWidth={3} /> : null}
        </span>
    </button>
);

export const Spinner = ({ className }) => (
    <span className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent', className)} aria-hidden="true" />
);

/**
 * Small centred confirm. `toggle` adds one on/off option ({ label, hint, value, onChange }).
 * onConfirm may be async; the button shows progress and can't be pressed twice.
 */
export const ConfirmSheet = ({ open, onClose, title, message, confirmLabel = 'Confirm', tone = 'primary', onConfirm, toggle, children, busy: busyProp }) => {
    const [busy, setBusy] = useState(false);
    const working = busy || busyProp;
    const run = async () => {
        if (working) return;
        setBusy(true);
        try {
            await onConfirm?.();
        } finally {
            setBusy(false);
        }
    };
    return (
        <Sheet
            open={open}
            onClose={working ? () => {} : onClose}
            title={title}
            variant="dialog"
            size="sm"
            footer={(
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={working} className="h-11 flex-1 sm:flex-none">Cancel</Button>
                    <Button variant={tone} onClick={run} disabled={working} className="h-11 flex-1">
                        {working && <Spinner />} {confirmLabel}
                    </Button>
                </div>
            )}
        >
            <div className="space-y-4">
                {message && <div className="text-[14px] leading-relaxed text-gray-600 dark:text-zinc-300">{message}</div>}
                {children}
                {toggle && (
                    <div className="rounded-xl border border-black/[0.06] px-3.5 py-2.5 dark:border-white/[0.08]">
                        <Toggle label={toggle.label} hint={toggle.hint} checked={toggle.value} onChange={toggle.onChange} />
                    </div>
                )}
            </div>
        </Sheet>
    );
};

/** A label/value row used in detail panels. */
export const InfoRow = ({ icon: Icon, label, children }) => (
    <div className="flex items-start gap-3 py-2.5">
        {Icon && <Icon size={15} className="mt-0.5 shrink-0 text-gray-400" />}
        <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-gray-500">{label}</p>
            <div className="mt-0.5 break-words text-[14px] font-medium">{children}</div>
        </div>
    </div>
);
