import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import Printer from 'lucide-react/dist/esm/icons/printer';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Plus from 'lucide-react/dist/esm/icons/plus';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Eye from 'lucide-react/dist/esm/icons/eye';
import X from 'lucide-react/dist/esm/icons/x';
import Search from 'lucide-react/dist/esm/icons/search';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Download from 'lucide-react/dist/esm/icons/download';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import User from 'lucide-react/dist/esm/icons/user';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Award from 'lucide-react/dist/esm/icons/award';
import Layers from 'lucide-react/dist/esm/icons/layers';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Check from 'lucide-react/dist/esm/icons/check';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import Info from 'lucide-react/dist/esm/icons/info';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Send from 'lucide-react/dist/esm/icons/send';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import ReceiptEmailModal from '../../components/admin/ReceiptEmailModal';

import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const SpendsManagement = () => {
    const { spends, addSpend, updateSpend, deleteSpend, uploadToCloudinary, user, financePayees, invoices, upcomingEvents, addUpcomingEvent } = useStore();
    
    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [monthFilter, setMonthFilter] = useState(
        new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    );
    const [payoutTypeFilter, setPayoutTypeFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [accountFilter, setAccountFilter] = useState('All');
    const [viewMode, setViewMode] = useState('grid');

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(null);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);

    // Form fields
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [payoutType, setPayoutType] = useState('Salary'); // Salary, Volunteer Payout, Vendor Payout, Artist Fee, General Expense
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountType, setAccountType] = useState('newbi'); // newbi vs personal
    const [paymentMode, setPaymentMode] = useState('UPI'); // UPI, Bank Transfer, Cash, Card, Other
    const [status, setStatus] = useState('Paid'); // Paid vs Pending
    const [notes, setNotes] = useState('');
    const [receiptUrl, setReceiptUrl] = useState('');

    // Dynamic Extra Payout Fields
    const [receiverName, setReceiverName] = useState(''); // Recipient / core member name / artist / volunteer / vendor
    const [designation, setDesignation] = useState(''); // For Salaries
    const [salaryPeriod, setSalaryPeriod] = useState(''); // Month/Period (e.g. May 2026)
    const [volunteerPhone, setVolunteerPhone] = useState(''); // For volunteers
    const [linkedGig, setLinkedGig] = useState(''); // Linked event/volunteer gig reference
    const [paidTo, setPaidTo] = useState(''); // Vendor Name / payee name
    const [invoiceRef, setInvoiceRef] = useState(''); // Vendor invoice reference
    const [destinationDetails, setDestinationDetails] = useState(''); // UPI ID, bank account details

    // Linked Invoice Fields
    const [linkedInvoiceId, setLinkedInvoiceId] = useState('');
    const [linkedInvoiceNumber, setLinkedInvoiceNumber] = useState('');

    // Printer Modal states
    const [showPrinterModal, setShowPrinterModal] = useState(false);
    const [activeSlipData, setActiveSlipData] = useState(null);
    const [printerStage, setPrinterStage] = useState('verify'); // 'verify' | 'printing' | 'done'
    const [verificationUTR, setVerificationUTR] = useState('');
    const [showQR, setShowQR] = useState(false);
    const [verificationReceiptUrl, setVerificationReceiptUrl] = useState('');

    // Email Receipt Modal
    const [showEmailModal, setShowEmailModal] = useState(false);

    // Pay Now UPI flow inside Log Spend modal
    const [showUPIFlow, setShowUPIFlow] = useState(false);
    const [customUTR, setCustomUTR] = useState('');

    // Bulk Event Payout states
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [selectedBulkEvent, setSelectedBulkEvent] = useState('');
    const [bulkVolunteers, setBulkVolunteers] = useState([]);
    const [selectedVolunteerIds, setSelectedVolunteerIds] = useState([]);
    const [bulkPayoutAmount, setBulkPayoutAmount] = useState('500');
    const [bulkPaymentMode, setBulkPaymentMode] = useState('UPI');
    const [bulkAccountType, setBulkAccountType] = useState('newbi');
    const [bulkLinkedInvoiceId, setBulkLinkedInvoiceId] = useState('');
    const [bulkLinkedInvoiceNumber, setBulkLinkedInvoiceNumber] = useState('');
    const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
    const [bulkNotes, setBulkNotes] = useState('');
    const [bulkStep, setBulkStep] = useState(1);
    const [upiPayIndex, setUpiPayIndex] = useState(0);
    const [completedPayments, setCompletedPayments] = useState({});
    const [bulkNewEventName, setBulkNewEventName] = useState('');

    // Filter registered volunteers based on selected bulk event gig
    useEffect(() => {
        if (selectedBulkEvent) {
            const vols = financePayees.filter(p => p.type === 'Volunteer' && p.linkedGig === selectedBulkEvent);
            setBulkVolunteers(vols.map(v => ({ ...v, amount: bulkPayoutAmount })));
            setSelectedVolunteerIds(vols.map(v => v.id));
        } else {
            setBulkVolunteers([]);
            setSelectedVolunteerIds([]);
        }
    }, [selectedBulkEvent, financePayees]);

    // Update individual amounts if default bulk payout amount changes
    useEffect(() => {
        setBulkVolunteers(prev => prev.map(v => ({ ...v, amount: bulkPayoutAmount })));
    }, [bulkPayoutAmount]);

    const resetBulkForm = () => {
        setSelectedBulkEvent('');
        setBulkVolunteers([]);
        setSelectedVolunteerIds([]);
        setBulkPayoutAmount('500');
        setBulkPaymentMode('UPI');
        setBulkAccountType('newbi');
        setBulkLinkedInvoiceId('');
        setBulkLinkedInvoiceNumber('');
        setBulkDate(new Date().toISOString().split('T')[0]);
        setBulkNotes('');
        setBulkStep(1);
        setUpiPayIndex(0);
        setCompletedPayments({});
        setBulkNewEventName('');
    };

    const handleUpiPayClick = async () => {
        if (!activeSlipData) return;
        
        // Generate Transaction ID directly
        const autoTxnId = `UPI-TXN-${Date.now()}`;
        setVerificationUTR(autoTxnId);
        
        // Update status in the database to Paid (cleared)
        if (activeSlipData.id) {
            try {
                await updateSpend(activeSlipData.id, {
                    paymentRef: autoTxnId,
                    status: 'Paid'
                });
                setActiveSlipData(prev => ({ 
                    ...prev, 
                    reference: autoTxnId, 
                    status: 'Paid' 
                }));
                useStore.getState().addToast('Payment marked as cleared via UPI!', 'success');
            } catch (e) {
                console.error("Error updating upi spend status: ", e);
            }
        }
        
        // Trigger UPI app intent (using window.open)
        const pa = activeSlipData.destinationDetails ? activeSlipData.destinationDetails.replace('UPI:', '').trim() : '';
        const upiUrl = `upi://pay?pa=${pa}&pn=${encodeURIComponent(activeSlipData.receiverName)}&am=${activeSlipData.amount}&cu=INR`;
        window.open(upiUrl, '_self');
        
        // Go straight to the printing stage
        setPrinterStage('printing');
    };

    const handleViewReceiptSlip = (spend) => {
        const slip = {
            id: spend.id || '',
            date: new Date(spend.date).toLocaleString(),
            reference: spend.paymentRef && spend.paymentRef !== 'OFFLINE' ? spend.paymentRef : (spend.id || 'N/A'),
            payoutType: spend.payoutType || 'Expense',
            receiverName: spend.receiverName || spend.paidTo || 'N/A',
            paymentMode: spend.paymentMode || 'N/A',
            destinationDetails: spend.destinationDetails || '',
            amount: spend.amount,
            linkedGig: spend.linkedGig || '',
            isBulk: spend.isBulk || false,
            volunteers: spend.volunteers || null,
            status: spend.status || 'Paid',
            receiptUrl: spend.receiptUrl || ''
        };
        setActiveSlipData(slip);
        setVerificationUTR(spend.paymentRef && !spend.paymentRef.startsWith('TXN-') && !spend.paymentRef.startsWith('BULK-') ? spend.paymentRef : '');
        setShowQR(false);
        setVerificationReceiptUrl(spend.receiptUrl || '');
        if (spend.status === 'Paid') {
            setPrinterStage('printing');
        } else {
            setPrinterStage('verify');
        }
        setShowPrinterModal(true);
    };

    const getBankDetails = () => {
        if (!activeSlipData) return null;
        const payee = financePayees.find(p => p.name === activeSlipData.receiverName);
        if (payee?.bankDetails) {
            return payee.bankDetails;
        }
        const dest = activeSlipData.destinationDetails || '';
        if (dest.includes('Bank:') || dest.includes('A/C:') || dest.includes('IFSC:')) {
            const parts = dest.split('|').map(p => p.trim());
            const bankName = parts.find(p => p.startsWith('Bank:'))?.replace('Bank:', '')?.trim() || 'N/A';
            const accountNumber = parts.find(p => p.includes('A/C:'))?.replace('A/C:', '')?.trim() || 'N/A';
            const ifscCode = parts.find(p => p.includes('IFSC:'))?.replace('IFSC:', '')?.trim() || 'N/A';
            return { bankName, accountNumber, ifscCode };
        }
        return null;
    };

    const handleCopy = (text, label) => {
        navigator.clipboard.writeText(text);
        useStore.getState().addToast(`${label} copied!`, 'success');
    };

    const renderPrinterSlot = (statusText, statusColorClass) => (
        <div className="w-full max-w-[300px] relative select-none">
            {/* Printer Back Chassis - z-10 (behind paper) */}
            <div className="relative z-10 bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/10 rounded-t-3xl pt-5 px-5 pb-4 shadow-[inset_0_4px_12px_rgba(255,255,255,0.05),0_10px_25px_rgba(0,0,0,0.8)] flex flex-col items-center">
                <div className="flex justify-between items-center w-full px-2 mb-3 text-[8px] font-black uppercase tracking-widest text-gray-400 font-mono">
                    <span>NEWBI DISBURSEMENT TERMINAL</span>
                    <span className={`flex items-center gap-1.5 ${statusColorClass} font-mono`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColorClass.includes('green') ? 'bg-[#39ff14] shadow-[0_0_8px_#39ff14]' : 'bg-amber-500 animate-ping'}`} />
                        <span>{statusText}</span>
                    </span>
                </div>
                
                {/* Dark slot opening - the gap where paper comes out */}
                <div className="w-full h-4 bg-black rounded-full border border-zinc-800 relative shadow-[inset_0_4px_12px_rgba(0,0,0,1)]" />
            </div>

            {/* Front Lip / Cutter Bar Overlay - z-30 (in front of paper, clips over paper top edge) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2.5rem)]">
                {/* Glowing cutter bar */}
                <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-[#39ff14] to-transparent rounded-full shadow-[0_0_12px_rgba(57,255,20,0.6),0_0_4px_rgba(57,255,20,0.9)]" />
                {/* Thin metal lip below cutter */}
                <div className="w-full h-[2px] bg-gradient-to-r from-zinc-700 via-zinc-500 to-zinc-700 rounded-full mt-px" />
            </div>
        </div>
    );

    const renderThermalReceipt = (data, utrVal) => {
        if (!data) return null;
        const finalUTR = utrVal || data.reference || 'N/A';
        
        return (
            <div 
                id="thermal-receipt-body"
                className="w-[260px] bg-transparent text-white flex flex-col relative select-none"
                style={{
                    fontFamily: "Outfit, Inter, system-ui, sans-serif"
                }}
            >
                {/* Top Header Card */}
                <div className="bg-gradient-to-br from-[#06120a] via-[#0b2416] to-[#070b09] p-4 text-center text-white rounded-t-none relative overflow-hidden border-b border-[#39ff14]/25">
                    {/* Ambient gloss shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 -translate-x-full animate-[shimmer_2.5s_infinite]" />
                    
                    <img 
                        src="/logo_full.png" 
                        alt="Newbi Logo" 
                        className="h-5 object-contain mx-auto mb-1.5 filter brightness-0 invert"
                    />
                    <p className="text-[7px] font-black uppercase tracking-[0.3em] text-[#39ff14]">Disbursement Voucher</p>
                    <h4 className="text-xl font-black tracking-tight text-white mt-1.5 mb-0.5 drop-shadow-[0_2px_8px_rgba(57,255,20,0.35)]">
                        ₹{Number(data.amount).toLocaleString('en-IN')}
                    </h4>
                    <p className="text-[7px] font-mono text-white/70 tracking-wider">REF: {finalUTR}</p>
                </div>

                {/* Details Card Body */}
                <div className="bg-[#070b09] text-white px-5 pt-3 pb-2 flex flex-col relative border-x border-[#39ff14]/10">
                    <div className="space-y-2 text-[9px] uppercase font-bold text-gray-300">
                        <div className="flex justify-between items-center py-0.5">
                            <span className="text-gray-500 font-extrabold text-[7.5px] tracking-wider">Date</span>
                            <span className="text-white font-bold">{data.date}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-t border-white/5 pt-1.5">
                            <span className="text-gray-500 font-extrabold text-[7.5px] tracking-wider">Payee</span>
                            <span className="text-[#39ff14] font-bold">{data.receiverName}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-t border-white/5 pt-1.5">
                            <span className="text-gray-500 font-extrabold text-[7.5px] tracking-wider">Method</span>
                            <span className="text-[#39ff14] font-bold border border-[#39ff14]/20 bg-[#39ff14]/5 px-1.5 py-0.5 rounded text-[7.5px]">
                                {data.paymentMode}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-t border-white/5 pt-1.5 font-mono">
                            <span className="text-gray-500 font-extrabold text-[7.5px] tracking-wider font-sans uppercase">Txn ID / UTR</span>
                            <span className="text-white font-bold select-all tracking-normal text-right truncate max-w-[140px]">{finalUTR}</span>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-[#39ff14]/20 my-2.5" />

                    {/* Verification QR Code pointing to functional verification URL */}
                    <div className="flex flex-col items-center justify-center p-1.5 bg-white rounded-xl border border-white/10 w-fit mx-auto shadow-inner mb-2.5">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&color=020202&data=${encodeURIComponent(
                                `https://newbi.live/verify-payout?ref=${finalUTR}&amt=${data.amount}&payee=${encodeURIComponent(data.receiverName)}${(data.receiptUrl || data.proofUrl) ? `&proof=${encodeURIComponent(data.receiptUrl || data.proofUrl)}` : ''}`
                            )}`}
                            alt="Verification QR"
                            className="w-12 h-12 rounded-md"
                        />
                    </div>

                    {/* Glowing Verified Banner */}
                    <div className="text-center font-black text-[8px] tracking-[0.2em] text-[#39ff14] border border-[#39ff14]/30 bg-[#39ff14]/5 p-1.5 rounded-lg uppercase shadow-[0_0_12px_rgba(57,255,20,0.1)]">
                        ★ Verified & Paid ★
                    </div>
                </div>

                {/* Jagged Saw-tooth Bottom Edge SVG with Neon Glow */}
                <div className="w-full h-4 -mt-px select-none" style={{ filter: 'drop-shadow(0 1.5px 3px rgba(57,255,20,0.25))' }}>
                    <svg viewBox="0 0 300 14" preserveAspectRatio="none" className="w-full h-full block">
                        {/* Solid fill of the paper body extending into teeth */}
                        <path d="M 0 0 L 300 0 L 300 14 L 295 5 L 290 14 L 285 5 L 280 14 L 275 5 L 270 14 L 265 5 L 260 14 L 255 5 L 250 14 L 245 5 L 240 14 L 235 5 L 230 14 L 225 5 L 220 14 L 215 5 L 210 14 L 205 5 L 200 14 L 195 5 L 190 14 L 185 5 L 180 14 L 175 5 L 170 14 L 165 5 L 160 14 L 155 5 L 150 14 L 145 5 L 140 14 L 135 5 L 130 14 L 125 5 L 120 14 L 115 5 L 110 14 L 105 5 L 100 14 L 95 5 L 90 14 L 85 5 L 80 14 L 75 5 L 70 14 L 65 5 L 60 14 L 55 5 L 50 14 L 45 5 L 40 14 L 35 5 L 30 14 L 25 5 L 20 14 L 15 5 L 10 14 L 5 5 L 0 14 Z" fill="#070b09" />
                        {/* Glowing neon-green stroke on the jagged edge only */}
                        <path d="M 300 14 L 295 5 L 290 14 L 285 5 L 280 14 L 275 5 L 270 14 L 265 5 L 260 14 L 255 5 L 250 14 L 245 5 L 240 14 L 235 5 L 230 14 L 225 5 L 220 14 L 215 5 L 210 14 L 205 5 L 200 14 L 195 5 L 190 14 L 185 5 L 180 14 L 175 5 L 170 14 L 165 5 L 160 14 L 155 5 L 150 14 L 145 5 L 140 14 L 135 5 L 130 14 L 125 5 L 120 14 L 115 5 L 110 14 L 105 5 L 100 14 L 95 5 L 90 14 L 85 5 L 80 14 L 75 5 L 70 14 L 65 5 L 60 14 L 55 5 L 50 14 L 45 5 L 40 14 L 35 5 L 30 14 L 25 5 L 20 14 L 15 5 L 10 14 L 5 5 L 0 14" fill="none" stroke="#39ff14" strokeWidth="1" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>
        );
    };

    const handleDownloadReceipt = async () => {
        const receiptElement = document.getElementById('thermal-receipt-body');
        if (!receiptElement) return;

        try {
            const canvas = await html2canvas(receiptElement, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true
            });
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `newbi_receipt_${activeSlipData?.reference || 'payout'}.png`;
            link.href = imgData;
            link.click();
            useStore.getState().addToast('Receipt downloaded successfully!', 'success');
        } catch (err) {
            console.error(err);
            useStore.getState().addToast('Failed to download receipt image.', 'error');
        }
    };

    const handleShareReceiptText = async () => {
        if (!activeSlipData) return;
        
        const verifyUrl = `${window.location.origin}/verify-payout?ref=${encodeURIComponent(activeSlipData.reference || 'N/A')}&amt=${activeSlipData.amount}&payee=${encodeURIComponent(activeSlipData.receiverName)}${(activeSlipData.receiptUrl || activeSlipData.proofUrl) ? `&proof=${encodeURIComponent(activeSlipData.receiptUrl || activeSlipData.proofUrl)}` : ''}`;
        
        const message = `*NEWBI ENTERTAINMENT — PAYOUT RECEIPT*\n\n💰 Amount: ₹${Number(activeSlipData.amount).toLocaleString('en-IN')}\n👤 Payee: ${activeSlipData.receiverName}\n📋 Ref: ${activeSlipData.reference || 'N/A'}\n📅 Date: ${activeSlipData.date}\n✅ Status: VERIFIED & PAID\n\n🔗 Verify this payment:\n${verifyUrl}\n\n— Newbi Entertainment Pvt. Ltd.`;

        // Try to share with receipt PNG via Web Share API
        const receiptElement = document.getElementById('thermal-receipt-body');
        if (receiptElement && navigator.canShare) {
            try {
                const canvas = await html2canvas(receiptElement, {
                    backgroundColor: '#070b09',
                    scale: 2,
                    logging: false,
                    useCORS: true
                });
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const file = new File([blob], `newbi_receipt_${activeSlipData.reference || 'payout'}.png`, { type: 'image/png' });
                
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'Newbi Payout Receipt',
                        text: message,
                        files: [file]
                    });
                    return;
                }
            } catch (err) {
                if (err.name !== 'AbortError') console.error('Share failed:', err);
            }
        }
        
        // Fallback: text share or copy
        if (navigator.share) {
            navigator.share({
                title: 'Newbi Payout Receipt',
                text: message,
                url: verifyUrl
            }).catch(() => copyToClipboard(message));
        } else {
            copyToClipboard(message);
        }
    };

    const handleWhatsAppShare = () => {
        if (!activeSlipData) return;
        const verifyUrl = `${window.location.origin}/verify-payout?ref=${encodeURIComponent(activeSlipData.reference || 'N/A')}&amt=${activeSlipData.amount}&payee=${encodeURIComponent(activeSlipData.receiverName)}${(activeSlipData.receiptUrl || activeSlipData.proofUrl) ? `&proof=${encodeURIComponent(activeSlipData.receiptUrl || activeSlipData.proofUrl)}` : ''}`;
        const message = `*NEWBI ENTERTAINMENT — PAYOUT RECEIPT*\n\n💰 Amount: ₹${Number(activeSlipData.amount).toLocaleString('en-IN')}\n👤 Payee: ${activeSlipData.receiverName}\n📋 Ref: ${activeSlipData.reference || 'N/A'}\n📅 Date: ${activeSlipData.date}\n✅ Status: VERIFIED & PAID\n\n🔗 Verify: ${verifyUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleSendReceiptEmail = async ({ to, cc, bcc, subject, html }) => {
        try {
            const { auth } = await import('../../lib/firebase');
            const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
            const response = await fetch('/api/mail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    to,
                    cc,
                    bcc,
                    subject,
                    html,
                    fromName: 'Newbi Finance',
                    fromEmail: 'partnership@newbi.live'
                }),
            });
            const result = await response.json();
            if (result.success) {
                useStore.getState().addToast('Receipt email sent successfully!', 'success');
            } else {
                throw new Error(result.error || 'Failed to send email');
            }
        } catch (err) {
            console.error('Send receipt email failed:', err);
            useStore.getState().addToast("Couldn't send the email. Please try again.", 'error');
            throw err;
        }
    };

    const financeTabs = [
        { name: 'Overview', path: '/admin/finance', icon: LayoutGrid, color: 'text-[#39FF14]' },
        { name: 'Spends Ledger', path: '/admin/spends', icon: IndianRupee, color: 'text-neon-pink' },
        { name: 'Other Income', path: '/admin/other-income', icon: FileSpreadsheet, color: 'text-[#39FF14]' },
        { name: 'Payee Registry', path: '/admin/payees', icon: User, color: 'text-neon-blue' }
    ];

    // District Category Navigation setup
    const categories = [
        {
            name: 'Overview',
            desc: 'Liquidity Dashboard',
            info: 'Real-time metrics, cash flow graphs & indicators',
            path: '/admin/finance',
            icon: LayoutGrid,
            color: 'text-[#39FF14]',
            glow: 'hover:shadow-[0_0_30px_rgba(57,255,20,0.15)] hover:border-[#39FF14]/40',
            bgGradient: 'from-[#39FF14]/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-[#39FF14]/15',
            badge: 'COMMAND',
            active: false
        },
        {
            name: 'Spends Ledger',
            desc: 'Expenditures & Debits',
            info: 'Track payroll, supplier bills, and vendor payouts',
            path: '/admin/spends',
            icon: CreditCard,
            color: 'text-[#FF2E90]',
            glow: 'hover:shadow-[0_0_30px_rgba(255,46,144,0.15)] hover:border-[#FF2E90]/40',
            bgGradient: 'from-[#FF2E90]/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-[#FF2E90]/15',
            badge: 'DEBITS',
            active: true
        },
        {
            name: 'Other Income',
            desc: 'Revenue & Capital Inflow',
            info: 'Manage sponsorships, tickets, and external grants',
            path: '/admin/other-income',
            icon: FileSpreadsheet,
            color: 'text-[#39FF14]',
            glow: 'hover:shadow-[0_0_30px_rgba(57,255,20,0.15)] hover:border-[#39FF14]/40',
            bgGradient: 'from-[#39FF14]/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-[#39FF14]/15',
            badge: 'INFLOW',
            active: false
        },
        {
            name: 'Payee Registry',
            desc: 'Beneficiary Directory',
            info: 'Manage rosters of volunteers, retainers, and crews',
            path: '/admin/payees',
            icon: User,
            color: 'text-[#00F0FF]',
            glow: 'hover:shadow-[0_0_30px_rgba(0,240,255,0.15)] hover:border-[#00F0FF]/40',
            bgGradient: 'from-[#00F0FF]/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-[#00F0FF]/15',
            badge: 'REGISTRY',
            active: false
        }
    ];

    const payoutTypes = ['Salary', 'Volunteer Payout', 'Vendor Payout', 'Artist Fee', 'General Expense'];
    const paymentModes = ['UPI', 'Bank Transfer', 'Cash', 'Card', 'Other'];

    // Helper to extract month label
    const getMonthLabel = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    // Calculate month selector list dynamically
    const monthOptions = useMemo(() => {
        const months = new Set();
        months.add(new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        spends.forEach(sp => {
            const label = getMonthLabel(sp.createdAt || sp.date);
            if (label) months.add(label);
        });
        const sorted = Array.from(months).sort((a, b) => new Date(b) - new Date(a));
        return ['All Time', ...sorted];
    }, [spends]);

    // Filtering logic
    const filteredSpends = spends.filter(sp => {
        const matchesSearch = 
            sp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sp.receiverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sp.paidTo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sp.paidBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sp.linkedInvoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());

        const label = getMonthLabel(sp.createdAt || sp.date);
        const matchesMonth = monthFilter === 'All Time' ? true : label === monthFilter;
        
        const matchesPayoutType = payoutTypeFilter === 'All' ? true : (sp.payoutType || 'General Expense') === payoutTypeFilter;
        const matchesStatus = statusFilter === 'All' ? true : sp.status === statusFilter;
        const matchesAccount = accountFilter === 'All' ? true : sp.accountType === accountFilter;

        return matchesSearch && matchesMonth && matchesPayoutType && matchesStatus && matchesAccount;
    });

    // Central uploader helper
    const handleReceiptUpload = async (e, setUrl) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingReceipt(true);
        try {
            const url = await uploadToCloudinary(file);
            setUrl(url);
            useStore.getState().addToast('Receipt uploaded successfully!', 'success');
        } catch (err) {
            useStore.getState().addToast(err.message || 'Failed to upload receipt.', 'error');
        } finally {
            setUploadingReceipt(false);
        }
    };

    // Copy to clipboard helper
    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        useStore.getState().addToast('Payout info copied to clipboard!', 'success');
    };



    // Create Spend submission
    const handleCreateSpend = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        
        if (!title || !amount || !date) {
            useStore.getState().addToast('Please fill in all required fields.', 'error');
            return;
        }

        try {
            const newSpendRef = paymentMode === 'UPI' && customUTR ? customUTR : `TXN-${Date.now().toString().slice(-6)}`;
            const finalStatus = (paymentMode === 'UPI' && customUTR) ? 'Paid' : status;
            
            const spendData = {
                title,
                amount: Number(amount),
                payoutType,
                date,
                accountType,
                paymentMode,
                status: finalStatus,
                notes,
                receiptUrl,
                receiverName: payoutType === 'Salary' || payoutType === 'Volunteer Payout' || payoutType === 'Artist Fee' ? receiverName : paidTo,
                paidTo: payoutType === 'Vendor Payout' ? paidTo : receiverName,
                paidBy: accountType === 'personal' ? (receiverName || 'Team Member') : 'Newbi Core',
                designation: payoutType === 'Salary' ? designation : '',
                salaryPeriod: payoutType === 'Salary' ? salaryPeriod : '',
                volunteerPhone: payoutType === 'Volunteer Payout' ? volunteerPhone : '',
                linkedGig: payoutType === 'Volunteer Payout' || payoutType === 'Artist Fee' ? linkedGig : '',
                invoiceRef: payoutType === 'Vendor Payout' ? invoiceRef : '',
                destinationDetails,
                linkedInvoiceId: payoutType === 'Volunteer Payout' ? linkedInvoiceId : '',
                linkedInvoiceNumber: payoutType === 'Volunteer Payout' ? linkedInvoiceNumber : '',
                paymentRef: newSpendRef,
                createdAt: new Date().toISOString()
            };

            await addSpend(spendData);

            useStore.getState().addToast('Spend record added successfully.', 'success');
            setShowAddModal(false);
            
            // Only trigger receipt printer if status is Paid
            if (finalStatus === 'Paid') {
                const slip = {
                    date: new Date(date).toLocaleString(),
                    reference: newSpendRef,
                    payoutType,
                    receiverName: spendData.receiverName,
                    paymentMode,
                    destinationDetails,
                    amount: Number(amount),
                    linkedGig: spendData.linkedGig,
                    isBulk: false,
                    receiptUrl: receiptUrl || ''
                };
                setActiveSlipData(slip);
                setShowPrinterModal(true);
            }

            resetForm();
            setCustomUTR('');
            setShowUPIFlow(false);
        } catch (err) {
            console.error(err);
            useStore.getState().addToast('Failed to save spend. Please check database rules.', 'error');
        }
    };

    // Create Bulk Event Payout submission
    const handleCreateBulkPayout = async () => {
        if (!selectedBulkEvent || selectedVolunteerIds.length === 0) {
            useStore.getState().addToast('Please select an event and at least one volunteer.', 'error');
            return;
        }

        try {
            const bulkTransactionId = `BULK-${Date.now()}`;
            const promises = [];

            // Get selected volunteers with their custom amounts
            const targets = bulkVolunteers.filter(v => selectedVolunteerIds.includes(v.id));

            for (const vol of targets) {
                const p = addSpend({
                    title: `Volunteer Payout: ${selectedBulkEvent}`,
                    amount: Number(vol.amount || bulkPayoutAmount),
                    payoutType: 'Volunteer Payout',
                    date: bulkDate,
                    accountType: bulkAccountType,
                    paymentMode: bulkPaymentMode,
                    status: 'Paid',
                    notes: bulkNotes || `Bulk event payout clearance.`,
                    receiverName: vol.name,
                    paidTo: vol.name,
                    paidBy: bulkAccountType === 'personal' ? 'Team Member' : 'Newbi Core',
                    volunteerPhone: vol.phone || '',
                    linkedGig: selectedBulkEvent,
                    destinationDetails: vol.destinationDetails || `UPI: ${vol.upiId || ''}`,
                    linkedInvoiceId: bulkLinkedInvoiceId || '',
                    linkedInvoiceNumber: bulkLinkedInvoiceNumber || '',
                    paymentRef: bulkTransactionId,
                    createdAt: new Date().toISOString()
                });
                promises.push(p);
            }

            await Promise.all(promises);

            useStore.getState().addToast(`Successfully logged ${targets.length} volunteer payouts!`, 'success');
            
            // Set slip data to trigger receipt printer for the bulk txn
            const bulkSlip = {
                date: new Date().toLocaleString(),
                reference: bulkTransactionId,
                payoutType: 'Volunteer Payout',
                receiverName: `${targets.length} Volunteers (${selectedBulkEvent})`,
                paymentMode: bulkPaymentMode,
                destinationDetails: `${targets.length} cleared records`,
                amount: targets.reduce((sum, v) => sum + Number(v.amount || bulkPayoutAmount), 0),
                linkedGig: selectedBulkEvent,
                isBulk: true,
                volunteers: targets.map(t => ({ name: t.name, amount: Number(t.amount || bulkPayoutAmount) }))
            };
            
            setActiveSlipData(bulkSlip);
            setShowPrinterModal(true);
            setShowBulkModal(false);
            resetBulkForm();
        } catch (err) {
            console.error(err);
            useStore.getState().addToast('Failed to execute bulk payout log.', 'error');
        }
    };

    // Update Spend submission
    const handleUpdateSpend = async (e) => {
        e.preventDefault();
        if (!title || !amount || !date) {
            useStore.getState().addToast('Please fill in all required fields.', 'error');
            return;
        }

        try {
            const existingRef = showEditModal.paymentRef || `TXN-${Date.now().toString().slice(-6)}`;
            
            await updateSpend(showEditModal.id, {
                title,
                amount: Number(amount),
                payoutType,
                date,
                accountType,
                paymentMode,
                status,
                notes,
                receiptUrl,
                receiverName: payoutType === 'Salary' || payoutType === 'Volunteer Payout' || payoutType === 'Artist Fee' ? receiverName : paidTo,
                paidTo: payoutType === 'Vendor Payout' ? paidTo : receiverName,
                paidBy: accountType === 'personal' ? receiverName : 'Newbi Core',
                designation: payoutType === 'Salary' ? designation : '',
                salaryPeriod: payoutType === 'Salary' ? salaryPeriod : '',
                volunteerPhone: payoutType === 'Volunteer Payout' ? volunteerPhone : '',
                linkedGig: payoutType === 'Volunteer Payout' || payoutType === 'Artist Fee' ? linkedGig : '',
                invoiceRef: payoutType === 'Vendor Payout' ? invoiceRef : '',
                destinationDetails,
                linkedInvoiceId: payoutType === 'Volunteer Payout' ? linkedInvoiceId : '',
                linkedInvoiceNumber: payoutType === 'Volunteer Payout' ? linkedInvoiceNumber : '',
                paymentRef: status === 'Paid' ? existingRef : 'OFFLINE'
            });

            useStore.getState().addToast('Spend record updated.', 'success');
            setShowEditModal(null);
            resetForm();
        } catch (err) {
            useStore.getState().addToast('Failed to update spend record.', 'error');
        }
    };

    const handleDeleteSpend = (id) => {
        if (user?.role === 'editor' || user?.role === 'content_admin') {
            useStore.getState().addToast("Only administrators can delete spend records.", 'error');
            return;
        }

        if (window.confirm('Are you sure you want to delete this spend record?')) {
            deleteSpend(id);
            useStore.getState().addToast('Spend record purged.', 'success');
        }
    };

    const handleToggleStatus = async (spend) => {
        try {
            const newStatus = spend.status === 'Paid' ? 'Pending' : 'Paid';
            await updateSpend(spend.id, { status: newStatus });
            useStore.getState().addToast(`Spend marked as ${newStatus}.`, 'success');
        } catch (err) {
            useStore.getState().addToast('Failed to update spend status.', 'error');
        }
    };

    const resetForm = () => {
        setTitle('');
        setAmount('');
        setPayoutType('Salary');
        setDate(new Date().toISOString().split('T')[0]);
        setAccountType('newbi');
        setPaymentMode('UPI');
        setStatus('Paid');
        setNotes('');
        setReceiptUrl('');
        setReceiverName('');
        setDesignation('');
        setSalaryPeriod(new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        setVolunteerPhone('');
        setLinkedGig('');
        setPaidTo('');
        setInvoiceRef('');
        setDestinationDetails('');
        setLinkedInvoiceId('');
        setLinkedInvoiceNumber('');
    };

    const openEdit = (spend) => {
        setShowEditModal(spend);
        setTitle(spend.title || '');
        setAmount(spend.amount || '');
        setPayoutType(spend.payoutType || 'Salary');
        setDate(spend.date || new Date().toISOString().split('T')[0]);
        setAccountType(spend.accountType || 'newbi');
        setPaymentMode(spend.paymentMode || 'UPI');
        setStatus(spend.status || 'Paid');
        setNotes(spend.notes || '');
        setReceiptUrl(spend.receiptUrl || '');
        setReceiverName(spend.receiverName || spend.paidTo || '');
        setDesignation(spend.designation || '');
        setSalaryPeriod(spend.salaryPeriod || '');
        setVolunteerPhone(spend.volunteerPhone || '');
        setLinkedGig(spend.linkedGig || '');
        setPaidTo(spend.paidTo || spend.receiverName || '');
        setInvoiceRef(spend.invoiceRef || '');
        setDestinationDetails(spend.destinationDetails || '');
        setLinkedInvoiceId(spend.linkedInvoiceId || '');
        setLinkedInvoiceNumber(spend.linkedInvoiceNumber || '');
    };

    // CSV Exporter
    const handleExportCSV = () => {
        if (filteredSpends.length === 0) {
            useStore.getState().addToast('No records to export.', 'error');
            return;
        }

        const headers = ['Title', 'Amount (INR)', 'Payout Type', 'Date', 'Account Type', 'Paid By', 'Receiver Name', 'Paid To / Vendor', 'Payment Mode', 'Status', 'Notes', 'Recipient Details'];
        const rows = filteredSpends.map(sp => [
            `"${sp.title?.replace(/"/g, '""') || ''}"`,
            sp.amount || 0,
            sp.payoutType || 'General Expense',
            sp.date || '',
            sp.accountType === 'personal' ? 'Personal Account' : 'Newbi Official',
            `"${sp.paidBy || ''}"`,
            `"${sp.receiverName || ''}"`,
            `"${sp.paidTo || ''}"`,
            sp.paymentMode || '',
            sp.status || '',
            `"${sp.notes?.replace(/"/g, '""') || ''}"`,
            `"${sp.destinationDetails?.replace(/"/g, '""') || ''}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `newbi_spends_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <AdminCommunityHubLayout
            studioHeader={{
                title: 'SPENDS',
                subtitle: 'LEDGER',
                accentClass: 'text-neon-pink',
                icon: IndianRupee
            }}
            tabs={financeTabs}
            accentColor="neon-pink"
            action={
                <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                    <button
                        onClick={() => { resetBulkForm(); setShowBulkModal(true); }}
                        className="flex-1 md:flex-none h-11 md:h-12 px-4 md:px-6 bg-white/5 hover:bg-white/10 text-neon-blue hover:text-white font-black uppercase tracking-widest text-[8px] md:text-[9px] rounded-xl border border-neon-blue/20 hover:border-neon-blue/40 transition-all flex items-center justify-center gap-2"
                    >
                        <Layers size={14} /> Bulk Payout
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex-1 md:flex-none h-11 md:h-12 px-4 md:px-6 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black uppercase tracking-widest text-[8px] md:text-[9px] rounded-xl border border-white/5 transition-all flex items-center justify-center gap-2"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="flex-1 md:flex-none h-11 md:h-12 px-4 md:px-8 bg-neon-pink text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl shadow-[0_4px_12px_rgba(255,79,139,0.2)] hover:shadow-[0_8px_24px_rgba(255,79,139,0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-95"
                    >
                        <Plus size={16} /> Log Payout
                    </button>
                </div>
            }
        >
            <div className="space-y-8 relative">
                {/* Ambient Background Glow Blobs for Glassmorphism */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
                    <div className="absolute top-[15%] right-[5%] w-[350px] h-[350px] rounded-full bg-[#FF2E90]/5 blur-[120px] animate-pulse duration-[10000ms]" />
                    <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] rounded-full bg-[#00F0FF]/5 blur-[150px] animate-pulse duration-[8000ms]" />
                </div>

                {/* District Category Booking Tiles Navigation Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {categories.map((cat) => {
                        const IconComp = cat.icon;
                        return (
                            <Link 
                                key={cat.name} 
                                to={cat.path}
                                className={cn(
                                    "relative overflow-hidden group p-5 rounded-3xl border bg-gradient-to-br bg-zinc-900/40 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900/60 select-none",
                                    cat.borderColor,
                                    cat.glow,
                                    cat.active && "border-[#FF2E90]/40 bg-[#FF2E90]/5 shadow-[0_0_20px_rgba(255,46,144,0.06)]"
                                )}
                            >
                                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.03] transition-opacity duration-300 group-hover:opacity-[0.07]", cat.bgGradient)} />
                                <div className="flex justify-between items-start mb-4">
                                    <div className={cn("p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", cat.color)}>
                                        <IconComp size={16} />
                                    </div>
                                    <span className={cn(
                                        "text-[7px] font-black px-2 py-0.5 rounded-full tracking-widest border uppercase",
                                        cat.active 
                                            ? "bg-[#FF2E90]/10 text-[#FF2E90] border-[#FF2E90]/20" 
                                            : "bg-white/5 text-gray-500 border-white/5"
                                    )}>
                                        {cat.badge}
                                    </span>
                                </div>
                                <h4 className="text-xs font-black uppercase text-white tracking-wider mb-1">{cat.name}</h4>
                                <p className="text-[9px] font-bold text-gray-400 leading-snug line-clamp-1">{cat.desc}</p>
                                <p className="text-[8px] font-medium text-gray-600 leading-normal line-clamp-2 mt-1.5 group-hover:text-gray-500 transition-colors">{cat.info}</p>
                            </Link>
                        );
                    })}
                </div>

                {/* Advanced Command Filter Panel */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl md:rounded-[2.5rem] p-4 backdrop-blur-3xl space-y-4">
                    {/* First Row: Search & View modes */}
                    <div className="flex flex-col xl:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-pink transition-colors" size={18} />
                            <input 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by recipient name, vendor, note or title..."
                                className="w-full bg-zinc-900/40 hover:bg-zinc-900/60 h-14 pl-16 pr-6 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest outline-none transition-all placeholder:text-gray-600 border border-white/5 focus:border-neon-pink focus:shadow-[0_0_15px_rgba(255,79,139,0.1)]"
                            />
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-full xl:w-auto justify-center shrink-0">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "flex-1 xl:flex-none px-6 py-3 rounded-lg transition-all flex justify-center gap-2 text-[9px] font-black uppercase tracking-widest",
                                    viewMode === 'grid' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <LayoutGrid size={16} /> Grid
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    "flex-1 xl:flex-none px-6 py-3 rounded-lg transition-all flex justify-center gap-2 text-[9px] font-black uppercase tracking-widest",
                                    viewMode === 'table' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <FileText size={16} /> Table
                            </button>
                        </div>
                    </div>

                    {/* Second Row: Detailed filtration toggles */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                        {/* Month selection */}
                        <div className="space-y-1.5">
                            <span className="text-[8px] text-gray-500 tracking-widest">Select Month</span>
                            <select 
                                value={monthFilter} 
                                onChange={(e) => setMonthFilter(e.target.value)}
                                className="w-full bg-zinc-900/80 border border-white/10 h-12 rounded-xl px-4 text-gray-300 outline-none focus:border-neon-pink/40 transition-all font-bold"
                            >
                                {monthOptions.map(m => <option key={m} value={m} className="bg-zinc-950">{m}</option>)}
                            </select>
                        </div>

                        {/* Payout Category type selection */}
                        <div className="space-y-1.5">
                            <span className="text-[8px] text-gray-500 tracking-widest">Payout Type</span>
                            <select 
                                value={payoutTypeFilter} 
                                onChange={(e) => setPayoutTypeFilter(e.target.value)}
                                className="w-full bg-zinc-900/80 border border-white/10 h-12 rounded-xl px-4 text-gray-300 outline-none focus:border-neon-pink/40 transition-all font-bold"
                            >
                                <option value="All" className="bg-zinc-950">All Types</option>
                                {payoutTypes.map(pt => <option key={pt} value={pt} className="bg-zinc-950">{pt}</option>)}
                            </select>
                        </div>

                        {/* Account type filter */}
                        <div className="space-y-1.5">
                            <span className="text-[8px] text-gray-500 tracking-widest">Source Account</span>
                            <select 
                                value={accountFilter} 
                                onChange={(e) => setAccountFilter(e.target.value)}
                                className="w-full bg-zinc-900/80 border border-white/10 h-12 rounded-xl px-4 text-gray-300 outline-none focus:border-neon-pink/40 transition-all font-bold"
                            >
                                <option value="All" className="bg-zinc-950">All Accounts</option>
                                <option value="newbi" className="bg-zinc-950">Newbi Official</option>
                                <option value="personal" className="bg-zinc-950">Personal Account</option>
                            </select>
                        </div>

                        {/* Status filter */}
                        <div className="space-y-1.5">
                            <span className="text-[8px] text-gray-500 tracking-widest">Payment Status</span>
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full bg-zinc-900/80 border border-white/10 h-12 rounded-xl px-4 text-gray-300 outline-none focus:border-neon-pink/40 transition-all font-bold"
                            >
                                <option value="All" className="bg-zinc-950">All Status</option>
                                <option value="Paid" className="bg-zinc-950">Paid / Cleared</option>
                                <option value="Pending" className="bg-zinc-950">Pending / Unpaid</option>
                            </select>
                        </div>

                        {/* Clear/Reset button */}
                        <div className="flex items-end justify-end">
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setMonthFilter(new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
                                    setPayoutTypeFilter('All');
                                    setStatusFilter('All');
                                    setAccountFilter('All');
                                }}
                                className="w-full h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2 font-black tracking-widest uppercase"
                            >
                                <X size={12} /> Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Spends Display Ledger */}
                <AnimatePresence mode="wait">
                    {viewMode === 'grid' ? (
                        <motion.div key="grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredSpends.map((sp, i) => (
                                <motion.div key={sp.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="h-full flex flex-col">
                                    <Card className="group relative p-6 bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[2.5rem] flex flex-col justify-between h-full overflow-hidden hover:border-white/20 duration-500 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(255,46,144,0.06)]">
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform pointer-events-none"><IndianRupee size={100} /></div>
                                        <div>
                                            {/* Top badges */}
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-neon-pink bg-neon-pink/10 px-3 py-1 rounded-full border border-neon-pink/20">
                                                        {sp.payoutType || 'General Expense'}
                                                    </span>
                                                    <div className={cn("w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor]", sp.status === 'Paid' ? 'text-neon-green bg-neon-green' : 'text-yellow-500 bg-yellow-500')} />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={() => openEdit(sp)} className="p-2 bg-white/5 hover:bg-white/10 text-gray-500 rounded-xl transition-all border border-white/5 hover:text-white" title="Edit Payout"><Edit size={14} /></button>
                                                    {user?.role !== 'editor' && user?.role !== 'content_admin' && (
                                                        <button onClick={() => handleDeleteSpend(sp.id)} className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-gray-500 rounded-xl transition-all border border-white/5" title="Purge Record"><Trash2 size={14} /></button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Details section based on payout type */}
                                            <h3 className="text-xl font-black font-heading tracking-tighter uppercase italic text-white mb-2 leading-tight line-clamp-2">{sp.title}</h3>
                                            
                                            <div className="space-y-2 mt-5 p-4 bg-black/40 border border-white/5 rounded-2xl text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                                                {/* Payout Specific Card Information */}
                                                {sp.payoutType === 'Salary' && (
                                                    <>
                                                        <div className="flex justify-between"><span className="text-gray-600">Period:</span> <span className="text-white font-mono">{sp.salaryPeriod || 'N/A'}</span></div>
                                                        <div className="flex justify-between"><span className="text-gray-600">Designation:</span> <span className="text-white">{sp.designation || 'Core Team'}</span></div>
                                                    </>
                                                )}

                                                {sp.payoutType === 'Volunteer Payout' && (
                                                    <>
                                                        <div className="flex justify-between"><span className="text-gray-600">Volunteer Phone:</span> <span className="text-white font-mono select-all">{sp.volunteerPhone || 'N/A'}</span></div>
                                                        <div className="flex justify-between"><span className="text-gray-600">Gig Reference:</span> <span className="text-neon-pink truncate max-w-[140px]">{sp.linkedGig || 'General Support'}</span></div>
                                                        {/* All registered gigs for this payee */}
                                                        {(() => {
                                                            const payeeGigs = financePayees
                                                                .filter(p => p.type === 'Volunteer' && p.linkedGig && (
                                                                    (sp.receiverName && p.name?.toLowerCase() === sp.receiverName?.toLowerCase()) ||
                                                                    (sp.volunteerPhone && p.phone === sp.volunteerPhone)
                                                                ))
                                                                .map(p => p.linkedGig)
                                                                .filter((g, idx, arr) => arr.indexOf(g) === idx);
                                                            return payeeGigs.length > 1 ? (
                                                                <div className="mt-1">
                                                                    <span className="text-gray-600 text-[8px]">All Registered Gigs:</span>
                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                        {payeeGigs.map(g => (
                                                                            <span key={g} className={cn(
                                                                                "text-[7px] px-2 py-0.5 rounded-full border font-black uppercase tracking-wider",
                                                                                g === sp.linkedGig
                                                                                    ? "bg-neon-green/10 text-neon-green border-neon-green/20"
                                                                                    : "bg-white/5 text-gray-400 border-white/10"
                                                                            )}>
                                                                                {g}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : null;
                                                        })()}
                                                        {sp.linkedInvoiceNumber && (
                                                            <div className="flex justify-between"><span className="text-gray-600">Linked Invoice:</span> <span className="text-neon-blue font-mono font-black">#{sp.linkedInvoiceNumber}</span></div>
                                                        )}
                                                    </>
                                                )}

                                                {sp.payoutType === 'Vendor Payout' && (
                                                    <>
                                                        <div className="flex justify-between"><span className="text-gray-600">Vendor Entity:</span> <span className="text-white">{sp.paidTo || 'N/A'}</span></div>
                                                        <div className="flex justify-between"><span className="text-gray-600">Invoice Ref:</span> <span className="text-white font-mono">{sp.invoiceRef || 'N/A'}</span></div>
                                                    </>
                                                )}

                                                {sp.payoutType === 'Artist Fee' && (
                                                    <>
                                                        <div className="flex justify-between"><span className="text-gray-600">Artist Entity:</span> <span className="text-white">{sp.receiverName || 'N/A'}</span></div>
                                                    </>
                                                )}

                                                <div className="flex justify-between pt-2 border-t border-white/5"><span className="text-gray-600">Account:</span> <span className="text-white">{sp.accountType === 'personal' ? `Personal (${sp.receiverName || sp.paidBy})` : 'Newbi Official'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-600">Mode:</span> <span className="text-white">{sp.paymentMode}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-600">Date:</span> <span className="text-gray-400 font-mono">{new Date(sp.date).toLocaleDateString()}</span></div>
                                            </div>

                                            {/* Destination UPI / Bank block with quick copy */}
                                            {sp.destinationDetails && (
                                                <div className="mt-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between gap-3 text-[8px] font-black uppercase tracking-widest">
                                                    <div className="truncate flex-1">
                                                        <span className="text-gray-600 block text-[6px]">Payout Destination</span>
                                                        <span className="text-white font-mono select-all truncate block mt-0.5">{sp.destinationDetails}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => copyToClipboard(sp.destinationDetails)}
                                                        className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg border border-white/5 transition-all shrink-0"
                                                        title="Copy Details"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Bottom metrics and Action toggles */}
                                        <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/5 shrink-0 relative z-10">
                                            <div className="text-xl font-black text-white tabular-nums flex items-center gap-0.5 leading-none">
                                                <IndianRupee className="size-4 stroke-[2] text-[#FF2E90]" />
                                                {sp.amount?.toLocaleString()}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {sp.status === 'Paid' && (
                                                    <button
                                                        onClick={() => handleViewReceiptSlip(sp)}
                                                        className="h-10 w-10 bg-white/5 hover:bg-neon-pink hover:text-black text-gray-400 rounded-xl border border-white/5 transition-all flex items-center justify-center"
                                                        title="Print Payout Slip"
                                                    >
                                                        <Printer size={12} />
                                                    </button>
                                                )}
                                                {sp.receiptUrl ? (
                                                    <a 
                                                        href={sp.receiptUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="h-10 px-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl border border-white/5 flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        <Eye size={12} /> Proof
                                                    </a>
                                                ) : (
                                                    <span className="text-[7px] text-gray-600 font-black uppercase tracking-widest flex items-center gap-1.5 pl-2"><AlertTriangle size={10} /> No Proof</span>
                                                )}
                                                <button
                                                    onClick={() => handleToggleStatus(sp)}
                                                    className={cn(
                                                        "h-10 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                                                        sp.status === 'Paid' 
                                                            ? "bg-neon-green/10 text-neon-green border-neon-green/20 hover:bg-neon-green/20 shadow-[0_0_10px_rgba(57,255,20,0.1)]" 
                                                            : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20"
                                                    )}
                                                >
                                                    {sp.status === 'Paid' ? 'Cleared' : 'Pending'}
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div key="table" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="overflow-x-auto scrollbar-hide">
                            <Card className="md:min-w-[1000px] bg-zinc-900/40 border-white/5 rounded-3xl p-0 border overflow-hidden">
                                <table className="w-full text-left hidden md:table">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                                            <th className="p-6">Spend Item</th>
                                            <th className="p-6">Amount</th>
                                            <th className="p-6">Payout Type</th>
                                            <th className="p-6">Source Account</th>
                                            <th className="p-6">Recipient Info</th>
                                            <th className="p-6">Payout Destination</th>
                                            <th className="p-6">Date</th>
                                            <th className="p-6">Status</th>
                                            <th className="p-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-[11px] font-bold uppercase tracking-wider">
                                        {filteredSpends.map((sp) => (
                                            <tr key={sp.id} className="hover:bg-white/[0.01] transition-colors group">
                                                <td className="p-6">
                                                    <div className="text-xs font-black text-white">{sp.title}</div>
                                                    {sp.notes && <div className="text-[8px] text-gray-600 tracking-wide mt-1 lowercase normal-case">{sp.notes}</div>}
                                                </td>
                                                <td className="p-6 text-white font-black tabular-nums">
                                                    <div className="flex items-center gap-0.5">₹{sp.amount?.toLocaleString()}</div>
                                                </td>
                                                <td className="p-6 text-neon-pink font-black text-[9px]">{sp.payoutType || 'General Expense'}</td>
                                                <td className="p-6 text-gray-400">
                                                    {sp.accountType === 'personal' ? `Personal (${sp.receiverName || sp.paidBy})` : 'Newbi Official'}
                                                </td>
                                                <td className="p-6 text-gray-400">
                                                    <div className="text-xs font-black text-white">{sp.receiverName || sp.paidTo || 'N/A'}</div>
                                                    {sp.payoutType === 'Salary' && sp.designation && <div className="text-[8px] text-gray-600 mt-0.5">{sp.designation}</div>}
                                                    {sp.payoutType === 'Volunteer Payout' && sp.volunteerPhone && <div className="text-[8px] text-gray-600 font-mono mt-0.5">{sp.volunteerPhone}</div>}
                                                    {sp.linkedGig && <div className="text-[8px] text-neon-pink font-black mt-0.5">🎤 {sp.linkedGig}</div>}
                                                    {sp.linkedInvoiceNumber && <div className="text-[8px] text-neon-blue font-black font-mono mt-0.5">Inv: #{sp.linkedInvoiceNumber}</div>}
                                                </td>
                                                <td className="p-6 text-gray-400">
                                                    {sp.destinationDetails ? (
                                                        <div className="flex items-center gap-2 max-w-[200px]">
                                                            <span className="font-mono text-[9px] truncate text-white select-all">{sp.destinationDetails}</span>
                                                            <button 
                                                                onClick={() => copyToClipboard(sp.destinationDetails)}
                                                                className="p-1.5 hover:bg-white/10 text-gray-500 rounded hover:text-white transition-all shrink-0"
                                                                title="Copy Payout Address"
                                                            >
                                                                <Copy size={10} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[8px] text-gray-700 font-black">N/A</span>
                                                    )}
                                                </td>
                                                <td className="p-6 text-gray-500 font-mono text-[10px]">{new Date(sp.date).toLocaleDateString()}</td>
                                                <td className="p-6">
                                                    <button 
                                                        onClick={() => handleToggleStatus(sp)}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] border",
                                                            sp.status === 'Paid' 
                                                                ? "bg-neon-green/10 text-neon-green border-neon-green/20" 
                                                                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                                        )}
                                                    >
                                                        {sp.status === 'Paid' ? 'Cleared' : 'Pending'}
                                                    </button>
                                                </td>
                                                <td className="p-6 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {sp.status === 'Paid' && (
                                                            <button onClick={() => handleViewReceiptSlip(sp)} className="p-2 text-gray-500 hover:text-neon-pink transition-colors" title="Print Payout Slip"><Printer size={16} /></button>
                                                        )}
                                                        {sp.receiptUrl && (
                                                            <a href={sp.receiptUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-white transition-colors"><Eye size={16} /></a>
                                                        )}
                                                        <button onClick={() => openEdit(sp)} className="p-2 text-gray-500 hover:text-white transition-colors"><Edit size={16} /></button>
                                                        {user?.role !== 'editor' && user?.role !== 'content_admin' && (
                                                            <button onClick={() => handleDeleteSpend(sp.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Mobile Stacked Cards for Spends */}
                                <div className="flex md:hidden flex-col gap-4 p-4">
                                    {filteredSpends.map((sp) => (
                                        <div key={sp.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-neon-pink/10 flex items-center justify-center text-neon-pink">
                                                        <CreditCard size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-black text-white">{sp.title}</div>
                                                        {sp.notes && <div className="text-[8px] text-gray-600 tracking-wide mt-1 lowercase normal-case">{sp.notes}</div>}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-black text-white tabular-nums">₹{sp.amount?.toLocaleString()}</div>
                                                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">{new Date(sp.date).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex justify-between items-center bg-white/5 rounded-xl p-3">
                                                <div>
                                                    <div className="text-xs font-black text-white">{sp.receiverName || sp.paidTo || 'N/A'}</div>
                                                    <div className="text-[8px] font-bold text-neon-pink uppercase mt-0.5">{sp.payoutType || 'General Expense'}</div>
                                                </div>
                                                <button 
                                                    onClick={() => handleToggleStatus(sp)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] border",
                                                        sp.status === 'Paid' 
                                                            ? "bg-neon-green/10 text-neon-green border-neon-green/20" 
                                                            : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                                    )}
                                                >
                                                    {sp.status === 'Paid' ? 'Cleared' : 'Pending'}
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-white/5">
                                                {sp.status === 'Paid' && (
                                                    <button onClick={() => handleViewReceiptSlip(sp)} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-neon-pink transition-colors" title="Print Payout Slip"><Printer size={16} /></button>
                                                )}
                                                {sp.receiptUrl && (
                                                    <a href={sp.receiptUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"><Eye size={16} /></a>
                                                )}
                                                <button onClick={() => openEdit(sp)} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"><Edit size={16} /></button>
                                                {user?.role !== 'editor' && user?.role !== 'content_admin' && (
                                                    <button onClick={() => handleDeleteSpend(sp.id)} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </AdminCommunityHubLayout>

            {/* Add Spend Modal - Glassmorphic Overlay Overhaul */}
            <AnimatePresence>
                {showAddModal && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
                        <motion.div 
                            initial={{ x: '100%' }} 
                            animate={{ x: 0 }} 
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed top-0 right-0 h-full w-full max-w-xl bg-zinc-950/95 border-l-2 border-neon-pink shadow-2xl z-[101] flex flex-col text-white"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black font-heading tracking-tighter uppercase italic text-white">LOG <span className="text-neon-pink">PAYOUT.</span></h2>
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Central Expense & Payout Registration Console</p>
                                </div>
                                <button type="button" onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all"><X size={14} /></button>
                            </div>
                            
                            <form onSubmit={handleCreateSpend} className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar pb-24">
                                {/* Quick Fill Selection */}
                                {financePayees && financePayees.length > 0 && (
                                    <div className="space-y-1.5 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1 text-neon-pink">Quick Fill from Registered Payee</label>
                                        <select 
                                            onChange={(e) => {
                                                const payeeId = e.target.value;
                                                if (!payeeId) return;
                                                const payee = financePayees.find(p => p.id === payeeId);
                                                if (payee) {
                                                    setReceiverName(payee.name);
                                                    setPaidTo(payee.name);
                                                    setPaymentMode(payee.paymentMode || 'UPI');
                                                    setDestinationDetails(payee.destinationDetails || '');
                                                    if (payee.phone) setVolunteerPhone(payee.phone);
                                                    
                                                    // Map payee type to payout classification
                                                    if (payee.type === 'Salary') {
                                                        setPayoutType('Salary');
                                                        setTitle('Core Salary Payout');
                                                    } else if (payee.type === 'Volunteer') {
                                                        setPayoutType('Volunteer Payout');
                                                        setTitle('Volunteer Gig Remuneration');
                                                    } else if (payee.type === 'Vendor') {
                                                        setPayoutType('Vendor Payout');
                                                        setTitle('Vendor Service Clearance');
                                                    } else if (payee.type === 'Artist') {
                                                        setPayoutType('Artist Fee');
                                                        setTitle('Artist Clearance');
                                                    }
                                                    useStore.getState().addToast(`Pre-filled details for ${payee.name}!`, 'success');
                                                }
                                            }}
                                            className="w-full bg-black/40 border border-white/5 h-12 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all"
                                            defaultValue=""
                                        >
                                            <option value="" className="bg-zinc-950 text-gray-400">-- Select a Registered Payee to Autofill --</option>
                                            {financePayees.map(payee => (
                                                <option key={payee.id} value={payee.id} className="bg-zinc-950 text-white">
                                                    {payee.name} ({payee.type} - {payee.paymentMode})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Payout classification selection */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payout Classification *</label>
                                        <select 
                                            value={payoutType} 
                                            onChange={(e) => {
                                                setPayoutType(e.target.value);
                                                // Prepopulate category tags relative to Payout Classification
                                                if (e.target.value === 'Salary') setTitle('Core Salary Payout');
                                                else if (e.target.value === 'Volunteer Payout') setTitle('Volunteer Gig Remuneration');
                                                else if (e.target.value === 'Vendor Payout') setTitle('Vendor Service Clearance');
                                                else if (e.target.value === 'Artist Fee') setTitle('Artist Clearance');
                                                else setTitle('');
                                            }} 
                                            className="w-full bg-white/5 border border-white/10 h-12 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all"
                                        >
                                            {payoutTypes.map(pt => <option key={pt} value={pt} className="bg-zinc-950 text-white">{pt}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Amount (INR) *</label>
                                        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount to pay" className="h-12 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Transaction Label / Title *</label>
                                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Graphic design monthly retainer" className="h-12 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Value Date *</label>
                                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                    </div>
                                </div>

                                {/* Dynamic Fields relative to Payout Classification */}
                                <AnimatePresence mode="wait">
                                    <motion.div 
                                        key={payoutType} 
                                        initial={{ opacity: 0, y: 5 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        exit={{ opacity: 0, y: 5 }}
                                        className="space-y-5"
                                    >
                                        {/* SALARY SPECIFIC */}
                                        {payoutType === 'Salary' && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Core Member Name *</label>
                                                    <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Recipient name" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Designation/Role *</label>
                                                    <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Creative Director" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Salary Month *</label>
                                                    <Input value={salaryPeriod} onChange={(e) => setSalaryPeriod(e.target.value)} placeholder="e.g. May 2026" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                                </div>
                                            </div>
                                        )}

                                        {/* VOLUNTEER SPECIFIC */}
                                        {payoutType === 'Volunteer Payout' && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Volunteer Name *</label>
                                                    <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Volunteer full name" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Volunteer Phone</label>
                                                    <Input value={volunteerPhone} onChange={(e) => setVolunteerPhone(e.target.value)} placeholder="Phone number" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Gig Title / Link</label>
                                                    <Input value={linkedGig} onChange={(e) => setLinkedGig(e.target.value)} placeholder="e.g. Arena Concert Gate" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" />
                                                </div>
                                                {invoices && invoices.length > 0 && (
                                                    <div className="space-y-1.5 col-span-full pt-2">
                                                        <label className="text-[8px] font-black text-neon-pink uppercase tracking-widest">Link Payment Received Invoice (Optional)</label>
                                                        <select
                                                            value={linkedInvoiceId}
                                                            onChange={(e) => {
                                                                const invId = e.target.value;
                                                                setLinkedInvoiceId(invId);
                                                                const inv = invoices.find(i => i.id === invId);
                                                                setLinkedInvoiceNumber(inv ? (inv.invoiceNumber || inv.id) : '');
                                                            }}
                                                            className="w-full bg-black/40 border border-white/5 h-11 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all"
                                                        >
                                                            <option value="" className="bg-zinc-950 text-gray-400">-- No Invoice Linked --</option>
                                                            {invoices.map(inv => (
                                                                <option key={inv.id} value={inv.id} className="bg-zinc-950 text-white">
                                                                    {inv.invoiceNumber || 'INV'} - {inv.clientName} (₹{inv.amount?.toLocaleString()})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* VENDOR SPECIFIC */}
                                        {payoutType === 'Vendor Payout' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Vendor Entity Name *</label>
                                                    <Input value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder="e.g. Sound Rentals Ltd." className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Invoice Reference #</label>
                                                    <Input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="e.g. INV-10023" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" />
                                                </div>
                                            </div>
                                        )}

                                        {/* ARTIST SPECIFIC */}
                                        {payoutType === 'Artist Fee' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Artist / DJ Name *</label>
                                                    <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Artist name" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Event Reference</label>
                                                    <Input value={linkedGig} onChange={(e) => setLinkedGig(e.target.value)} placeholder="e.g. Sunburn Stage" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" />
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Source Account *</label>
                                        <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all">
                                            <option value="newbi" className="bg-zinc-950 text-white">Official Newbi Account</option>
                                            <option value="personal" className="bg-zinc-950 text-white">Personal Account (Core Member Reimbursement)</option>
                                        </select>
                                    </div>
                                    
                                    {accountType === 'personal' && (
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payer Name (Team Member) *</label>
                                            <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Name of member paying" className="h-12 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payment Method</label>
                                        <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all">
                                            {paymentModes.map(m => <option key={m} value={m} className="bg-zinc-950 text-white">{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Cleared / Paid Status</label>
                                        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all">
                                            <option value="Paid" className="bg-zinc-950 text-white">Cleared / Settled</option>
                                            <option value="Pending" className="bg-zinc-950 text-white">Pending / Unpaid</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payout Destination Details (UPI ID / Bank details to copy)</label>
                                    <Input value={destinationDetails} onChange={(e) => setDestinationDetails(e.target.value)} placeholder="e.g. UPI: name@okaxis or Bank transfer details" className="h-12 border-white/10 bg-white/5 focus:border-neon-pink" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payout Slip / Receipt Attachment</label>
                                        <div className="relative group cursor-pointer h-12 border border-dashed border-white/10 rounded-xl flex items-center justify-center gap-3 bg-white/5 hover:border-neon-pink/40 transition-all">
                                            <input type="file" onChange={(e) => handleReceiptUpload(e, setReceiptUrl)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                            <Upload className="text-gray-500 group-hover:text-neon-pink" size={16} />
                                            <span className="text-[10px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">
                                                {uploadingReceipt ? 'UPLOADING...' : (receiptUrl ? 'CHANGE ATTACHMENT' : 'CHOOSE RECEIPT FILE')}
                                            </span>
                                        </div>
                                        {receiptUrl && (
                                            <div className="text-[8px] text-neon-green font-bold uppercase tracking-wider mt-1 truncate">
                                                File linked: <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">View Attachment</a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Internal Operational Notes</label>
                                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add transaction notes or descriptions..." className="w-full bg-white/5 border border-white/10 h-20 rounded-xl text-xs font-semibold p-4 text-white outline-none focus:border-neon-pink placeholder:text-white/20 transition-all" />
                                </div>

                                {paymentMode === 'UPI' && destinationDetails.includes('@') ? (
                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4 pt-4 mt-2">
                                        <span className="text-[10px] font-black text-neon-pink uppercase tracking-widest block">UPI Direct Checkout</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    let upiAddress = destinationDetails;
                                                    if (destinationDetails.includes('UPI:')) {
                                                        upiAddress = destinationDetails.split('UPI:')[1].trim();
                                                    }
                                                    const upiLink = `upi://pay?pa=${upiAddress}&pn=${encodeURIComponent(receiverName || paidTo || 'Newbi Payee')}&am=${amount}&cu=INR`;
                                                    window.open(upiLink, '_blank');
                                                    setShowUPIFlow(true);
                                                }}
                                                className="h-12 bg-neon-pink hover:bg-neon-pink/90 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(255,79,139,0.2)]"
                                            >
                                                <Smartphone size={14} /> Pay via UPI App
                                            </button>
                                            <button
                                                type="submit"
                                                onClick={() => setStatus('Paid')}
                                                className="h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                                            >
                                                Mark as Already Paid
                                            </button>
                                        </div>

                                        {showUPIFlow && (
                                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pt-4 border-t border-white/5 space-y-4">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="p-3 bg-white rounded-2xl shadow-xl">
                                                        <img 
                                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=020202&data=${encodeURIComponent(
                                                                `upi://pay?pa=${destinationDetails.includes('UPI:') ? destinationDetails.split('UPI:')[1].trim() : destinationDetails}&pn=${encodeURIComponent(receiverName || paidTo || 'Newbi Payee')}&am=${amount}&cu=INR`
                                                            )}`}
                                                            alt="Payment QR"
                                                            className="w-[130px] h-[130px]"
                                                        />
                                                    </div>
                                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest text-center">Scan QR Code with any UPI App</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Transaction Ref / UTR *</label>
                                                    <div className="flex gap-2">
                                                        <Input 
                                                            value={customUTR} 
                                                            onChange={(e) => setCustomUTR(e.target.value)} 
                                                            placeholder="Enter 12-digit UPI UTR / Ref Number" 
                                                            className="h-11 border-white/10 bg-white/5 focus:border-neon-pink font-mono"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (!customUTR) {
                                                                    useStore.getState().addToast('Please enter UTR to complete registration.', 'error');
                                                                    return;
                                                                }
                                                                setStatus('Paid');
                                                                setTimeout(() => {
                                                                    const mockEvent = { preventDefault: () => {} };
                                                                    handleCreateSpend(mockEvent);
                                                                }, 100);
                                                            }}
                                                            className="px-6 bg-neon-green hover:bg-neon-green/95 text-black text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shrink-0 font-bold"
                                                        >
                                                            Confirm
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[9px] rounded-xl border border-white/10 transition-all font-bold">
                                            Cancel
                                        </button>
                                        <Button type="submit" className="flex-1 h-12 bg-neon-pink text-white font-black uppercase tracking-[0.2em] text-[9px] rounded-xl shadow-[0_4px_15px_rgba(255,79,139,0.2)] hover:scale-[1.01]" disabled={uploadingReceipt}>
                                            LOG SPEND RECORD
                                        </Button>
                                    </div>
                                )}
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Edit Spend Modal - Overhauled */}
            <AnimatePresence>
                {showEditModal && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
                        <motion.div 
                            initial={{ x: '100%' }} 
                            animate={{ x: 0 }} 
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed top-0 right-0 h-full w-full max-w-xl bg-zinc-950/95 border-l-2 border-neon-pink shadow-2xl z-[101] flex flex-col text-white"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black font-heading tracking-tighter uppercase italic text-white">EDIT <span className="text-neon-pink">PAYOUT.</span></h2>
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Update Payout Record #{showEditModal.id?.substring(0, 8)}</p>
                                </div>
                                <button type="button" onClick={() => setShowEditModal(null)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all"><X size={14} /></button>
                            </div>
                            
                            <form onSubmit={handleUpdateSpend} className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar pb-24">
                                {/* Quick Fill Selection */}
                                {financePayees && financePayees.length > 0 && (
                                    <div className="space-y-1.5 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1 text-neon-pink">Quick Fill from Registered Payee</label>
                                        <select 
                                            onChange={(e) => {
                                                const payeeId = e.target.value;
                                                if (!payeeId) return;
                                                const payee = financePayees.find(p => p.id === payeeId);
                                                if (payee) {
                                                    setReceiverName(payee.name);
                                                    setPaidTo(payee.name);
                                                    setPaymentMode(payee.paymentMode || 'UPI');
                                                    setDestinationDetails(payee.destinationDetails || '');
                                                    if (payee.phone) setVolunteerPhone(payee.phone);
                                                    
                                                    // Map payee type to payout classification
                                                    if (payee.type === 'Salary') {
                                                        setPayoutType('Salary');
                                                        setTitle('Core Salary Payout');
                                                    } else if (payee.type === 'Volunteer') {
                                                        setPayoutType('Volunteer Payout');
                                                        setTitle('Volunteer Gig Remuneration');
                                                    } else if (payee.type === 'Vendor') {
                                                        setPayoutType('Vendor Payout');
                                                        setTitle('Vendor Service Clearance');
                                                    } else if (payee.type === 'Artist') {
                                                        setPayoutType('Artist Fee');
                                                        setTitle('Artist Clearance');
                                                    }
                                                    useStore.getState().addToast(`Pre-filled details for ${payee.name}!`, 'success');
                                                }
                                            }}
                                            className="w-full bg-black/40 border border-white/5 h-12 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all"
                                            defaultValue=""
                                        >
                                            <option value="" className="bg-zinc-950 text-gray-400">-- Select a Registered Payee to Autofill --</option>
                                            {financePayees.map(payee => (
                                                <option key={payee.id} value={payee.id} className="bg-zinc-950 text-white">
                                                    {payee.name} ({payee.type} - {payee.paymentMode})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payout Classification *</label>
                                        <select value={payoutType} onChange={(e) => setPayoutType(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all">
                                            {payoutTypes.map(pt => <option key={pt} value={pt} className="bg-zinc-950 text-white">{pt}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Amount (INR) *</label>
                                        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount to pay" className="h-12 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Transaction Label / Title *</label>
                                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly salary retainer" className="h-12 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Value Date *</label>
                                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                    </div>
                                </div>

                                {/* Dynamic Edit Payout Fields */}
                                <div className="space-y-5">
                                    {payoutType === 'Salary' && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                                            <div className="space-y-1.5">
                                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Core Member Name *</label>
                                                <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Recipient name" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Designation/Role *</label>
                                                <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Creative Director" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Salary Month *</label>
                                                <Input value={salaryPeriod} onChange={(e) => setSalaryPeriod(e.target.value)} placeholder="e.g. May 2026" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                            </div>
                                        </div>
                                    )}

                                    {payoutType === 'Volunteer Payout' && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                                            <div className="space-y-1.5">
                                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Volunteer Name *</label>
                                                <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Volunteer full name" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Volunteer Phone</label>
                                                <Input value={volunteerPhone} onChange={(e) => setVolunteerPhone(e.target.value)} placeholder="Phone number" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Gig Title / Link</label>
                                                <Input value={linkedGig} onChange={(e) => setLinkedGig(e.target.value)} placeholder="e.g. Arena Concert Gate" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" />
                                            </div>
                                            {invoices && invoices.length > 0 && (
                                                <div className="space-y-1.5 col-span-full pt-2">
                                                    <label className="text-[8px] font-black text-neon-pink uppercase tracking-widest">Link Payment Received Invoice (Optional)</label>
                                                    <select
                                                        value={linkedInvoiceId}
                                                        onChange={(e) => {
                                                            const invId = e.target.value;
                                                            setLinkedInvoiceId(invId);
                                                            const inv = invoices.find(i => i.id === invId);
                                                            setLinkedInvoiceNumber(inv ? (inv.invoiceNumber || inv.id) : '');
                                                        }}
                                                        className="w-full bg-black/40 border border-white/5 h-11 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all"
                                                    >
                                                        <option value="" className="bg-zinc-950 text-gray-400">-- No Invoice Linked --</option>
                                                        {invoices.map(inv => (
                                                            <option key={inv.id} value={inv.id} className="bg-zinc-950 text-white">
                                                                {inv.invoiceNumber || 'INV'} - {inv.clientName} (₹{inv.amount?.toLocaleString()})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {payoutType === 'Vendor Payout' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                                            <div className="space-y-1.5">
                                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Vendor Entity Name *</label>
                                                <Input value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder="e.g. Sound Rentals Ltd." className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Invoice Reference #</label>
                                                <Input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="e.g. INV-10023" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" />
                                            </div>
                                        </div>
                                    )}

                                    {payoutType === 'Artist Fee' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                                            <div className="space-y-1.5">
                                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Artist / DJ Name *</label>
                                                <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Artist name" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Event Reference</label>
                                                <Input value={linkedGig} onChange={(e) => setLinkedGig(e.target.value)} placeholder="e.g. Stage 1 VIP" className="h-11 border-white/10 bg-white/5 focus:border-neon-pink" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Source Account *</label>
                                        <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all">
                                            <option value="newbi" className="bg-zinc-950 text-white">Official Newbi Account</option>
                                            <option value="personal" className="bg-zinc-950 text-white">Personal Account (Core Member Reimbursement)</option>
                                        </select>
                                    </div>
                                    
                                    {accountType === 'personal' && (
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payer Name (Team Member) *</label>
                                            <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Name of member paying" className="h-12 border-white/10 bg-white/5 focus:border-neon-pink" required />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payment Method</label>
                                        <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all">
                                            {paymentModes.map(m => <option key={m} value={m} className="bg-zinc-950 text-white">{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Cleared / Paid Status</label>
                                        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all">
                                            <option value="Paid" className="bg-zinc-950 text-white">Cleared / Settled</option>
                                            <option value="Pending" className="bg-zinc-950 text-white">Pending / Unpaid</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payout Destination Details (UPI ID / Bank details to copy)</label>
                                    <Input value={destinationDetails} onChange={(e) => setDestinationDetails(e.target.value)} placeholder="e.g. UPI: name@okaxis or Bank transfer details" className="h-12 border-white/10 bg-white/5 focus:border-neon-pink" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payout Slip / Receipt Attachment</label>
                                        <div className="relative group cursor-pointer h-12 border border-dashed border-white/10 rounded-xl flex items-center justify-center gap-3 bg-white/5 hover:border-neon-pink/40 transition-all">
                                            <input type="file" onChange={(e) => handleReceiptUpload(e, setReceiptUrl)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                            <Upload className="text-gray-500 group-hover:text-neon-pink" size={16} />
                                            <span className="text-[10px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">
                                                {uploadingReceipt ? 'UPLOADING...' : (receiptUrl ? 'CHANGE ATTACHMENT' : 'CHOOSE RECEIPT FILE')}
                                            </span>
                                        </div>
                                        {receiptUrl && (
                                            <div className="text-[8px] text-neon-green font-bold uppercase tracking-wider mt-1 truncate">
                                                File linked: <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">View Attachment</a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Internal Notes</label>
                                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add transaction notes or descriptions..." className="w-full bg-white/5 border border-white/10 h-20 rounded-xl text-xs font-semibold p-4 text-white outline-none focus:border-neon-pink placeholder:text-white/20 transition-all" />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setShowEditModal(null)} className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[9px] rounded-xl border border-white/10 transition-all font-bold">
                                        Cancel
                                    </button>
                                    <Button type="submit" className="flex-1 h-12 bg-neon-pink text-white font-black uppercase tracking-[0.2em] text-[9px] rounded-xl shadow-[0_4px_15px_rgba(255,79,139,0.2)] hover:scale-[1.01]" disabled={uploadingReceipt}>
                                        UPDATE SPEND ENTRY
                                    </Button>
                                </div>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Bulk Payout Wizard Modal */}
            <AnimatePresence>
                {showBulkModal && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
                        <motion.div 
                            initial={{ x: '100%' }} 
                            animate={{ x: 0 }} 
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed top-0 right-0 h-full w-full max-w-xl bg-zinc-950/95 border-l-2 border-neon-pink shadow-2xl z-[101] flex flex-col text-white"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black font-heading tracking-tighter uppercase italic text-white">BULK <span className="text-neon-pink">PAYOUTS.</span></h2>
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Disburse payments to registered event volunteers in batches</p>
                                </div>
                                <button type="button" onClick={() => setShowBulkModal(false)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all"><X size={14} /></button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar pb-24">
                            
                            {bulkStep === 1 ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Select Event Gig *</label>
                                            <select 
                                                value={selectedBulkEvent} 
                                                onChange={(e) => setSelectedBulkEvent(e.target.value)} 
                                                className="w-full bg-white/5 border border-white/10 h-12 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                                            >
                                                <option value="" className="bg-zinc-950 text-gray-400">-- Choose an Event --</option>
                                                {upcomingEvents && upcomingEvents.map(evt => (
                                                    <option key={evt.id || evt.title} value={evt.title} className="bg-zinc-950 text-white">{evt.title}</option>
                                                ))}
                                            </select>
                                            {/* Create New Event inline */}
                                            <div className="flex items-center gap-2 mt-2">
                                                <Input 
                                                    placeholder="Or type a new event name..." 
                                                    value={bulkNewEventName || ''} 
                                                    onChange={(e) => setBulkNewEventName(e.target.value)}
                                                    className="h-9 text-[10px] border-white/10 bg-white/5 focus:border-neon-blue flex-1"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={!bulkNewEventName?.trim()}
                                                    onClick={async () => {
                                                        const eventName = bulkNewEventName.trim();
                                                        if (!eventName) return;
                                                        // Check if event already exists
                                                        const exists = upcomingEvents?.find(e => e.title.toLowerCase() === eventName.toLowerCase());
                                                        if (exists) {
                                                            setSelectedBulkEvent(exists.title);
                                                            setBulkNewEventName('');
                                                            useStore.getState().addToast('Event already exists, selected it.', 'info');
                                                            return;
                                                        }
                                                        try {
                                                            await addUpcomingEvent({
                                                                title: eventName,
                                                                date: new Date().toISOString(),
                                                                description: `Created from Bulk Payout for volunteer disbursements`,
                                                                status: 'active',
                                                                category: 'Event',
                                                            });
                                                            setSelectedBulkEvent(eventName);
                                                            setBulkNewEventName('');
                                                            useStore.getState().addToast(`Event "${eventName}" created!`, 'success');
                                                        } catch (err) {
                                                            console.error(err);
                                                            useStore.getState().addToast('Failed to create event.', 'error');
                                                        }
                                                    }}
                                                    className="h-9 px-4 bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue text-[8px] font-black uppercase tracking-widest rounded-lg border border-neon-blue/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                                                >
                                                    + Create
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Default Payout Rate (INR) *</label>
                                            <Input type="number" value={bulkPayoutAmount} onChange={(e) => setBulkPayoutAmount(e.target.value)} className="h-12 border-white/10 bg-white/5 focus:border-neon-blue" required />
                                        </div>
                                    </div>

                                    {/* Volunteer Selector List */}
                                    {selectedBulkEvent && (
                                        <div className="space-y-3 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                                            <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                                <span className="text-[10px] font-black text-neon-blue uppercase tracking-widest">Registered Volunteers ({bulkVolunteers.length})</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        if (selectedVolunteerIds.length === bulkVolunteers.length) {
                                                            setSelectedVolunteerIds([]);
                                                        } else {
                                                            setSelectedVolunteerIds(bulkVolunteers.map(v => v.id));
                                                        }
                                                    }}
                                                    className="text-[8px] font-black text-gray-400 hover:text-white uppercase tracking-widest"
                                                >
                                                    Toggle All
                                                </button>
                                            </div>

                                            {bulkVolunteers.length === 0 ? (
                                                <p className="text-xs font-semibold text-gray-500 py-4 text-center">No volunteers registered under this event yet. Share a registration link to get started.</p>
                                            ) : (
                                                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                                                    {bulkVolunteers.map((vol, index) => {
                                                        const isSelected = selectedVolunteerIds.includes(vol.id);
                                                        return (
                                                            <div key={vol.id} className={cn(
                                                                "flex items-center justify-between p-3 rounded-xl border transition-all",
                                                                isSelected ? "bg-neon-blue/5 border-neon-blue/20" : "bg-white/[0.01] border-white/5 opacity-60"
                                                            )}>
                                                                <div className="flex items-center gap-3">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={isSelected}
                                                                        onChange={() => {
                                                                            if (isSelected) {
                                                                                setSelectedVolunteerIds(prev => prev.filter(id => id !== vol.id));
                                                                            } else {
                                                                                setSelectedVolunteerIds(prev => [...prev, vol.id]);
                                                                            }
                                                                        }}
                                                                        className="rounded border-white/10 bg-white/5 text-neon-blue focus:ring-0 w-4 h-4 cursor-pointer"
                                                                    />
                                                                    <div>
                                                                        <span className="text-xs font-bold text-white block">{vol.name}</span>
                                                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{vol.upiId || vol.phone || 'No Info'}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">₹</span>
                                                                    <input 
                                                                        type="number" 
                                                                        value={vol.amount} 
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            setBulkVolunteers(prev => prev.map((v, i) => i === index ? { ...v, amount: val } : v));
                                                                        }}
                                                                        className="w-20 h-8 bg-black/40 border border-white/5 rounded-lg text-xs font-bold text-right px-2 text-white outline-none focus:border-neon-blue font-mono"
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Settings */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payment Method</label>
                                            <select value={bulkPaymentMode} onChange={(e) => setBulkPaymentMode(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all">
                                                {paymentModes.map(m => <option key={m} value={m} className="bg-zinc-950 text-white">{m}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Source Account</label>
                                            <select value={bulkAccountType} onChange={(e) => setBulkAccountType(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all">
                                                <option value="newbi" className="bg-zinc-950 text-white">Official Newbi Account</option>
                                                <option value="personal" className="bg-zinc-950 text-white">Personal Account</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Value Date</label>
                                            <Input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} className="h-12 border-white/10 bg-white/5 focus:border-neon-blue" required />
                                        </div>
                                    </div>

                                    {/* Invoice Link */}
                                    {invoices && invoices.length > 0 && (
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Link Payouts with Incoming Client Invoice (Optional)</label>
                                            <select
                                                value={bulkLinkedInvoiceId}
                                                onChange={(e) => {
                                                    const invId = e.target.value;
                                                    setBulkLinkedInvoiceId(invId);
                                                    const inv = invoices.find(i => i.id === invId);
                                                    setBulkLinkedInvoiceNumber(inv ? (inv.invoiceNumber || inv.id) : '');
                                                }}
                                                className="w-full bg-white/5 border border-white/10 h-12 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                                            >
                                                <option value="" className="bg-zinc-950 text-gray-400">-- Select Client Invoice --</option>
                                                {invoices.map(inv => (
                                                    <option key={inv.id} value={inv.id} className="bg-zinc-950 text-white">
                                                        {inv.invoiceNumber || 'INV'} - {inv.clientName} (₹{inv.amount?.toLocaleString()})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Notes</label>
                                        <textarea value={bulkNotes} onChange={(e) => setBulkNotes(e.target.value)} placeholder="Add bulk notes..." className="w-full bg-white/5 border border-white/10 h-20 rounded-xl text-xs font-semibold p-4 text-white outline-none focus:border-neon-blue placeholder:text-white/20 transition-all" />
                                    </div>

                                    <button
                                        type="button"
                                        disabled={!selectedBulkEvent || selectedVolunteerIds.length === 0}
                                        onClick={() => {
                                            if (bulkPaymentMode === 'UPI') {
                                                setBulkStep(2);
                                            } else {
                                                handleCreateBulkPayout();
                                            }
                                        }}
                                        className="w-full h-14 bg-neon-blue hover:bg-blue-600 disabled:bg-white/5 disabled:text-gray-500 disabled:scale-100 disabled:shadow-none text-white font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs rounded-xl shadow-[0_8px_30px_rgba(59,130,246,0.3)] hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                                    >
                                        {bulkPaymentMode === 'UPI' ? 'Proceed to UPI payments' : 'Confirm Bulk log'}
                                    </button>
                                </div>
                            ) : (
                                /* UPI App link Checklist step */
                                <div className="space-y-6">
                                    <div className="p-4 bg-neon-blue/5 border border-neon-blue/10 rounded-2xl flex items-center justify-between">
                                        <div>
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Linked Gig Event</span>
                                            <span className="text-xs font-bold text-white">{selectedBulkEvent}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Total Selected Payees</span>
                                            <span className="text-xs font-bold text-white">{selectedVolunteerIds.length} Volunteers</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black text-neon-blue uppercase tracking-widest block">Sequential Payment Checklist</span>
                                        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-2 scrollbar-hide">
                                            {bulkVolunteers.filter(v => selectedVolunteerIds.includes(v.id)).map((vol, idx) => {
                                                const isPaid = completedPayments[vol.id];
                                                return (
                                                    <div key={vol.id} className={cn(
                                                        "flex items-center justify-between p-4 rounded-xl border transition-all",
                                                        isPaid ? "bg-neon-green/5 border-neon-green/20" : "bg-white/[0.02] border-white/5"
                                                    )}>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-white">{vol.name}</span>
                                                                {isPaid && <span className="px-1.5 py-0.5 rounded bg-neon-green/10 border border-neon-green/20 text-[6px] font-black uppercase text-neon-green">Ready</span>}
                                                            </div>
                                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block font-mono">{vol.upiId || 'No UPI Address'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs font-bold text-white font-mono">₹{vol.amount || bulkPayoutAmount}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (!vol.upiId) {
                                                                        useStore.getState().addToast('No UPI ID registered for this payee.', 'error');
                                                                        return;
                                                                    }
                                                                    const deepLink = `upi://pay?pa=${vol.upiId}&pn=${encodeURIComponent(vol.name)}&am=${vol.amount || bulkPayoutAmount}&cu=INR`;
                                                                    window.open(deepLink, '_blank');
                                                                    setCompletedPayments(prev => ({ ...prev, [vol.id]: true }));
                                                                }}
                                                                className="h-9 px-3 bg-neon-blue/10 hover:bg-neon-blue text-neon-blue hover:text-white border border-neon-blue/20 hover:border-transparent text-[8px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5"
                                                            >
                                                                <Smartphone size={10} /> Pay Now
                                                            </button>
                                                            <input 
                                                                type="checkbox"
                                                                checked={!!isPaid}
                                                                onChange={(e) => {
                                                                    setCompletedPayments(prev => ({ ...prev, [vol.id]: e.target.checked }));
                                                                }}
                                                                className="rounded border-white/10 bg-white/5 text-neon-green focus:ring-0 w-4 h-4 cursor-pointer"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/5">
                                        <button
                                            type="button"
                                            onClick={() => setBulkStep(1)}
                                            className="h-12 px-6 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black uppercase tracking-widest text-[9px] rounded-xl border border-white/5 transition-all"
                                        >
                                            Back to Settings
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCreateBulkPayout}
                                            className="flex-1 h-12 bg-neon-green hover:bg-neon-green/90 text-black font-black uppercase tracking-widest text-[9px] rounded-xl transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                                        >
                                            Complete Payout Log & Print Receipt
                                        </button>
                                    </div>
                                </div>
                            )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showPrinterModal && activeSlipData && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrinterModal(false)} className="absolute inset-0 bg-black/85 backdrop-blur-xl" />
                        
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 40 }}
                            transition={{ type: "spring", stiffness: 260, damping: 22 }}
                            className={`relative w-full z-10 bg-zinc-950 border border-white/10 rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar transition-all duration-300 ${
                                printerStage === 'verify' && (activeSlipData.status === 'Pending' || activeSlipData.status === 'Unpaid') 
                                    ? 'max-w-3xl' 
                                    : 'max-w-md'
                            }`}
                        >
                            {/* Close Button */}
                            <button 
                                onClick={() => setShowPrinterModal(false)}
                                className="absolute top-6 right-6 p-2 rounded-full text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 transition-all z-[30]"
                                title="Close"
                            >
                                <X size={16} />
                            </button>

                            {printerStage === 'verify' && (
                                <>
                                    {(activeSlipData.status === 'Pending' || activeSlipData.status === 'Unpaid') ? (
                                        /* 2-Column Layout for Pending Payouts */
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 pt-4">
                                            {/* Left Column: Printer Slot & Load Status */}
                                            <div className="md:col-span-5 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 pb-6 md:pb-0 pr-0 md:pr-6 space-y-4">
                                                <div className="flex flex-col items-center w-full relative">
                                                    {renderPrinterSlot('READY', 'text-neon-green')}
                                                    
                                                    {/* Short piece of blank paper representing loaded state - z-20 (in front of printer back, behind front lip) */}
                                                    <div className="w-[260px] h-[35px] overflow-hidden bg-zinc-950/20 border-x border-b border-white/5 rounded-b-xl relative z-20 flex flex-col justify-start -mt-5 pt-0 shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)] px-2">
                                                        <div className="w-full bg-gradient-to-br from-[#021f0b] to-[#39ff14] h-full rounded-t-md flex items-center justify-center text-white border-x border-t border-[#39ff14]/20">
                                                            <span className="text-[6.5px] font-black uppercase tracking-widest text-[#39ff14]">READY</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.25em] animate-pulse">Printer Loaded</p>
                                            </div>

                                            {/* Right Column: Operational Payment details */}
                                            <div className="md:col-span-7 flex flex-col justify-between space-y-5">
                                                <div className="space-y-4">
                                                    <div>
                                                        <h3 className="text-base font-black font-heading uppercase italic tracking-wider text-white">Payment Clearance</h3>
                                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Settle disbursement and enter transaction reference</p>
                                                    </div>

                                                    {/* Payout Metadata Panel */}
                                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2.5 text-[10px]">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-500 font-extrabold uppercase text-[8px] tracking-wider">Recipient</span>
                                                            <span className="text-white font-bold">{activeSlipData.receiverName}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                                            <span className="text-gray-500 font-extrabold uppercase text-[8px] tracking-wider">Amount</span>
                                                            <span className="text-neon-green font-heading italic font-black text-sm">₹{Number(activeSlipData.amount).toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                                            <span className="text-gray-500 font-extrabold uppercase text-[8px] tracking-wider">Mode</span>
                                                            <span className="text-white font-bold border border-[#39ff14]/20 bg-[#39ff14]/5 px-2 py-0.5 rounded text-[8px]">{activeSlipData.paymentMode}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                                            <span className="text-gray-500 font-extrabold uppercase text-[8px] tracking-wider">Payout Type</span>
                                                            <span className="text-white font-bold">{activeSlipData.payoutType}</span>
                                                        </div>
                                                        {activeSlipData.linkedGig && (
                                                            <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                                                <span className="text-gray-500 font-extrabold uppercase text-[8px] tracking-wider">Gig Ref</span>
                                                                <span className="text-white font-bold truncate max-w-[60%] text-right">{activeSlipData.linkedGig}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* UPI options */}
                                                    {activeSlipData.paymentMode === 'UPI' && (
                                                        <div className="space-y-4">
                                                            {activeSlipData.destinationDetails && (
                                                                <div className="flex items-center gap-2 p-3 bg-neon-green/5 border border-neon-green/10 rounded-2xl text-[9px] font-black uppercase tracking-wider">
                                                                    <span className="text-gray-500">Payee UPI ID:</span>
                                                                    <span className="text-neon-green select-all tracking-widest">{activeSlipData.destinationDetails.replace('UPI:', '').trim()}</span>
                                                                </div>
                                                            )}
                                                            
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <button 
                                                                    type="button"
                                                                    onClick={handleUpiPayClick}
                                                                    className="flex items-center justify-center gap-2 h-12 bg-neon-green hover:bg-neon-green/95 text-black font-black uppercase tracking-widest text-[9px] rounded-xl transition-all shadow-[0_4px_12px_rgba(57,255,20,0.15)] font-bold"
                                                                >
                                                                    <Zap size={14} /> Pay UPI App
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowQR(!showQR)}
                                                                    className="flex items-center justify-center gap-2 h-12 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[9px] rounded-xl border border-white/10 transition-all font-bold"
                                                                >
                                                                    <Smartphone size={14} /> {showQR ? 'Hide QR Code' : 'Show QR Code'}
                                                                </button>
                                                            </div>

                                                            {showQR && activeSlipData.destinationDetails && (
                                                                <motion.div 
                                                                    initial={{ opacity: 0, y: -10 }} 
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-xl mx-auto w-fit"
                                                                >
                                                                    <img 
                                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=020202&data=${encodeURIComponent(
                                                                            `upi://pay?pa=${activeSlipData.destinationDetails.replace('UPI:', '').trim()}&pn=${encodeURIComponent(activeSlipData.receiverName)}&am=${activeSlipData.amount}&cu=INR`
                                                                        )}`}
                                                                        alt="Scan QR"
                                                                        className="w-[150px] h-[150px]"
                                                                    />
                                                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-2">Scan QR with UPI App to Pay</span>
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Bank details copy options */}
                                                    {activeSlipData.paymentMode === 'Bank Transfer' && (
                                                        <div className="space-y-3 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                                                            <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">Beneficiary Bank Credentials</h4>
                                                            {(() => {
                                                                const b = getBankDetails();
                                                                if (!b) return <p className="text-[9px] font-black text-gray-600 uppercase py-2">No bank details stored. Please transfer manually.</p>;
                                                                return (
                                                                    <div className="space-y-2.5">
                                                                        <div className="flex justify-between items-center text-xs">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[8px] text-gray-500 uppercase font-black">Account Name</span>
                                                                                <span className="text-white text-[10px] uppercase font-bold tracking-wide">{activeSlipData.receiverName}</span>
                                                                            </div>
                                                                            <button type="button" onClick={() => handleCopy(activeSlipData.receiverName, 'Account Name')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><Copy size={12} /></button>
                                                                        </div>
                                                                        <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[8px] text-gray-500 uppercase font-black">Bank Name</span>
                                                                                <span className="text-white text-[10px] uppercase font-bold tracking-wide">{b.bankName}</span>
                                                                            </div>
                                                                            <button type="button" onClick={() => handleCopy(b.bankName, 'Bank Name')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><Copy size={12} /></button>
                                                                        </div>
                                                                        <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[8px] text-gray-500 uppercase font-black">Account Number</span>
                                                                                <span className="text-neon-blue font-mono text-[11px] font-bold tracking-wider">{b.accountNumber}</span>
                                                                            </div>
                                                                            <button type="button" onClick={() => handleCopy(b.accountNumber, 'Account Number')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><Copy size={12} /></button>
                                                                        </div>
                                                                        <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[8px] text-gray-500 uppercase font-black">IFSC Code</span>
                                                                                <span className="text-neon-pink font-mono text-[11px] font-bold tracking-wider">{b.ifscCode}</span>
                                                                            </div>
                                                                            <button type="button" onClick={() => handleCopy(b.ifscCode, 'IFSC Code')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><Copy size={12} /></button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}

                                                    {/* Bulk Beneficiaries breakdown list shown here, NOT on receipt! */}
                                                    {activeSlipData.isBulk && activeSlipData.volunteers && activeSlipData.volunteers.length > 0 && (
                                                        <div className="space-y-3 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                                                            <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">Beneficiaries Breakdown</h4>
                                                            <div className="max-h-28 overflow-y-auto space-y-1.5 scrollbar-hide pr-1">
                                                                {activeSlipData.volunteers.map((vol, idx) => (
                                                                    <div key={idx} className="flex justify-between text-[10px]">
                                                                        <span className="text-gray-400 truncate max-w-[150px] uppercase font-bold">{vol.name}</span>
                                                                        <span className="text-white font-mono font-bold">₹{Number(vol.amount).toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* UTR Input Form */}
                                                    <div className="space-y-2 pt-2">
                                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Transaction UTR / Ref Number</label>
                                                        <Input
                                                            value={verificationUTR}
                                                            onChange={(e) => setVerificationUTR(e.target.value)}
                                                            placeholder="Enter UPI UTR or Bank Ref ID"
                                                            className="h-12 border-white/10 bg-white/5 focus:border-[#39ff14] font-mono tracking-widest text-center text-white"
                                                        />
                                                    </div>

                                                    {/* Payment Proof Upload */}
                                                    <div className="space-y-2 pt-1">
                                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payment Proof (Screenshot / PDF)</label>
                                                        <div className="relative">
                                                            <input type="file" onChange={(e) => handleReceiptUpload(e, setVerificationReceiptUrl)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                            <div className="h-10 bg-white/5 hover:bg-white/10 border border-dashed border-white/10 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest transition-all cursor-pointer">
                                                                {uploadingReceipt ? 'UPLOADING...' : (verificationReceiptUrl ? '✓ PROOF ATTACHED — TAP TO CHANGE' : 'ATTACH PAYMENT PROOF')}
                                                            </div>
                                                        </div>
                                                        {verificationReceiptUrl && (
                                                            <p className="text-[8px] text-[#39ff14] font-bold pl-1">
                                                                Proof linked: <a href={verificationReceiptUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">View Attachment</a>
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex gap-3 pt-4 border-t border-white/5">
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            const autoTxnId = `TXN-SKIPPED-${Date.now()}`;
                                                            if (activeSlipData.id) {
                                                                try {
                                                                    const updateData = {
                                                                        paymentRef: autoTxnId,
                                                                        status: 'Paid'
                                                                    };
                                                                    if (verificationReceiptUrl) updateData.receiptUrl = verificationReceiptUrl;
                                                                    await updateSpend(activeSlipData.id, updateData);
                                                                    setActiveSlipData(prev => ({ ...prev, reference: autoTxnId, status: 'Paid', receiptUrl: verificationReceiptUrl || prev.receiptUrl, proofUrl: verificationReceiptUrl || prev.receiptUrl }));
                                                                    useStore.getState().addToast('Transaction cleared!', 'success');
                                                                } catch (e) {
                                                                    console.error(e);
                                                                }
                                                            } else {
                                                                    setActiveSlipData(prev => ({ ...prev, reference: autoTxnId, status: 'Paid', receiptUrl: verificationReceiptUrl || prev.receiptUrl, proofUrl: verificationReceiptUrl || prev.receiptUrl }));
                                                            }
                                                            setPrinterStage('printing');
                                                        }}
                                                        className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black uppercase tracking-widest text-[9px] rounded-xl border border-white/5 transition-all font-bold"
                                                    >
                                                        Skip UTR
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            if (activeSlipData.id) {
                                                                try {
                                                                    const utrValue = verificationUTR || activeSlipData.reference || `TXN-AUTO-${Date.now()}`;
                                                                    const updateData = {
                                                                        paymentRef: utrValue,
                                                                        status: 'Paid'
                                                                    };
                                                                    if (verificationReceiptUrl) updateData.receiptUrl = verificationReceiptUrl;
                                                                    await updateSpend(activeSlipData.id, updateData);
                                                                    setActiveSlipData(prev => ({ ...prev, reference: utrValue, status: 'Paid', receiptUrl: verificationReceiptUrl || prev.receiptUrl, proofUrl: verificationReceiptUrl || prev.receiptUrl }));
                                                                    if (verificationUTR) {
                                                                        useStore.getState().addToast('Transaction details updated & cleared!', 'success');
                                                                    }
                                                                } catch (e) {
                                                                    console.error(e);
                                                                }
                                                            }
                                                            setPrinterStage('printing');
                                                        }}
                                                        className="flex-1 h-12 bg-neon-green hover:bg-neon-green/95 text-black font-black uppercase tracking-widest text-[9px] rounded-xl transition-all shadow-[0_4px_15px_rgba(57,255,20,0.25)] font-bold"
                                                    >
                                                        Verify & Print
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* 1-Column Layout for Cleared Payouts (Direct Receipt access) */
                                        <div className="flex flex-col items-center justify-center space-y-6 pt-4 w-full">
                                            <div className="flex flex-col items-center w-full relative">
                                                {renderPrinterSlot('READY', 'text-neon-green')}
                                                
                                                {/* Short piece of blank paper representing loaded state - z-20 */}
                                                <div className="w-[260px] h-[35px] overflow-hidden bg-zinc-950/20 border-x border-b border-white/5 rounded-b-xl relative z-20 flex flex-col justify-start -mt-5 pt-0 shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)] px-2">
                                                    <div className="w-full bg-gradient-to-br from-[#021f0b] to-[#39ff14] h-full rounded-t-md flex items-center justify-center text-white border-x border-t border-[#39ff14]/20">
                                                        <span className="text-[6.5px] font-black uppercase tracking-widest text-[#39ff14]">READY</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="w-full space-y-4">
                                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 text-[10px]">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-500 font-extrabold uppercase text-[8px] tracking-wider">Recipient</span>
                                                        <span className="text-white font-bold">{activeSlipData.receiverName}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                                        <span className="text-gray-500 font-extrabold uppercase text-[8px] tracking-wider">Amount</span>
                                                        <span className="text-neon-green font-heading italic font-black text-sm">₹{Number(activeSlipData.amount).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                                        <span className="text-gray-500 font-extrabold uppercase text-[8px] tracking-wider">Mode</span>
                                                        <span className="text-white font-bold border border-[#39ff14]/20 bg-[#39ff14]/5 px-2 py-0.5 rounded text-[8px]">{activeSlipData.paymentMode}</span>
                                                    </div>
                                                </div>

                                                {/* UTR Input Form */}
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Transaction UTR / Ref Number</label>
                                                    <Input
                                                        value={verificationUTR}
                                                        onChange={(e) => setVerificationUTR(e.target.value)}
                                                        placeholder="Enter UPI UTR or Bank Ref ID"
                                                        className="h-12 border-white/10 bg-white/5 focus:border-[#39ff14] font-mono tracking-widest text-center text-white"
                                                    />
                                                </div>

                                                {/* Payment Proof Upload */}
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payment Proof (Screenshot / PDF)</label>
                                                    <div className="relative">
                                                        <input type="file" onChange={(e) => handleReceiptUpload(e, setVerificationReceiptUrl)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                        <div className="h-10 bg-white/5 hover:bg-white/10 border border-dashed border-white/10 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest transition-all cursor-pointer">
                                                            {uploadingReceipt ? 'UPLOADING...' : (verificationReceiptUrl ? '✓ PROOF ATTACHED — TAP TO CHANGE' : 'ATTACH PAYMENT PROOF')}
                                                        </div>
                                                    </div>
                                                    {verificationReceiptUrl && (
                                                        <p className="text-[8px] text-[#39ff14] font-bold pl-1">
                                                            Proof linked: <a href={verificationReceiptUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">View Attachment</a>
                                                        </p>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (activeSlipData.id) {
                                                            try {
                                                                const utrValue = verificationUTR || activeSlipData.reference || `TXN-AUTO-${Date.now()}`;
                                                                const updateData = {
                                                                    paymentRef: utrValue,
                                                                    status: 'Paid'
                                                                };
                                                                if (verificationReceiptUrl) updateData.receiptUrl = verificationReceiptUrl;
                                                                await updateSpend(activeSlipData.id, updateData);
                                                                setActiveSlipData(prev => ({ ...prev, reference: utrValue, status: 'Paid', receiptUrl: verificationReceiptUrl || prev.receiptUrl, proofUrl: verificationReceiptUrl || prev.receiptUrl }));
                                                                if (verificationUTR) {
                                                                    useStore.getState().addToast('Transaction details updated!', 'success');
                                                                }
                                                            } catch (e) {
                                                                console.error(e);
                                                            }
                                                        }
                                                        setPrinterStage('printing');
                                                    }}
                                                    className="w-full h-12 bg-neon-green hover:bg-neon-green/95 text-black font-black uppercase tracking-widest text-[9px] rounded-xl transition-all shadow-[0_4px_15px_rgba(57,255,20,0.25)] font-bold"
                                                >
                                                    Print Receipt
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {printerStage === 'printing' && (
                                <div className="flex flex-col items-center justify-center py-6 space-y-6">
                                    {/* Group Slot and Slit Exit Box to prevent space-y-6 margin gap */}
                                    <div className="flex flex-col items-center w-full relative">
                                        {renderPrinterSlot('PRINTING...', 'text-amber-500')}

                                        {/* Slit exit view box - receipt emerges OUT of the slot - z-40 (in front of printer back and cutter lip) */}
                                        <div className="w-[260px] h-[300px] overflow-hidden rounded-b-2xl relative z-40 flex flex-col justify-start -mt-5 pt-0 px-0">
                                            {/* Printing paper container */}
                                            <motion.div
                                                initial={{ y: '-100%' }}
                                                animate={{ y: 0 }}
                                                transition={{ duration: 3.5, ease: 'linear' }}
                                                onAnimationComplete={() => setPrinterStage('done')}
                                                className="w-full flex justify-center origin-top"
                                            >
                                                {renderThermalReceipt(activeSlipData, verificationUTR)}
                                            </motion.div>
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-[#39ff14] uppercase tracking-[0.25em] animate-pulse">DISBURSING PAYOUT SLIP...</p>
                                    </div>
                                </div>
                            )}

                            {printerStage === 'done' && (
                                <div className="space-y-6 flex flex-col items-center pt-2">
                                    {/* Group Slot and Receipt to prevent space-y-6 margin gap */}
                                    <div className="flex flex-col items-center w-full relative">
                                        {renderPrinterSlot('READY', 'text-neon-green')}

                                        {/* Receipt Container - z-40 (in front of printer back and cutter lip) */}
                                        <div className="w-[270px] relative z-40 flex flex-col items-center -mt-5 pt-0 px-1">
                                            <div className="w-full flex justify-center shadow-2xl" style={{ filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.6))' }}>
                                                {renderThermalReceipt(activeSlipData, verificationUTR)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Other Details Panel shown on printer screen below receipt */}
                                    <div className="w-full max-w-[300px] p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 text-[9px] uppercase font-bold text-gray-400">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 font-extrabold text-[8px] tracking-wider">Payout Type</span>
                                            <span className="text-white font-bold">{activeSlipData.payoutType}</span>
                                        </div>
                                        {activeSlipData.linkedGig && (
                                            <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                                <span className="text-gray-500 font-extrabold text-[8px] tracking-wider">Gig Ref</span>
                                                <span className="text-white font-bold truncate max-w-[60%] text-right">{activeSlipData.linkedGig}</span>
                                            </div>
                                        )}
                                        {activeSlipData.destinationDetails && (
                                            <div className="flex flex-col gap-1 border-t border-white/5 pt-2 mt-1">
                                                <span className="text-gray-500 font-extrabold text-[8px] tracking-wider">Destination</span>
                                                <span className="text-white font-mono text-[9px] break-all tracking-normal lowercase">{activeSlipData.destinationDetails.replace('UPI:', '').replace('Bank:', '').trim()}</span>
                                            </div>
                                        )}

                                        {/* Bulk Beneficiaries breakdown list shown here, NOT on receipt! */}
                                        {activeSlipData.isBulk && activeSlipData.volunteers && activeSlipData.volunteers.length > 0 && (
                                            <div className="border-t border-white/5 pt-2 mt-1">
                                                <span className="block text-gray-500 font-extrabold text-[8px] tracking-wider mb-2">Beneficiaries Breakdown</span>
                                                <div className="max-h-24 overflow-y-auto space-y-1.5 scrollbar-hide pr-1">
                                                    {activeSlipData.volunteers.map((vol, idx) => (
                                                        <div key={idx} className="flex justify-between text-[8px]">
                                                            <span className="text-gray-400 truncate max-w-[130px]">{vol.name}</span>
                                                            <span className="text-white font-mono">₹{Number(vol.amount).toLocaleString('en-IN')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-[340px] pt-2">
                                        <button
                                            onClick={handleDownloadReceipt}
                                            className="flex-1 h-11 bg-neon-green hover:bg-neon-green/90 text-black font-black uppercase tracking-widest text-[8px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(57,255,20,0.25)] active:scale-95"
                                        >
                                            <Download size={13} /> Download
                                        </button>
                                        <button
                                            onClick={handleShareReceiptText}
                                            className="h-11 w-11 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all flex items-center justify-center active:scale-95"
                                            title="Share Receipt"
                                        >
                                            <Share2 size={15} />
                                        </button>
                                        <button
                                            onClick={handleWhatsAppShare}
                                            className="h-11 w-11 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-xl border border-green-500/20 transition-all flex items-center justify-center active:scale-95"
                                            title="Share via WhatsApp"
                                        >
                                            <MessageCircle size={15} />
                                        </button>
                                        <button
                                            onClick={() => setShowEmailModal(true)}
                                            className="h-11 w-11 bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue rounded-xl border border-neon-blue/20 transition-all flex items-center justify-center active:scale-95"
                                            title="Email Receipt"
                                        >
                                            <Mail size={15} />
                                        </button>
                                        <button
                                            onClick={() => setShowPrinterModal(false)}
                                            className="h-11 px-5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[8px] rounded-xl border border-white/10 transition-all active:scale-95"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Receipt Email Modal */}
            <AnimatePresence>
                {showEmailModal && activeSlipData && (
                    <ReceiptEmailModal
                        isOpen={!!showEmailModal}
                        onClose={() => setShowEmailModal(false)}
                        receipt={activeSlipData}
                        onSend={handleSendReceiptEmail}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default SpendsManagement;
