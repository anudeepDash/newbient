import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import User from 'lucide-react/dist/esm/icons/user';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Clock from 'lucide-react/dist/esm/icons/clock';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import ShieldX from 'lucide-react/dist/esm/icons/shield-x';

const statusConfig = {
  pending: {
    bg: 'bg-yellow-500/5',
    border: 'border-yellow-500/20',
    badgeBg: 'bg-yellow-500/10',
    badgeText: 'text-yellow-500',
    badgeBorder: 'border-yellow-500/20',
    icon: AlertTriangle,
    label: 'PENDING',
  },
  approved: {
    bg: 'bg-[#39FF14]/5',
    border: 'border-[#39FF14]/20',
    badgeBg: 'bg-[#39FF14]/10',
    badgeText: 'text-[#39FF14]',
    badgeBorder: 'border-[#39FF14]/20',
    icon: ShieldCheck,
    label: 'APPROVED',
  },
  declined: {
    bg: 'bg-red-500/5',
    border: 'border-red-500/20',
    badgeBg: 'bg-red-500/10',
    badgeText: 'text-red-500',
    badgeBorder: 'border-red-500/20',
    icon: ShieldX,
    label: 'DECLINED',
  },
};

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
          {label}
        </p>
        <p className="text-xs font-bold text-white truncate">{value}</p>
      </div>
    </div>
  );
}

export default function PaymentClaimReview({ invoice, onApprove, onDecline }) {
  const [loading, setLoading] = useState(null); // 'approve' | 'decline' | null

  const claim = invoice?.paymentClaim;
  if (!claim) return null;

  const status = claim.status || 'pending';
  const config = statusConfig[status] || statusConfig.pending;
  const StatusIcon = config.icon;
  const isResolved = status === 'approved' || status === 'declined';

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this payment claim?')) return;
    try {
      setLoading('approve');
      await onApprove();
    } finally {
      setLoading(null);
    }
  };

  const handleDecline = async () => {
    if (!window.confirm('Are you sure you want to decline this payment claim?')) return;
    try {
      setLoading('decline');
      await onDecline();
    } finally {
      setLoading(null);
    }
  };

  const formattedDate = claim.claimedAt
    ? new Date(claim.claimedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn('p-6 rounded-2xl border', config.bg, config.border)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/70">
          Payment Claim
        </h3>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest',
            config.badgeBg,
            config.badgeText,
            config.badgeBorder
          )}
        >
          <StatusIcon className="w-3 h-3" />
          {config.label}
        </span>
      </div>

      {/* Details Card */}
      <div className="space-y-3.5 bg-black/30 rounded-xl p-4 border border-white/5 mb-5">
        <DetailRow icon={User} label="Name" value={claim.name || '—'} />
        <DetailRow icon={Mail} label="Email" value={claim.email || '—'} />
        <DetailRow icon={Globe} label="IP Address" value={claim.ip || '—'} />
        <DetailRow
          icon={Smartphone}
          label="Browser / Device"
          value={claim.userAgent || '—'}
        />
        <DetailRow icon={Clock} label="Claimed At" value={formattedDate} />
      </div>

      {/* Actions or Resolved State */}
      {isResolved ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            'flex items-center justify-center gap-2 py-3 rounded-xl border',
            status === 'approved'
              ? 'bg-[#39FF14]/5 border-[#39FF14]/20'
              : 'bg-red-500/5 border-red-500/20'
          )}
        >
          {status === 'approved' ? (
            <CheckCircle className="w-4 h-4 text-[#39FF14]" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
          <span
            className={cn(
              'text-[10px] font-black uppercase tracking-widest',
              status === 'approved' ? 'text-[#39FF14]' : 'text-red-500'
            )}
          >
            {status === 'approved' ? 'Payment Approved' : 'Claim Declined'}
          </span>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleApprove}
            disabled={loading !== null}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl',
              'bg-[#39FF14] text-black font-black uppercase tracking-widest text-[10px]',
              'transition-opacity duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading === 'approve' ? (
              <motion.div
                className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {loading === 'approve' ? 'Approving…' : 'Approve Payment'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDecline}
            disabled={loading !== null}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl',
              'bg-red-500/10 text-red-500 border border-red-500/20',
              'font-black uppercase tracking-widest text-[10px]',
              'transition-opacity duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading === 'decline' ? (
              <motion.div
                className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {loading === 'decline' ? 'Declining…' : 'Decline Claim'}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
