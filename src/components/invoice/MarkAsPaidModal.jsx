import { useState, useEffect } from 'react';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle-2';
import Sheet from '../admin/Sheet';
import { cn } from '../../lib/utils';
import { invoiceBalance } from '../../lib/invoicing';
import { DOC_THEMES, TextField, DocButton, fmtMoney } from '../ui/docviewer/DocKit';

const METHODS = [
  { id: 'upi', label: 'UPI' },
  { id: 'bank', label: 'Bank transfer' },
  { id: 'gateway', label: 'Online link' },
  { id: 'other', label: 'Other' },
];

/*
 * "I've paid" from the public invoice page. Sends a claim for the team to
 * check; nothing is marked paid until an admin approves it.
 * amountDue: the balance the page shows. onSubmit({ name, email, method, transactionId, amount, ip, userAgent, claimedAt }).
 */
export default function MarkAsPaidModal({ isOpen, onClose, invoice, amountDue, onSubmit }) {
  const theme = DOC_THEMES.invoice;
  // The page passes what it shows as due; fall back to the stored totals.
  const due = Number(amountDue ?? (invoiceBalance(invoice) || invoice?.total || invoice?.amount)) || 0;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('upi');
  const [reference, setReference] = useState('');
  const [ip, setIp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;
    setName('');
    setEmail(invoice?.clientEmail || '');
    setMethod(invoice?.upiId ? 'upi' : 'bank');
    setReference('');
    setIsSubmitting(false);
    setIsSuccess(false);
    setError('');
    let cancelled = false;
    fetch('https://api.ipify.org?format=json')
      .then((res) => res.json())
      .then((data) => { if (!cancelled && data?.ip) setIp(data.ip); })
      .catch(() => { /* IP is optional */ });
    return () => { cancelled = true; };
  }, [isOpen, invoice?.clientEmail, invoice?.upiId]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ready = name.trim() && emailOk;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!name.trim()) { setError('Enter your name.'); return; }
    if (!emailOk) { setError('Enter a valid email so we can confirm.'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        method,
        transactionId: reference.trim() || null,
        amount: due,
        ip,
        userAgent: navigator.userAgent,
        claimedAt: new Date().toISOString(),
      });
      setIsSuccess(true);
    } catch {
      setIsSubmitting(false);
      setError("We couldn't send that. Check your connection and try again.");
    }
  };

  return (
    <Sheet
      open={isOpen}
      onClose={() => !isSubmitting && onClose()}
      variant="dialog"
      size="sm"
      zIndex={1000}
      title={isSuccess ? 'Thanks — we’ve got it' : 'Tell us you’ve paid'}
      subtitle={isSuccess ? undefined : `${invoice?.invoiceNumber ? `Invoice ${invoice.invoiceNumber} · ` : ''}${fmtMoney(due)}`}
      footer={isSuccess ? (
        <DocButton variant="dark" onClick={onClose} className="w-full">Done</DocButton>
      ) : (
        <div className="flex gap-2">
          <DocButton variant="secondary" onClick={onClose} disabled={isSubmitting} className="flex-1">Cancel</DocButton>
          <DocButton theme={theme} onClick={handleSubmit} busy={isSubmitting} disabled={!ready} className="flex-[2]">
            {isSubmitting ? 'Sending…' : 'Send for verification'}
          </DocButton>
        </div>
      )}
    >
      {isSuccess ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={34} />
          </span>
          <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-gray-600 dark:text-zinc-300">
            Our team will check the payment and mark this invoice paid. We’ll email <span className="font-semibold text-gray-900 dark:text-white">{email.trim()}</span> once it’s confirmed.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField theme={theme} label="Your name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" />
          <TextField theme={theme} label="Email" required type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
          <div>
            <span className="mb-1.5 block text-[12.5px] font-semibold text-gray-600 dark:text-zinc-300">How did you pay?</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {METHODS.map(m => (
                <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                  className={cn('h-10 rounded-xl border text-[13px] font-semibold transition-colors',
                    method === m.id ? cn(theme.soft, theme.border, theme.text) : 'border-black/10 text-gray-600 hover:bg-black/[0.03] dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/[0.05]')}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <TextField theme={theme} label={method === 'upi' ? 'UPI reference (UTR)' : 'Transaction reference'} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional, but it speeds things up" />
          {error && <p role="alert" className="text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>}
          <p className="text-[12px] leading-relaxed text-gray-500 dark:text-zinc-400">
            This doesn’t mark the invoice paid by itself — the team confirms it against the payment first.
          </p>
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      )}
    </Sheet>
  );
}
