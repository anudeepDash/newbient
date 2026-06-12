import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import X from 'lucide-react/dist/esm/icons/x';
import Send from 'lucide-react/dist/esm/icons/send';
import Monitor from 'lucide-react/dist/esm/icons/monitor';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Mail from 'lucide-react/dist/esm/icons/mail';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Zap from 'lucide-react/dist/esm/icons/zap';
import { cn } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import StudioRichEditor from '../../components/ui/StudioRichEditor';
import { generateReceiptEmailHTML } from '../../lib/email';
import EmailPreviewIframe from '../../components/ui/EmailPreviewIframe';

const ReceiptEmailModal = ({ isOpen, onClose, receipt, onSend }) => {
    const verifyUrl = `${window.location.origin}/verify-payout?ref=${encodeURIComponent(receipt?.reference || 'N/A')}&amt=${receipt?.amount || 0}&payee=${encodeURIComponent(receipt?.receiverName || '')}${(receipt?.receiptUrl || receipt?.proofUrl) ? `&proof=${encodeURIComponent(receipt?.receiptUrl || receipt?.proofUrl)}` : ''}`;
    const defaultAmount = `${Number(receipt?.amount || 0).toLocaleString('en-IN')}`;

    const [emailData, setEmailData] = useState({
        to: receipt?.email || receipt?.payeeEmail || '',
        subject: `Payment Receipt: ₹${defaultAmount} paid to ${receipt?.receiverName || 'Payee'}`,
        headerText: 'Disbursement Voucher Approved',
        messageBody: `<p>Hi,</p>
<p>We have successfully processed and verified a payout of <strong>₹${defaultAmount}</strong> to <strong>${receipt?.receiverName || 'Payee'}</strong>.</p>
<p>Please find the official payout receipt attached below. You can also verify the transaction online by scanning the receipt QR code or clicking the button below.</p>
<p>Thank you!</p>
<p>Best regards,<br/>Newbi Entertainment</p>`,
        theme: 'dark'
    });

    const [viewMode, setViewMode] = useState('desktop');
    const [activeMobileTab, setActiveMobileTab] = useState('write');
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);

    // Reset state when receipt changes
    React.useEffect(() => {
        if (receipt && isOpen) {
            const amt = `${Number(receipt.amount || 0).toLocaleString('en-IN')}`;
            setEmailData({
                to: receipt.email || receipt.payeeEmail || '',
                subject: `Payment Receipt: ₹${amt} paid to ${receipt.receiverName || 'Payee'}`,
                headerText: 'Disbursement Voucher Approved',
                messageBody: `<p>Hi,</p>
<p>We have successfully processed and verified a payout of <strong>₹${amt}</strong> to <strong>${receipt.receiverName || 'Payee'}</strong>.</p>
<p>Please find the official payout receipt attached below. You can also verify the transaction online by scanning the receipt QR code or clicking the button below.</p>
<p>Thank you!</p>
<p>Best regards,<br/>Newbi Entertainment</p>`,
                theme: 'dark'
            });
            setStatus(null);
            setSending(false);
        }
    }, [receipt?.reference, receipt?.amount, isOpen]);

    const previewHtml = useMemo(() => {
        return generateReceiptEmailHTML({
            headerText: emailData.headerText,
            messageBody: emailData.messageBody,
            reference: receipt?.reference || 'N/A',
            receiverName: receipt?.receiverName || 'Payee',
            amount: defaultAmount,
            date: receipt?.date || '',
            paymentMode: receipt?.paymentMode || 'UPI',
            verifyUrl,
            theme: emailData.theme,
            isPreview: true
        });
    }, [emailData, receipt, defaultAmount, verifyUrl]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!emailData.to) {
            setStatus({ type: 'error', text: 'Please enter a recipient email address.' });
            return;
        }

        setSending(true);
        setStatus({ type: 'info', text: 'Sending receipt email...' });

        try {
            const htmlContent = generateReceiptEmailHTML({
                headerText: emailData.headerText,
                messageBody: emailData.messageBody,
                reference: receipt?.reference || 'N/A',
                receiverName: receipt?.receiverName || 'Payee',
                amount: defaultAmount,
                date: receipt?.date || '',
                paymentMode: receipt?.paymentMode || 'UPI',
                verifyUrl,
                theme: emailData.theme
            });

            await onSend({
                to: emailData.to,
                subject: emailData.subject,
                html: htmlContent
            });

            setStatus({ type: 'success', text: 'Receipt email sent successfully!' });
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            console.error('Send failed:', error);
            setStatus({ type: 'error', text: 'Failed to send email. Please try again.' });
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-7xl max-h-[90vh] overflow-hidden"
            >
                <Card className="bg-zinc-950 border-white/10 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 md:p-8 border-b border-white/5">
                        <div className="flex items-center gap-4 max-w-[calc(100%-48px)]">
                            <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green shrink-0">
                                <Mail size={22} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl md:text-2xl font-black font-heading tracking-tighter uppercase italic text-white truncate">
                                    Send <span className="text-neon-green">Receipt.</span>
                                </h2>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1 truncate select-all">
                                    {receipt?.reference || 'REF-N/A'} • {receipt?.receiverName}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all text-gray-400 shrink-0"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Mobile Tab Bar */}
                    <div className="lg:hidden flex border-b border-white/5 bg-zinc-950/60 backdrop-blur-2xl shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveMobileTab('write')}
                            className={cn(
                                "flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-center border-b-2 transition-all",
                                activeMobileTab === 'write'
                                    ? "border-neon-green text-neon-green bg-white/[0.02]"
                                    : "border-transparent text-gray-500 hover:text-white"
                            )}
                        >
                            Write
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveMobileTab('preview')}
                            className={cn(
                                "flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-center border-b-2 transition-all",
                                activeMobileTab === 'preview'
                                    ? "border-neon-green text-neon-green bg-white/[0.02]"
                                    : "border-transparent text-gray-500 hover:text-white"
                            )}
                        >
                            Preview
                        </button>
                    </div>

                    {/* Body: Composer + Preview */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 max-h-[calc(90vh-120px)] overflow-hidden">
                        {/* LEFT: Composer */}
                        <div className={cn(
                            "p-6 md:p-8 overflow-y-auto max-h-[calc(90vh-180px)] lg:max-h-[calc(90vh-120px)] border-r border-white/5 custom-scrollbar",
                            activeMobileTab === 'write' ? "block" : "hidden lg:block"
                        )}>
                            <form onSubmit={handleSend} className="space-y-6">
                                {/* Recipient */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                        <Mail size={12} className="text-neon-green" /> Recipient Email
                                    </label>
                                    <Input
                                        type="email"
                                        value={emailData.to}
                                        onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                                        placeholder="payee@example.com"
                                        className="h-14 bg-black/50 border-white/5 rounded-2xl text-sm font-bold focus:border-neon-green/30"
                                        required
                                    />
                                </div>

                                {/* Subject */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                                        Subject Line
                                    </label>
                                    <Input
                                        value={emailData.subject}
                                        onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                                        placeholder="Payment Receipt: ₹0"
                                        className="h-14 bg-black/50 border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-white/20"
                                        required
                                    />
                                </div>

                                {/* Header */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                                        Email Header
                                    </label>
                                    <Input
                                        value={emailData.headerText}
                                        onChange={(e) => setEmailData({ ...emailData, headerText: e.target.value })}
                                        placeholder="Disbursement Voucher Approved"
                                        className="h-14 bg-black/50 border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-white/20"
                                    />
                                </div>

                                {/* Message Body */}
                                <div className="space-y-3">
                                    <StudioRichEditor
                                        label="Email Message"
                                        value={emailData.messageBody}
                                        onChange={(val) => setEmailData({ ...emailData, messageBody: val })}
                                        placeholder="Compose your message to the payee..."
                                        minHeight="200px"
                                        accentColor="neon-green"
                                    />
                                </div>

                                {/* Theme Toggle */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                                        Email Theme
                                    </label>
                                    <div className="flex gap-3 h-12 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                                        <button
                                            type="button"
                                            onClick={() => setEmailData({ ...emailData, theme: 'light' })}
                                            className={cn(
                                                "flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                emailData.theme === 'light' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
                                            )}
                                        >
                                            Light
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEmailData({ ...emailData, theme: 'dark' })}
                                            className={cn(
                                                "flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                emailData.theme === 'dark' ? "bg-zinc-800 text-white shadow-lg" : "text-gray-500 hover:text-white"
                                            )}
                                        >
                                            Dark
                                        </button>
                                    </div>
                                </div>

                                {/* Receipt Info Card */}
                                <div className="p-5 rounded-2xl bg-neon-green/5 border border-neon-green/10">
                                    <div className="flex items-center gap-3 mb-3">
                                        <FileText size={16} className="text-neon-green" />
                                        <span className="text-[10px] font-black text-neon-green uppercase tracking-widest">
                                            Attached Receipt Details
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                                        <div>
                                            <span className="text-gray-500 font-bold uppercase tracking-widest">Reference</span>
                                            <p className="text-white font-black mt-0.5">{receipt?.reference || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 font-bold uppercase tracking-widest">Amount</span>
                                            <p className="text-white font-black mt-0.5">₹{defaultAmount}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 font-bold uppercase tracking-widest">Payee</span>
                                            <p className="text-white font-black mt-0.5 truncate">{receipt?.receiverName || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 font-bold uppercase tracking-widest">Link</span>
                                            <p className="text-neon-green font-black mt-0.5 truncate text-[8px]">/verify-payout?ref={receipt?.reference?.slice(0, 8)}...</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <AnimatePresence>
                                    {status && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className={cn(
                                                "p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-3",
                                                status.type === 'success' ? "bg-neon-green/10 border-neon-green/20 text-neon-green" :
                                                status.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                                "bg-white/5 border-white/10 text-gray-400"
                                            )}
                                        >
                                            {status.type === 'success' ? <CheckCircle size={14} /> : <Zap size={14} />}
                                            {status.text}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Send Button */}
                                <Button
                                    type="submit"
                                    disabled={sending || !emailData.to}
                                    className="w-full h-16 bg-neon-green text-black font-black font-heading uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(57,255,20,0.2)] hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Send Receipt Email
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>

                        {/* RIGHT: Live Preview */}
                        <div className={cn(
                            "bg-zinc-900/40 max-h-[calc(90vh-180px)] lg:max-h-[calc(90vh-120px)]",
                            activeMobileTab === 'preview' ? "flex flex-col flex-1" : "hidden lg:flex lg:flex-col"
                        )}>
                            {/* Preview Header */}
                            <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <Mail size={12} className="text-neon-green" /> Live Preview
                                </h3>
                                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('desktop')}
                                        className={cn("p-2 rounded-lg transition-all", viewMode === 'desktop' ? "bg-white text-black" : "text-gray-500 hover:text-white")}
                                    >
                                        <Monitor size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('mobile')}
                                        className={cn("p-2 rounded-lg transition-all", viewMode === 'mobile' ? "bg-white text-black" : "text-gray-500 hover:text-white")}
                                    >
                                        <Smartphone size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Preview Content */}
                            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar flex justify-center">
                                <div className={cn(
                                    "transition-all duration-500 rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl h-fit",
                                    viewMode === 'mobile' ? "w-[360px]" : "w-full",
                                    emailData.theme === 'dark' ? "bg-black" : "bg-white"
                                )}>
                                    <EmailPreviewIframe html={previewHtml} />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </motion.div>
        </div>,
        document.body
    );
};

export default ReceiptEmailModal;
