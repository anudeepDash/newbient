import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import User from 'lucide-react/dist/esm/icons/user';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Building from 'lucide-react/dist/esm/icons/building';
import Info from 'lucide-react/dist/esm/icons/info';

import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const PayeeRegistration = () => {
    useStoreSubscription(['financePayees']);
    const { addFinancePayee, updateFinancePayee, financePayees } = useStore();
    const [searchParams] = useSearchParams();

    // Query parameters
    const paramType = searchParams.get('type') || '';
    const paramEvent = searchParams.get('event') || '';
    
    // States
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [type, setType] = useState('Volunteer'); // Volunteer, Vendor, Salary, Artist
    const [paymentMode, setPaymentMode] = useState('UPI'); // UPI, Bank Transfer, Other
    const [upiId, setUpiId] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [otherDetails, setOtherDetails] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Sync query params
    useEffect(() => {
        if (paramType) {
            const lowerType = paramType.toLowerCase();
            if (lowerType === 'volunteer') setType('Volunteer');
            else if (lowerType === 'vendor') setType('Vendor');
            else if (lowerType === 'salary') setType('Salary');
            else if (lowerType === 'artist') setType('Artist');
        }
    }, [paramType]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !email || !phone) {
            useStore.getState().addToast('Please fill in all required fields.', 'error');
            return;
        }

        // Validate details based on mode
        let destinationDetails = '';
        if (paymentMode === 'UPI') {
            if (!upiId) {
                useStore.getState().addToast('Please provide a UPI ID.', 'error');
                return;
            }
            destinationDetails = `UPI: ${upiId.trim()}`;
        } else if (paymentMode === 'Bank Transfer') {
            if (!bankName || !accountNumber || !ifscCode) {
                useStore.getState().addToast('Please fill all Bank details.', 'error');
                return;
            }
            destinationDetails = `Bank: ${bankName.trim()} | A/C: ${accountNumber.trim()} | IFSC: ${ifscCode.trim()}`;
        } else {
            destinationDetails = otherDetails.trim() || 'Details to be provided manually';
        }

        setLoading(true);
        try {
            const emailLower = email.trim().toLowerCase();
            const phoneTrimmed = phone.trim();
            const existingPayee = financePayees.find(p => 
                (p.email && p.email.toLowerCase() === emailLower) || 
                (p.phone && p.phone.trim() === phoneTrimmed)
            );

            const payeeData = {
                name: name.trim(),
                email: emailLower,
                phone: phoneTrimmed,
                type,
                paymentMode,
                upiId: paymentMode === 'UPI' ? upiId.trim() : '',
                bankDetails: paymentMode === 'Bank Transfer' ? { bankName: bankName.trim(), accountNumber: accountNumber.trim(), ifscCode: ifscCode.trim() } : null,
                destinationDetails,
                notes: notes.trim(),
                linkedGig: paramEvent ? paramEvent.trim() : (existingPayee?.linkedGig || ''),
                status: 'Approved',
            };

            if (existingPayee) {
                await updateFinancePayee(existingPayee.id, {
                    ...payeeData,
                    updatedAt: new Date().toISOString()
                });
                useStore.getState().addToast('Payment details updated for existing registration!', 'success');
            } else {
                await addFinancePayee({
                    ...payeeData,
                    createdAt: new Date().toISOString()
                });
                useStore.getState().addToast('Payment mode registered successfully!', 'success');
            }
            setIsSubmitted(true);
        } catch (err) {
            console.error(err);
            useStore.getState().addToast('Failed to submit details. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setName('');
        setEmail('');
        setPhone('');
        setPaymentMode('UPI');
        setUpiId('');
        setBankName('');
        setAccountNumber('');
        setIfscCode('');
        setOtherDetails('');
        setNotes('');
        setIsSubmitted(false);
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white flex flex-col justify-center items-center pt-48 md:pt-56 pb-20 px-4 relative overflow-hidden selection:bg-neon-green selection:text-black">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-neon-green/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] bg-neon-blue/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-xl z-10">
                <AnimatePresence mode="wait">
                    {!isSubmitted ? (
                        <motion.div
                            key="form-container"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="text-center mb-8">
                                <h1 className="text-4xl font-black font-heading tracking-tighter uppercase italic text-white leading-none">
                                    PAYOUT <span className="text-neon-green">REGISTRATION.</span>
                                </h1>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2 leading-relaxed">
                                    Provide your details below to set up direct payouts and disbursements
                                </p>
                            </div>

                            <Card className="p-8 md:p-10 bg-zinc-950/80 border-white/5 rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl border">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    
                                    {/* Role Read-only Badge (Set dynamically from Link parameters) */}
                                    <div className="flex justify-center mb-4">
                                        <span className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-zinc-900/60 border border-white/5 text-neon-green">
                                            Role Type: {type === 'Volunteer' ? 'Volunteer' : type === 'Vendor' ? 'Vendor / Partner' : type === 'Salary' ? 'Team Member' : 'Artist / Creator'}
                                        </span>
                                    </div>

                                    {type === 'Volunteer' && paramEvent && (
                                        <div className="p-4 bg-neon-green/5 border border-neon-green/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-center">
                                            <span className="text-gray-500 block">Registered Event Gig</span>
                                            <span className="text-white mt-1 block select-all">{paramEvent}</span>
                                        </div>
                                    )}

                                    {/* Personal Info */}
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Full Name / Entity Name *</label>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Enter your full name or legal entity name"
                                            className="h-12 border-white/10 bg-white/5 focus:border-neon-green"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Email Address *</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-neon-green transition-colors" size={14} />
                                                <Input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="Enter email address"
                                                    className="h-12 pl-12 border-white/10 bg-white/5 focus:border-neon-green"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Phone Number *</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-neon-green transition-colors" size={14} />
                                                <Input
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="Enter phone number"
                                                    className="h-12 pl-12 border-white/10 bg-white/5 focus:border-neon-green"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <hr className="border-white/5 my-6" />

                                    {/* Payment Mode Toggles */}
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Preferred Payment Mode *</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['UPI', 'Bank Transfer', 'Other'].map((mode) => (
                                                <button
                                                    key={mode}
                                                    type="button"
                                                    onClick={() => setPaymentMode(mode)}
                                                    className={`py-3 px-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${
                                                        paymentMode === mode
                                                            ? 'bg-neon-green/10 text-neon-green border-neon-green/30 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                                                            : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/10 hover:text-white'
                                                    }`}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Conditional Input Fields */}
                                    <AnimatePresence mode="wait">
                                        {paymentMode === 'UPI' && (
                                            <motion.div
                                                key="upi-input"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-1.5 overflow-hidden"
                                            >
                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">UPI ID *</label>
                                                <Input
                                                    value={upiId}
                                                    onChange={(e) => setUpiId(e.target.value)}
                                                    placeholder="Enter UPI ID (e.g., username@bank)"
                                                    className="h-12 border-white/10 bg-white/5 focus:border-neon-green"
                                                    required
                                                />
                                            </motion.div>
                                        )}

                                        {paymentMode === 'Bank Transfer' && (
                                            <motion.div
                                                key="bank-inputs"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-4 overflow-hidden"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Bank Name *</label>
                                                        <Input
                                                            value={bankName}
                                                            onChange={(e) => setBankName(e.target.value)}
                                                            placeholder="Enter bank name"
                                                            className="h-12 border-white/10 bg-white/5 focus:border-neon-green"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">IFSC Code *</label>
                                                        <Input
                                                            value={ifscCode}
                                                            onChange={(e) => setIfscCode(e.target.value)}
                                                            placeholder="Enter IFSC code"
                                                            className="h-12 border-white/10 bg-white/5 focus:border-neon-green font-mono uppercase"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Account Number *</label>
                                                    <Input
                                                        value={accountNumber}
                                                        onChange={(e) => setAccountNumber(e.target.value)}
                                                        placeholder="Enter bank account number"
                                                        className="h-12 border-white/10 bg-white/5 focus:border-neon-green font-mono"
                                                        required
                                                    />
                                                </div>
                                            </motion.div>
                                        )}

                                        {paymentMode === 'Other' && (
                                            <motion.div
                                                key="other-inputs"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-1.5 overflow-hidden"
                                            >
                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payment Details / Custom Mode *</label>
                                                <Input
                                                    value={otherDetails}
                                                    onChange={(e) => setOtherDetails(e.target.value)}
                                                    placeholder="Enter international wire details or transfer info"
                                                    className="h-12 border-white/10 bg-white/5 focus:border-neon-green"
                                                    required
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Additional Notes</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Specify payout schedules, milestone releases, or additional notes..."
                                            className="w-full bg-white/5 border border-white/10 h-24 rounded-lg text-xs font-semibold p-4 text-white outline-none focus:border-neon-green placeholder:text-white/20 transition-all"
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            type="submit"
                                            className="w-full h-14 bg-neon-green/10 text-neon-green hover:bg-neon-green hover:text-black border border-neon-green/30 text-[10px] sm:text-xs rounded-xl font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(16,185,129,0.05)] transition-all"
                                            disabled={loading}
                                        >
                                            {loading ? 'SAVING PAYOUT DETAILS...' : 'SUBMIT PAYOUT DETAILS'}
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success-container"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.4 }}
                            className="w-full max-w-md mx-auto"
                        >
                            <Card className="p-8 md:p-10 bg-zinc-950/80 border-white/5 rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl border text-center">
                                <div className="flex flex-col items-center">
                                    {/* Success Ring with Glow */}
                                    <div className="relative mb-6">
                                        <div className="absolute inset-0 bg-neon-green/20 rounded-full blur-xl animate-pulse" />
                                        <div className="relative inline-flex items-center justify-center w-16 h-16 bg-neon-green/10 text-neon-green rounded-full border border-neon-green/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                            <CheckCircle size={32} className="stroke-[2]" />
                                        </div>
                                    </div>

                                    <h2 className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white mb-2">
                                        REGISTRATION <span className="text-neon-green">COMPLETE!</span>
                                    </h2>
                                    <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px] max-w-xs mx-auto mb-8 leading-relaxed">
                                        Your payment preferences have been updated. Our team will reference this information for future disbursements.
                                    </p>

                                    {/* Summary Display Box */}
                                    <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 mb-8 text-left space-y-3">
                                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-500 gap-4">
                                            <span>Registered Name</span>
                                            <span className="text-white text-right truncate max-w-[140px] sm:max-w-[200px]">{name}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-500 gap-4">
                                            <span>Payout Method</span>
                                            <span className="text-neon-green text-right">{paymentMode}</span>
                                        </div>
                                        {paymentMode === 'UPI' && upiId && (
                                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-500 gap-4">
                                                <span>UPI ID</span>
                                                <span className="text-white font-mono text-right truncate max-w-[140px] sm:max-w-[200px]">{upiId}</span>
                                            </div>
                                        )}
                                        {paymentMode === 'Bank Transfer' && bankName && (
                                            <>
                                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-500 gap-4">
                                                    <span>Bank Name</span>
                                                    <span className="text-white text-right truncate max-w-[140px] sm:max-w-[200px]">{bankName}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-500">
                                                    <span>A/C Number</span>
                                                    <span className="text-white font-mono text-right">
                                                        {accountNumber.length > 4 
                                                            ? `•••• •••• ${accountNumber.slice(-4)}` 
                                                            : accountNumber}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                        {paymentMode === 'Other' && otherDetails && (
                                            <div className="flex flex-col gap-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
                                                <span>Payout Instructions</span>
                                                <span className="text-white text-left font-mono break-all line-clamp-2 mt-1">{otherDetails}</span>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleReset}
                                        className="w-full h-12 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black uppercase tracking-widest text-[9px] rounded-xl border border-white/5 transition-all flex items-center justify-center gap-2"
                                    >
                                        Register Another Account
                                    </button>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default PayeeRegistration;
