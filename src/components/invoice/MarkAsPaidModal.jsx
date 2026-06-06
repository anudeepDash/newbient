import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import X from 'lucide-react/dist/esm/icons/x';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { cn } from '../../lib/utils';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 350 },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 20,
    transition: { duration: 0.2 },
  },
};

const confettiColors = ['#39FF14', '#00D1FF', '#FFD700', '#FF6B6B', '#A78BFA'];

function ConfettiParticle({ index }) {
  const color = confettiColors[index % confettiColors.length];
  const xStart = Math.random() * 300 - 150;
  const xEnd = xStart + (Math.random() * 80 - 40);
  const yEnd = -(Math.random() * 250 + 100);
  const rotation = Math.random() * 720 - 360;
  const size = Math.random() * 6 + 4;
  const delay = Math.random() * 0.3;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        left: '50%',
        bottom: '40%',
      }}
      initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
      animate={{
        opacity: [1, 1, 0],
        x: [0, xStart, xEnd],
        y: [0, yEnd * 0.6, yEnd],
        rotate: [0, rotation],
        scale: [1, 1.2, 0.5],
      }}
      transition={{
        duration: 1.4,
        delay,
        ease: 'easeOut',
      }}
    />
  );
}

export default function MarkAsPaidModal({ isOpen, onClose, invoice, onSubmit }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ip, setIp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // Auto-fetch client IP
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch('https://api.ipify.org?format=json')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.ip) setIp(data.ip);
      })
      .catch(() => {
        // IP is optional, fail silently
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmail('');
      setIsSubmitting(false);
      setIsSuccess(false);
      setErrors({});
    }
  }, [isOpen]);

  // Auto-close after success
  useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [isSuccess, onClose]);

  const validate = useCallback(() => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Full name is required';
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Enter a valid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        ip,
        userAgent: navigator.userAgent,
        claimedAt: new Date().toISOString(),
      });
      setIsSuccess(true);
    } catch {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={!isSubmitting && !isSuccess ? onClose : undefined}
          />

          {/* Modal card */}
          <motion.div
            className={cn(
              'relative w-full max-w-lg',
              'bg-zinc-900 border border-white/10 rounded-[3rem] shadow-2xl',
              'overflow-hidden'
            )}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Close button */}
            {!isSubmitting && !isSuccess && (
              <button
                onClick={onClose}
                className={cn(
                  'absolute -top-3 -right-3 z-10',
                  'w-10 h-10 rounded-full',
                  'bg-zinc-800 border border-white/10',
                  'flex items-center justify-center',
                  'text-gray-400 hover:text-white hover:bg-zinc-700',
                  'transition-colors duration-200'
                )}
              >
                <X size={16} />
              </button>
            )}

            <AnimatePresence mode="wait">
              {isSuccess ? (
                /* ─── Success State ─── */
                <motion.div
                  key="success"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative flex flex-col items-center justify-center px-10 py-16 text-center"
                >
                  {/* Confetti particles */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <ConfettiParticle key={i} index={i} />
                    ))}
                  </div>

                  {/* Checkmark */}
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      damping: 12,
                      stiffness: 200,
                      delay: 0.1,
                    }}
                    className="mb-6"
                  >
                    <div className="w-20 h-20 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center">
                      <CheckCircle size={40} className="text-[#39FF14]" />
                    </div>
                  </motion.div>

                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white mb-2"
                  >
                    Verification Request Sent
                  </motion.h3>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="text-sm text-gray-400"
                  >
                    Our team will verify and update shortly
                  </motion.p>
                </motion.div>
              ) : (
                /* ─── Form State ─── */
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-10 py-10"
                >
                  {/* Header */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle size={16} className="text-[#39FF14]" />
                      <span className="text-[10px] font-black text-[#39FF14] uppercase tracking-widest">
                        Payment Confirmation
                      </span>
                    </div>

                    <h2 className="text-4xl font-black font-heading tracking-tighter uppercase italic text-white mb-3">
                      Confirm Payment
                    </h2>

                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-sm text-gray-500 font-medium">
                        {invoice?.invoiceNumber || 'Invoice'}
                      </span>
                      <span className="text-lg font-black text-[#39FF14]">
                        {formatCurrency(invoice?.total ?? invoice?.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Full Name */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                        }}
                        placeholder="Enter your full name"
                        disabled={isSubmitting}
                        className={cn(
                          'w-full h-14 px-5',
                          'bg-black/50 border rounded-2xl',
                          'text-white text-sm placeholder:text-gray-600',
                          'outline-none transition-colors duration-200',
                          'focus:border-[#39FF14]/30 focus:ring-1 focus:ring-[#39FF14]/10',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          errors.name ? 'border-red-500/50' : 'border-white/5'
                        )}
                      />
                      {errors.name && (
                        <p className="mt-1.5 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                          {errors.name}
                        </p>
                      )}
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                        }}
                        placeholder="you@example.com"
                        disabled={isSubmitting}
                        className={cn(
                          'w-full h-14 px-5',
                          'bg-black/50 border rounded-2xl',
                          'text-white text-sm placeholder:text-gray-600',
                          'outline-none transition-colors duration-200',
                          'focus:border-[#39FF14]/30 focus:ring-1 focus:ring-[#39FF14]/10',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          errors.email ? 'border-red-500/50' : 'border-white/5'
                        )}
                      />
                      {errors.email && (
                        <p className="mt-1.5 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={cn(
                        'w-full h-16 mt-3 rounded-2xl',
                        'bg-[#39FF14] text-black',
                        'font-black uppercase tracking-[0.2em] text-sm',
                        'shadow-[0_10px_30px_rgba(57,255,20,0.2)]',
                        'hover:shadow-[0_15px_40px_rgba(57,255,20,0.3)]',
                        'active:scale-[0.98]',
                        'transition-all duration-200',
                        'flex items-center justify-center gap-2',
                        'disabled:opacity-60 disabled:cursor-not-allowed'
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        'Confirm Payment'
                      )}
                    </button>
                  </form>

                  {/* Disclaimer */}
                  <p className="mt-6 text-[10px] text-gray-600 text-center leading-relaxed">
                    By confirming, you declare that payment has been made for this
                    invoice. Our team will verify the transaction.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
