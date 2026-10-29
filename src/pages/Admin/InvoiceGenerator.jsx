import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Save from 'lucide-react/dist/esm/icons/save';
import Download from 'lucide-react/dist/esm/icons/download';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import ListOrdered from 'lucide-react/dist/esm/icons/list-ordered';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Maximize2 from 'lucide-react/dist/esm/icons/maximize-2';
import Minimize2 from 'lucide-react/dist/esm/icons/minimize-2';
import Paperclip from 'lucide-react/dist/esm/icons/paperclip';
import Upload from 'lucide-react/dist/esm/icons/upload';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import X from 'lucide-react/dist/esm/icons/x';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Landmark from 'lucide-react/dist/esm/icons/landmark';
import Stamp from 'lucide-react/dist/esm/icons/stamp';
import Bookmark from 'lucide-react/dist/esm/icons/bookmark';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import { copyToClipboard } from '../../lib/clipboard';
import { nextInvoiceNumber, todayKey, invoiceAmounts, invoiceLineAmount, invoiceReceived } from '../../lib/invoicing';
import { Button, Menu, MenuItem, EmptyState } from '../../components/admin/ui';
import Sheet from '../../components/admin/Sheet';
import { fieldCls, areaCls, Field, Toggle, SignatureField, UploadProgress, formatBytes } from '../../components/admin/uploads/UploadKit';
import { BuilderCard } from '../../components/admin/events/EditorParts';
import RichEditor from '../../components/admin/RichEditor';
import DocumentSeal from '../../components/ui/DocumentSeal';
import { accent, useAccent } from '../../components/admin/theme';
import { InvoicePage, BRANDS, paginateInvoice, isBlankText } from '../../components/admin/invoices/builder/InvoicePaper';
import {
    GST_RATES, GST_STATES, cleanGstin, gstinProblem, stateOfGstin, invoiceTaxLines, placeOfSupply, isHttpsUrl, isEmail,
    amountInWords,
} from '../../components/admin/invoices/builder/gst';
import ThemedSelect from '../../components/admin/ThemedSelect';
import '../../lib/documentFonts';
import '@fontsource/inter/100.css';
import '@fontsource/inter/200.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';

/*
 * Invoice builder (/admin/create-invoice, /admin/edit-invoice/:id).
 * Four steps on the left, the invoice paper on the right. Saves itself a few
 * seconds after each change (one shared create, so a slow network never makes
 * two invoices), checks the invoice before it's shared or downloaded, and
 * fills your business and bank details from your saved defaults.
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const norm = (v) => String(v || '').trim().toUpperCase();
const rupees = (n) => `₹${round2(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const toMillis = (v) => {
    if (!v) return 0;
    if (typeof v?.toMillis === 'function') return v.toMillis();
    if (typeof v === 'object' && typeof v.seconds === 'number') return v.seconds * 1000;
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? 0 : t;
};
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Old notes were plain text; the editor works in HTML. */
const asHtml = (text) => {
    const s = String(text || '');
    if (!s || /<[a-z][\s\S]*>/i.test(s)) return s;
    return s.split('\n').map(line => `<div>${escapeHtml(line) || '<br>'}</div>`).join('');
};

// Only these fields are written back, so a payment, claim or "last sent" stamp
// made elsewhere while this editor is open is never overwritten.
const EDITOR_FIELDS = [
    'senderName', 'senderContact', 'senderEmail', 'senderGst', 'senderAddress',
    'clientName', 'clientAddress', 'clientGst', 'clientEmail', 'clientState',
    'invoiceNumber', 'invoiceDate', 'dueDate', 'advancePaid', 'note', 'paymentDetails',
    'showNotes', 'showPaymentDetails', 'showUPI', 'upiId', 'qrType', 'customQrImage',
    'showGst', 'gstPercentage', 'showFooter', 'showAdvance', 'showSignatureBlock', 'showPaymentButton', 'paymentLink',
    'selectedLogo', 'showSeal', 'showSignatures', 'providerSignature', 'attachments',
];

const FALLBACK_SELLER = {
    senderName: 'Newbi Entertainment & Marketing LLP',
    senderAddress: 'Property No. 55, 3rdFloor SAIDULAJAB, Gadaipur, Sainik Farm, New Delhi, Delhi 110030',
    senderContact: '+91 93043 72773',
    senderEmail: 'partnership@newbi.live',
};
const SELLER_KEYS = ['senderName', 'senderAddress', 'senderContact', 'senderEmail', 'senderGst', 'paymentDetails', 'upiId'];
// Placeholder text the old builder put on new invoices.
const PLACEHOLDER = /X{8,}|YOUR NAME|YOUR BRANCH|YOUR0{6}|:\s*0{10}\s*$|yourname@upi|email@newbi\.live|\+91 00000 00000/im;
const real = (v) => (typeof v === 'string' && v.trim() && !PLACEHOLDER.test(v) ? v : '');

const blankInvoice = () => ({
    senderName: '', senderContact: '', senderEmail: '', senderGst: '', senderAddress: '',
    clientName: '', clientAddress: '', clientGst: '', clientEmail: '', clientState: '',
    invoiceNumber: '', invoiceDate: todayKey(), dueDate: '',
    advancePaid: '', note: '', paymentDetails: '',
    showNotes: true, showPaymentDetails: true, showUPI: false, upiId: '', qrType: 'auto', customQrImage: '',
    showGst: true, gstPercentage: 18, showFooter: true, showAdvance: true, showSignatureBlock: true,
    showPaymentButton: false, paymentLink: '', selectedLogo: 'entertainment',
    showSeal: false, showSignatures: true, providerSignature: '', attachments: [],
});

let itemSeq = 0;
const newItem = (hsn = '') => ({ id: Date.now() + (itemSeq++), name: '', description: '', qty: 1, price: '', customValues: hsn ? { hsn } : {} });

const HSN_COLUMN = { id: 'hsn', label: 'HSN/SAC' };

const STEPS = [
    { id: 'details', label: 'Details', icon: Building2, desc: 'Brand, number and dates, who it is for, and your details' },
    { id: 'items', label: 'Items', icon: ListOrdered, desc: 'What you are billing for' },
    { id: 'payment', label: 'Payment', icon: CreditCard, desc: 'GST, advance, and how the client pays' },
    { id: 'sign', label: 'Sign & seal', icon: ShieldCheck, desc: 'Signature, seal, attachments and a final check' },
];

const DUE_CHIPS = [['On receipt', 0], ['7 days', 7], ['15 days', 15], ['30 days', 30], ['45 days', 45]];

const MAX_INLINE_IMAGE = 700 * 1024; // characters of a data URL kept inside the invoice record

/** Scales the 794 × 1123 paper to the space it has. */
const PaperFrame = ({ fit = 'width', zoom = 1, className, children }) => {
    const ref = useRef(null);
    const [size, setSize] = useState({ w: 0, h: 0 });
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const byWidth = (size.w - 32) / 794;
    const base = fit === 'page' ? Math.min(byWidth, (size.h - 32) / 1123) : byWidth;
    const scale = Math.max(0.1, Math.min(2, base || 0.5)) * zoom;
    return (
        <div ref={ref} className={cn('overflow-auto bg-gray-200/70 p-4 [scrollbar-width:thin] dark:bg-[#050505]', className)}>
            <div style={{ width: 794 * scale, height: 1123 * scale, position: 'relative', margin: '0 auto' }}>
                <div style={{ width: 794, height: 1123, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

const Chip = ({ active, onClick, children, className }) => {
    const a = useAccent();
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn('h-9 shrink-0 rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors',
                active ? cn(a.border, a.soft, a.text) : 'border-black/10 text-gray-600 hover:border-black/20 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/20',
                className)}
        >
            {children}
        </button>
    );
};

const Note = ({ tone = 'gray', icon: Icon = AlertCircle, children, className }) => (
    <p className={cn('flex items-start gap-2 rounded-xl px-3 py-2 text-[12.5px] font-medium', accent(tone).soft, accent(tone).text, className)}>
        <Icon size={14} className="mt-0.5 shrink-0" />
        <span className="min-w-0">{children}</span>
    </p>
);

const SaveDefaultButton = ({ onClick, children = 'Save as default for new invoices' }) => (
    <button type="button" onClick={onClick} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2 text-[12.5px] font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white">
        <Bookmark size={13} /> {children}
    </button>
);

const InvoiceGenerator = () => {
    useStoreSubscription(['invoices']);
    const { id } = useParams();
    const navigate = useNavigate();
    const a = useAccent();
    const invoices = useStore(s => s.invoices) || [];
    const invoicesLoaded = useStore(s => Boolean(s.subscriptionsLoaded?.invoices));
    const siteSettings = useStore(s => s.siteSettings);
    const user = useStore(s => s.user);
    const addToast = useStore(s => s.addToast);

    const [formData, setFormData] = useState(blankInvoice);
    const [items, setItems] = useState(() => [newItem()]);
    const [customColumns, setCustomColumns] = useState([]);

    const [step, setStep] = useState('details');
    const [previewPage, setPreviewPage] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [expanded, setExpanded] = useState(false);
    const [mobilePreview, setMobilePreview] = useState(false);
    const [autosaveStatus, setAutosaveStatus] = useState('idle'); // idle | saving | saved | error
    const [lastSaved, setLastSaved] = useState('');
    const [busy, setBusy] = useState(null); // save | leave | pdf | share
    const [capturing, setCapturing] = useState(false);
    const [dialog, setDialog] = useState(null); // { kind: 'issues' | 'number' | 'leave', purpose }
    const [newColumn, setNewColumn] = useState('');
    const [upload, setUpload] = useState(null); // { name, percent }
    const [linkDraft, setLinkDraft] = useState({ open: false, name: '', url: '' });
    const [defaultsSource, setDefaultsSource] = useState('');
    const editorRef = useRef(null);

    // ── Save bookkeeping ──
    const idRef = useRef(id);
    const isDirtyRef = useRef(false);
    const revisionRef = useRef(0); // bumped on every edit; a save only clears "dirty" if nothing changed while it ran
    const createPromiseRef = useRef(null); // one shared create, so concurrent saves never make two invoices
    const justCreatedIdRef = useRef(null); // the id we just created: don't reload the form when the URL changes to it
    const hasInitializedRef = useRef(false);
    const initialDataLoadedRef = useRef(!id);
    const numberAutoRef = useRef(!id); // the number is ours to pick until the user types one
    const defaultsAppliedRef = useRef(false);
    const committedRef = useRef(null);

    const set = useCallback((patch) => setFormData(prev => ({ ...prev, ...patch })), []);
    const updateItem = (idx, patch) => setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    const numberInput = (value) => (value === '' ? '' : Number(value)); // keep '' while typing so a cleared field doesn't snap to 0

    const existing = id ? invoices.find(inv => inv.id === id) : null;

    // ── Seller defaults: saved defaults → the latest invoice → the old per-browser copy → our details ──
    const sellerDefaults = useCallback((excludeId) => {
        const profile = siteSettings?.invoiceDefaults || {};
        const latest = [...invoices]
            .filter(inv => inv.id !== excludeId && inv.type !== 'upload' && real(inv.senderName))
            .sort((x, y) => toMillis(y.createdAt) - toMillis(x.createdAt))[0] || {};
        let legacy = {};
        try { legacy = JSON.parse(window.localStorage.getItem('newbi_invoice_sender') || '{}') || {}; } catch { legacy = {}; }
        const pick = (key, legacyKey) => real(profile[key]) || real(latest[key]) || real(legacy[legacyKey]) || FALLBACK_SELLER[key] || '';
        return {
            source: Object.keys(profile).length ? 'profile' : latest.id ? 'last' : '',
            values: {
                senderName: pick('senderName', 'name'),
                senderAddress: pick('senderAddress', 'address'),
                senderContact: pick('senderContact', 'contact'),
                senderEmail: pick('senderEmail', 'email'),
                senderGst: pick('senderGst', 'gst'),
                paymentDetails: real(profile.paymentDetails) || real(latest.paymentDetails) || '',
                upiId: real(profile.upiId) || real(latest.upiId) || '',
            },
            profile,
        };
    }, [siteSettings, invoices]);

    const fillSellerGaps = (prev, values) => {
        const patch = {};
        SELLER_KEYS.forEach(key => { if (!real(prev[key]) && values[key]) patch[key] = values[key]; });
        return Object.keys(patch).length ? { ...prev, ...patch } : prev;
    };

    // ── Route changes: a new id loads that invoice; /create-invoice starts clean ──
    useEffect(() => {
        if (id && id === justCreatedIdRef.current) return;
        idRef.current = id;
        hasInitializedRef.current = false;
        isDirtyRef.current = false;
        createPromiseRef.current = null;
        justCreatedIdRef.current = null;
        setAutosaveStatus('idle');
        if (!id) {
            numberAutoRef.current = true;
            defaultsAppliedRef.current = false;
            setFormData(blankInvoice());
            setItems([newItem()]);
            setCustomColumns([]);
            setStep('details');
            initialDataLoadedRef.current = true;
        } else {
            initialDataLoadedRef.current = false;
        }
    }, [id]);

    // Load the invoice being edited.
    useEffect(() => {
        if (!id || id === justCreatedIdRef.current || hasInitializedRef.current) return;
        const invoice = invoices.find(inv => inv.id === id);
        if (!invoice) return;
        hasInitializedRef.current = true;
        setFormData({
            ...blankInvoice(),
            ...invoice,
            invoiceDate: String(invoice.issueDate || invoice.invoiceDate || '').slice(0, 10) || todayKey(),
            dueDate: String(invoice.dueDate || '').slice(0, 10),
            selectedLogo: invoice.selectedLogo || 'entertainment',
            // Older invoices left these unset; match what the client's page shows.
            showNotes: invoice.showNotes !== false,
            showPaymentDetails: invoice.showPaymentDetails !== false,
            showFooter: invoice.showFooter !== false,
            showUPI: invoice.showUPI === undefined ? Boolean(invoice.upiId) : Boolean(invoice.showUPI),
            showPaymentButton: Boolean(invoice.showPaymentButton || invoice.paymentLink),
            showAdvance: invoice.showAdvance ?? (Number(invoice.advancePaid) > 0),
            attachments: Array.isArray(invoice.attachments) ? invoice.attachments : [],
        });
        setItems(Array.isArray(invoice.items) && invoice.items.length ? invoice.items : [newItem()]);
        setCustomColumns(Array.isArray(invoice.customColumns) ? invoice.customColumns : []);
        // Invoices made from a proposal have no seller details yet: fill the gaps (and save them).
        setTimeout(() => {
            initialDataLoadedRef.current = true;
            const { values } = sellerDefaults(id);
            setFormData(prev => (real(prev.senderName) ? prev : fillSellerGaps(prev, values)));
        }, 200);
    }, [id, invoices]); // eslint-disable-line react-hooks/exhaustive-deps

    // New invoices: the next number in the series, and your saved details.
    useEffect(() => {
        if (id || !invoicesLoaded) return;
        if (!defaultsAppliedRef.current) {
            defaultsAppliedRef.current = true;
            const { values, profile, source } = sellerDefaults();
            setDefaultsSource(source);
            setFormData(prev => {
                const next = fillSellerGaps(prev, values);
                return {
                    ...next,
                    showUPI: Boolean(profile.showUPI && next.upiId) || next.showUPI,
                    selectedLogo: profile.selectedLogo || next.selectedLogo,
                    gstPercentage: profile.gstPercentage ?? next.gstPercentage,
                    showSeal: profile.showSeal ?? next.showSeal,
                    note: isBlankText(next.note) && profile.terms ? profile.terms : next.note,
                };
            });
        }
        // Until it's saved or typed over, follow the series (a colleague may have just used this number).
        if (numberAutoRef.current && !idRef.current && !createPromiseRef.current) {
            const next = nextInvoiceNumber(invoices);
            setFormData(prev => (prev.invoiceNumber === next ? prev : { ...prev, invoiceNumber: next }));
        }
    }, [id, invoices, invoicesLoaded, sellerDefaults]);

    // ── Money ──
    const amounts = useMemo(
        () => invoiceAmounts({ items, showGst: formData.showGst, gstPercentage: formData.gstPercentage }),
        [items, formData.showGst, formData.gstPercentage]
    );
    const advance = Math.max(0, Number(formData.advancePaid) || 0);
    // Payments recorded against this invoice since it was issued (live, from the list), as the client's page shows them.
    const paymentsReceived = existing && existing.status !== 'Paid' ? invoiceReceived(existing) : 0;
    const balanceDue = round2(Math.max(0, amounts.total - (formData.showAdvance ? advance : 0) - paymentsReceived));
    const tax = invoiceTaxLines({ ...formData, gstPercentage: Number(formData.gstPercentage) || 0 }, amounts.gstAmount);
    const supply = placeOfSupply(formData);

    // ── Saving ──
    useEffect(() => {
        if (initialDataLoadedRef.current) {
            isDirtyRef.current = true;
            revisionRef.current += 1;
        }
    }, [formData, items, customColumns]);

    const hasContent = Boolean(
        formData.clientName?.trim() ||
        items.some(it => String(it.name || it.description || '').trim() || Number(it.price))
    );

    const buildPayload = () => {
        const payload = {};
        EDITOR_FIELDS.forEach(key => { if (formData[key] !== undefined) payload[key] = formData[key]; });
        return {
            ...payload,
            invoiceNumber: String(formData.invoiceNumber || '').trim(),
            senderGst: cleanGstin(formData.senderGst),
            clientGst: cleanGstin(formData.clientGst),
            advancePaid: advance,
            gstPercentage: Number(formData.gstPercentage) || 0,
            // Razorpay is the only way to pay: no bank details, UPI QR or other payment link on invoices.
            showUPI: false,
            showPaymentDetails: false,
            showPaymentButton: false,
            paymentLink: '',
            items: items.map(it => ({
                ...it,
                qty: it.qty === '' || it.qty === null || it.qty === undefined ? 1 : Number(it.qty) || 0,
                price: Number(it.price) || 0,
            })),
            customColumns,
            amount: amounts.total,
            total: amounts.total,
            issueDate: formData.invoiceDate,
            updatedAt: new Date().toISOString(),
        };
    };

    const markSaved = () => {
        setAutosaveStatus('saved');
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    // One save path for autosave, Save, Share and leaving. Returns the invoice id.
    const persist = async () => {
        const revision = revisionRef.current;
        const payload = buildPayload();
        const { addInvoice, updateInvoice } = useStore.getState();
        if (idRef.current) {
            await updateInvoice(idRef.current, payload);
        } else if (!createPromiseRef.current) {
            createPromiseRef.current = addInvoice({ ...payload, status: 'Pending', createdAt: new Date().toISOString() });
            let res;
            try { res = await createPromiseRef.current; } catch (err) { createPromiseRef.current = null; throw err; }
            justCreatedIdRef.current = res.id;
            idRef.current = res.id;
            hasInitializedRef.current = true;
            initialDataLoadedRef.current = true;
            navigate(`/admin/edit-invoice/${res.id}`, { replace: true });
        } else {
            // Another save is creating it: wait, then write this (newer) copy on top.
            const res = await createPromiseRef.current;
            await updateInvoice(res.id, payload);
        }
        if (revisionRef.current === revision) isDirtyRef.current = false;
        markSaved();
        return idRef.current;
    };

    // Autosave a few seconds after the last change.
    useEffect(() => {
        if (!initialDataLoadedRef.current || !isDirtyRef.current) return undefined;
        if (!idRef.current && !hasContent) return undefined;
        const timer = setTimeout(async () => {
            setAutosaveStatus('saving');
            try { await persist(); } catch (err) {
                console.error('Invoice autosave failed:', err);
                setAutosaveStatus('error');
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [formData, items, customColumns, id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Keep the last committed copy so leaving the page (or switching invoice) can save it.
    useEffect(() => { committedRef.current = { id: idRef.current, hasContent, payload: buildPayload() }; });
    useEffect(() => () => {
        const snap = committedRef.current;
        if (!snap || !isDirtyRef.current) return;
        const { updateInvoice } = useStore.getState();
        if (snap.id) updateInvoice(snap.id, snap.payload).catch(err => console.error('Invoice save on leave failed:', err));
        else if (createPromiseRef.current) createPromiseRef.current.then(res => updateInvoice(res.id, snap.payload)).catch(() => {});
    }, [id]);

    useEffect(() => {
        const warn = (e) => {
            if (!isDirtyRef.current || (!idRef.current && !hasContent)) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [hasContent]);

    // ── Checks before sharing or downloading ──
    // While our own create is in flight its copy is already in the list; don't flag it.
    const numberClash = Boolean(norm(formData.invoiceNumber)) && !(createPromiseRef.current && !idRef.current) && invoices.some(inv => inv.id !== idRef.current && norm(inv.invoiceNumber) === norm(formData.invoiceNumber));
    const nextFreeNumber = useMemo(() => nextInvoiceNumber(invoices), [invoices]);
    const hasHsn = customColumns.some(c => c.id === HSN_COLUMN.id);

    const issues = useMemo(() => {
        const list = [];
        const add = (stepId, level, text) => list.push({ step: stepId, level, text });
        // Details
        if (!String(formData.invoiceNumber || '').trim()) add('details', 'error', 'Add an invoice number.');
        else if (numberClash) add('details', 'error', `${formData.invoiceNumber} is already used by another invoice.`);
        if (!formData.invoiceDate) add('details', 'error', 'Add the issue date.');
        if (formData.dueDate && formData.invoiceDate && formData.dueDate < formData.invoiceDate) add('details', 'error', 'The due date is before the issue date.');
        if (!formData.dueDate) add('details', 'warn', 'No due date. Clients tend to pay sooner with one.');
        if (!String(formData.clientName || '').trim()) add('details', 'error', 'Add who the invoice is for.');
        if (!String(formData.clientAddress || '').trim()) add('details', 'warn', "Add the client's billing address.");
        const clientGst = gstinProblem(formData.clientGst);
        if (clientGst === 'shape') add('details', 'error', "The client's GSTIN doesn't look right. It has 15 characters, like 07AAACN1234F1Z5.");
        if (clientGst === 'checksum') add('details', 'warn', "The client's GSTIN may have a typo (its last character doesn't match).");
        if (formData.showGst && !placeOfSupply(formData)) add('details', 'warn', "Add the client's GSTIN or state, so the invoice shows CGST + SGST or IGST and the place of supply.");
        if (formData.clientEmail && !isEmail(formData.clientEmail)) add('details', 'warn', "The client's email doesn't look right.");
        if (!real(formData.senderName)) add('details', 'error', 'Add your business name.');
        const sellerGst = gstinProblem(formData.senderGst);
        if (formData.showGst && !cleanGstin(formData.senderGst)) add('details', 'error', 'Add your GSTIN. A GST invoice must show it.');
        if (sellerGst === 'shape' || (formData.senderGst && PLACEHOLDER.test(formData.senderGst))) add('details', 'error', "Your GSTIN doesn't look right.");
        if (sellerGst === 'checksum') add('details', 'warn', 'Your GSTIN may have a typo.');
        if (!real(formData.senderContact) || !real(formData.senderEmail)) add('details', 'warn', 'Your phone or email is missing or still placeholder text.');
        // Items
        const used = items.filter(it => String(it.name || it.description || '').trim() || Number(it.price));
        if (!used.length) add('items', 'error', 'Add at least one item.');
        items.forEach((it, i) => {
            const named = String(it.name || it.description || '').trim();
            if (!named && Number(it.price)) add('items', 'error', `Item ${i + 1} needs a name.`);
            if (named && !(Number(it.price) > 0)) add('items', 'warn', `Item ${i + 1} has no rate.`);
            if (it.qty !== '' && Number(it.qty) <= 0 && (named || Number(it.price))) add('items', 'error', `Item ${i + 1}: the quantity must be more than 0.`);
        });
        if (hasHsn && used.some(it => !String(it.customValues?.hsn || '').trim())) add('items', 'warn', 'Some items have no HSN/SAC code.');
        if (used.length && amounts.total <= 0) add('items', 'error', 'The total is ₹0.');
        // Payment
        if (formData.showGst && !GST_RATES.includes(Number(formData.gstPercentage))) add('payment', 'warn', `${formData.gstPercentage || 0}% isn't a standard GST rate.`);
        if (formData.showAdvance && advance > amounts.total && amounts.total > 0) add('payment', 'error', 'The advance is more than the invoice total.');
        // Sign
        if (formData.showSignatures && !formData.providerSignature) add('sign', 'warn', 'The signature box is empty. Add the authorised signature.');
        if (!formData.showSignatures && !formData.showSeal) add('sign', 'warn', 'No signature or seal. Tax invoices are normally signed.');
        return list;
    }, [formData, items, amounts.total, advance, numberClash, hasHsn]);

    const errors = issues.filter(i => i.level === 'error');
    const stepErrors = (stepId) => issues.filter(i => i.step === stepId && i.level === 'error').length;

    // ── Paper ──
    const paperData = {
        ...formData,
        advancePaid: advance,
        gstPercentage: Number(formData.gstPercentage) || 0,
        showUPI: false,
        showPaymentDetails: false,
        paymentLink: '',
    };
    const pages = paginateInvoice(items, paperData);
    const pageCount = pages.length;
    const shownPage = Math.min(previewPage, pageCount - 1);

    const goStep = (stepId) => {
        setStep(stepId);
        setPreviewPage(stepId === 'details' || stepId === 'items' ? 0 : Math.max(0, pageCount - 1));
        editorRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const stepIndex = STEPS.findIndex(s => s.id === step);

    // ── Actions ──
    const leave = async () => {
        if (isDirtyRef.current && (idRef.current || hasContent)) {
            setBusy('leave');
            try { await persist(); } catch {
                setBusy(null);
                setDialog({ kind: 'leave' });
                return;
            }
            setBusy(null);
        }
        isDirtyRef.current = false;
        navigate('/admin/invoices');
    };

    const saveAndClose = async (force = false) => {
        if (!force && numberClash) { setDialog({ kind: 'number', purpose: 'save' }); return; }
        if (!idRef.current && !hasContent) { navigate('/admin/invoices'); return; }
        setBusy('save');
        try {
            const savedId = await persist();
            isDirtyRef.current = false;
            navigate(savedId ? `/admin/invoices?invoice=${savedId}` : '/admin/invoices');
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', { title: 'Invoice not saved', action: { label: 'Try again', onClick: () => saveAndClose(force) } });
        } finally {
            setBusy(null);
        }
    };

    /** Saves and returns the id when the invoice is ready to go out; otherwise shows what's missing. */
    const readyToSend = async () => {
        if (errors.length) { setDialog({ kind: 'issues', purpose: 'share' }); return null; }
        setBusy('share');
        try { return await persist(); } catch {
            addToast('Check your connection and try again.', 'error', { title: 'Invoice not saved' });
            return null;
        } finally { setBusy(null); }
    };

    const shareUrl = (invoiceId, via) => `${window.location.origin}/invoice/${invoiceId}?via=${via}`;
    const share = async (how) => {
        const savedId = await readyToSend();
        if (!savedId) return;
        if (how === 'link') {
            const ok = await copyToClipboard(shareUrl(savedId, 'link'));
            addToast(ok ? 'Invoice link copied.' : 'Please try again.', ok ? 'success' : 'error', ok ? undefined : { title: "Couldn't copy the link" });
        } else if (how === 'whatsapp') {
            const text = `Hi${formData.clientName ? ` ${formData.clientName}` : ''}, here is invoice ${formData.invoiceNumber || ''} from Newbi Entertainment & Marketing LLP for ${rupees(balanceDue)}: ${shareUrl(savedId, 'whatsapp')}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        } else if (how === 'open') {
            window.open(`/invoice/${savedId}`, '_blank', 'noopener');
        } else if (how === 'email') {
            isDirtyRef.current = false;
            navigate(`/admin/invoices?invoice=${savedId}`);
        }
    };

    const downloadPdf = async (force = false) => {
        if (!force && errors.length) { setDialog({ kind: 'issues', purpose: 'pdf' }); return; }
        setDialog(null);
        setBusy('pdf');
        setCapturing(true);
        try {
            await new Promise(r => setTimeout(r, 700)); // let the pages and their images render
            const [{ default: JsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
            const pdf = new JsPDF('p', 'mm', 'a4');
            const nodes = document.querySelectorAll('.invoice-pdf-capture .invoice-page-render');
            for (let i = 0; i < nodes.length; i++) {
                const canvas = await html2canvas(nodes[i], {
                    scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
                    onclone: (doc) => doc.documentElement.classList.remove('dark'),
                });
                if (i > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            }
            pdf.save(`Newbi-Invoice-${formData.invoiceNumber || 'draft'}.pdf`);
        } catch (error) {
            console.error(error);
            addToast('Please try again.', 'error', { title: "Couldn't create the PDF", action: { label: 'Try again', onClick: () => downloadPdf(force) } });
        } finally {
            setCapturing(false);
            setBusy(null);
        }
    };

    const saveDefaults = async (part, message = 'New invoices will start with these details.') => {
        try {
            await useStore.getState().updateGeneralSettings({
                invoiceDefaults: { ...(siteSettings?.invoiceDefaults || {}), ...part, updatedAt: new Date().toISOString(), updatedBy: user?.email || null },
            });
            addToast(message, 'success', { title: 'Saved as default' });
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', { title: 'Default not saved', action: { label: 'Try again', onClick: () => saveDefaults(part, message) } });
        }
    };

    // ── Client details from earlier invoices ──
    const knownClients = useMemo(() => {
        const map = new Map();
        [...invoices]
            .sort((x, y) => toMillis(y.createdAt) - toMillis(x.createdAt))
            .forEach(inv => {
                const key = norm(inv.clientName);
                if (key && !map.has(key)) map.set(key, inv);
            });
        return map;
    }, [invoices]);
    const knownClient = knownClients.get(norm(formData.clientName));
    const canFillClient = knownClient && knownClient.id !== idRef.current && (
        (knownClient.clientAddress && knownClient.clientAddress !== formData.clientAddress) ||
        (knownClient.clientGst && cleanGstin(knownClient.clientGst) !== cleanGstin(formData.clientGst)) ||
        (knownClient.clientEmail && knownClient.clientEmail !== formData.clientEmail)
    );

    const lastSignature = useMemo(() => {
        const mine = [...invoices]
            .filter(inv => inv.id !== idRef.current && inv.providerSignature)
            .sort((x, y) => (Number(y.createdBy === user?.uid) - Number(x.createdBy === user?.uid)) || (toMillis(y.updatedAt || y.createdAt) - toMillis(x.updatedAt || x.createdAt)));
        return mine[0]?.providerSignature || '';
    }, [invoices, user?.uid]);

    // ── Items ──
    const addItem = () => setItems(prev => [...prev, newItem(hasHsn ? prev[prev.length - 1]?.customValues?.hsn || '' : '')]);
    const moveItem = (idx, dir) => setItems(prev => {
        const next = [...prev];
        const to = idx + dir;
        if (to < 0 || to >= next.length) return prev;
        [next[idx], next[to]] = [next[to], next[idx]];
        return next;
    });
    const duplicateItem = (idx) => setItems(prev => {
        const copy = { ...prev[idx], id: newItem().id, customValues: { ...(prev[idx].customValues || {}) } };
        return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
    const removeItem = (idx) => setItems(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : [newItem()]));
    const toggleHsn = (on) => setCustomColumns(prev => (on
        ? [HSN_COLUMN, ...prev.filter(c => c.id !== HSN_COLUMN.id)]
        : prev.filter(c => c.id !== HSN_COLUMN.id)));
    const addColumn = () => {
        const label = newColumn.trim();
        if (!label) return;
        setCustomColumns(prev => [...prev, { id: `col-${Date.now()}`, label }]);
        setNewColumn('');
    };

    // ── Dates ──
    const addDays = (n) => {
        const base = formData.invoiceDate ? new Date(`${formData.invoiceDate}T00:00:00`) : new Date();
        base.setDate(base.getDate() + n);
        return todayKey(base);
    };

    // ── Bank ──

    // ── Images kept inside the invoice record ──
    const setSignature = (data) => {
        if (data && String(data).length > MAX_INLINE_IMAGE) { addToast('Draw the signature instead, or use a smaller image.', 'warning', { title: 'That signature image is too large' }); return; }
        set({ providerSignature: data || '' });
    };

    // ── Attachments ──
    const attachments = formData.attachments || [];
    const addAttachmentFile = async (file) => {
        if (!file) return;
        if (file.size > 35 * 1024 * 1024) { addToast(`That file is ${formatBytes(file.size)}. The limit is 35 MB.`, 'warning', { title: 'File too large' }); return; }
        setUpload({ name: file.name, percent: 0 });
        try {
            const res = await useStore.getState().uploadProposalFile(file, (p) => setUpload(u => (u ? { ...u, percent: p } : u)));
            const ext = String(file.name.split('.').pop() || '').toLowerCase();
            const fileType = res.fileType === 'pdf' ? 'pdf' : ['xls', 'xlsx', 'csv'].includes(ext) ? 'spreadsheet' : file.type.startsWith('image/') ? 'image' : 'file';
            setFormData(prev => ({ ...prev, attachments: [...(prev.attachments || []), { id: `att_${Date.now()}`, name: file.name, type: 'file', url: res.url, fileType, size: file.size }] }));
            addToast('File attached.', 'success');
        } catch (err) {
            addToast(err?.message || 'Check your connection and try again.', 'error', { title: 'File not attached' });
        } finally {
            setUpload(null);
        }
    };
    const addAttachmentLink = () => {
        const url = linkDraft.url.trim();
        if (!isHttpsUrl(url)) { addToast('Add a full link, starting with https://', 'warning'); return; }
        let name = linkDraft.name.trim();
        if (!name) { try { name = new URL(url).hostname; } catch { name = 'Link'; } }
        setFormData(prev => ({ ...prev, attachments: [...(prev.attachments || []), { id: `att_${Date.now()}`, name, type: 'link', url, fileType: 'link' }] }));
        setLinkDraft({ open: false, name: '', url: '' });
    };
    const removeAttachment = (attId) => setFormData(prev => ({ ...prev, attachments: (prev.attachments || []).filter(x => x.id !== attId) }));

    const appendTerm = (text) => {
        const current = isBlankText(formData.note) ? '' : asHtml(formData.note);
        set({ note: `${current}<div>${escapeHtml(text)}</div>`, showNotes: true });
    };
    const sellerState = stateOfGstin(formData.senderGst)?.name;
    const TERMS = [
        formData.dueDate ? `Please pay by ${new Date(`${formData.dueDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.` : 'Payment is due on receipt of this invoice.',
        'Please quote the invoice number when you pay.',
        'Interest at 18% a year applies to payments made after the due date.',
        'Tax is not payable on reverse charge.',
        `Subject to ${sellerState || 'Delhi'} jurisdiction.`,
        'This is a computer-generated invoice.',
    ];

    // ── Not found / uploaded ──
    if (id && invoicesLoaded && !existing && id !== justCreatedIdRef.current && !hasInitializedRef.current) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-[#f6f7f9] px-4 font-heading dark:bg-[#07080b]">
                <EmptyState icon={FileText} title="Invoice not found" description="It may have been deleted, or the link is wrong." action={<Button as={Link} to="/admin/invoices" variant="secondary"><ArrowLeft size={14} /> Back to invoices</Button>} />
            </div>
        );
    }
    if (existing?.type === 'upload') {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-[#f6f7f9] px-4 font-heading dark:bg-[#07080b]">
                <EmptyState icon={Upload} title="This invoice is an uploaded PDF" description="Its details are edited from the invoice panel, not the builder." action={<Button as={Link} to={`/admin/invoices?invoice=${existing.id}`} variant="secondary"><ArrowLeft size={14} /> Open in invoices</Button>} />
            </div>
        );
    }

    // ── Pieces ──
    const statusLine = (
        <p className={cn('truncate text-[12px] font-medium', autosaveStatus === 'error' ? 'text-red-500' : 'text-gray-500')}>
            {autosaveStatus === 'saving' && 'Saving…'}
            {autosaveStatus === 'saved' && `Saved at ${lastSaved}`}
            {autosaveStatus === 'error' && (
                <button type="button" onClick={() => { setAutosaveStatus('saving'); persist().catch(() => setAutosaveStatus('error')); }} className="font-semibold underline">
                    Couldn't save. Tap to try again
                </button>
            )}
            {autosaveStatus === 'idle' && (idRef.current ? 'Changes save automatically' : 'Saves automatically once you add a client or an item')}
        </p>
    );

    const Summary = ({ compact }) => (
        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 text-[13.5px] dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="flex justify-between py-1"><span className="text-gray-500">Subtotal</span><span className="font-semibold tabular-nums">{rupees(amounts.subtotal)}</span></div>
            {tax.lines.map(line => (
                <div key={line.label} className="flex justify-between py-1"><span className="text-gray-500">{line.label}</span><span className="font-semibold tabular-nums">{rupees(line.amount)}</span></div>
            ))}
            <div className="mt-1 flex justify-between border-t border-black/[0.06] pt-2 text-[16px] dark:border-white/[0.08]"><span className="font-bold">Total</span><span className={cn('font-extrabold tabular-nums', a.text)}>{rupees(amounts.total)}</span></div>
            {((formData.showAdvance && advance > 0) || paymentsReceived > 0) && (
                <>
                    {formData.showAdvance && advance > 0 && <div className="flex justify-between py-1"><span className="text-gray-500">Advance received</span><span className="font-semibold tabular-nums">−{rupees(advance)}</span></div>}
                    {paymentsReceived > 0 && <div className="flex justify-between py-1"><span className="text-gray-500">Payments received</span><span className="font-semibold tabular-nums">−{rupees(paymentsReceived)}</span></div>}
                    <div className="flex justify-between py-1 text-[15px]"><span className="font-bold">Balance due</span><span className="font-extrabold tabular-nums">{rupees(balanceDue)}</span></div>
                </>
            )}
            {!compact && amounts.total > 0 && <p className="mt-2 text-[12px] text-gray-500">{amountInWords(amounts.total)}</p>}
        </div>
    );

    const shareMenu = (
        <Menu trigger={({ toggle }) => (
            <Button variant="secondary" onClick={toggle} disabled={Boolean(busy)} aria-label="Share" className="h-10 w-10 px-0 sm:w-auto sm:px-4">
                <Share2 size={15} /> <span className="hidden sm:inline">Share</span>
            </Button>
        )}>
            <MenuItem icon={Link2} onClick={() => share('link')} hint="Anyone with the link can view and pay">Copy client link</MenuItem>
            <MenuItem icon={MessageCircle} onClick={() => share('whatsapp')}>Send on WhatsApp</MenuItem>
            <MenuItem icon={Mail} onClick={() => share('email')} hint="Opens the invoice panel to write the email">Email to client</MenuItem>
            <MenuItem icon={ExternalLink} onClick={() => share('open')}>Open the client's page</MenuItem>
            <MenuItem icon={Download} onClick={() => downloadPdf()} className="sm:hidden">Download PDF</MenuItem>
            <MenuItem icon={Save} onClick={() => saveAndClose()} className="sm:hidden">Save & close</MenuItem>
        </Menu>
    );

    const previewToolbar = (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] bg-white px-3 py-2 dark:border-white/[0.06] dark:bg-[#0b0c11]">
            <Button variant="secondary" size="sm" onClick={() => setExpanded(v => !v)} className="hidden lg:inline-flex">
                {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />} {expanded ? 'Back to editor' : 'Expand'}
            </Button>
            <div className="ml-auto flex items-center gap-1.5">
                <div className="hidden items-center rounded-xl border border-black/10 dark:border-white/10 sm:flex">
                    <button type="button" onClick={() => setZoom(z => Math.max(0.5, round2(z - 0.1)))} aria-label="Zoom out" className="flex h-9 w-9 items-center justify-center"><Minus size={13} /></button>
                    <span className="min-w-[44px] text-center text-[12px] font-semibold tabular-nums text-gray-500">{Math.round(zoom * 100)}%</span>
                    <button type="button" onClick={() => setZoom(z => Math.min(2, round2(z + 0.1)))} aria-label="Zoom in" className="flex h-9 w-9 items-center justify-center"><Plus size={13} /></button>
                </div>
                <div className="flex items-center rounded-xl border border-black/10 dark:border-white/10">
                    <button type="button" onClick={() => setPreviewPage(Math.max(0, shownPage - 1))} disabled={shownPage === 0} aria-label="Previous page" className="flex h-9 w-10 items-center justify-center disabled:opacity-25"><ChevronLeft size={15} /></button>
                    <span className="min-w-[44px] text-center text-[12px] font-semibold tabular-nums">{shownPage + 1} / {pageCount}</span>
                    <button type="button" onClick={() => setPreviewPage(Math.min(pageCount - 1, shownPage + 1))} disabled={shownPage === pageCount - 1} aria-label="Next page" className="flex h-9 w-10 items-center justify-center disabled:opacity-25"><ChevronRight size={15} /></button>
                </div>
            </div>
        </div>
    );

    const paper = (
        <InvoicePage data={paperData} columns={customColumns} pageItems={pages[shownPage]} pageIndex={shownPage} pageCount={pageCount} amounts={amounts} balanceDue={balanceDue} paymentsReceived={paymentsReceived} />
    );

    const gstReadout = (value) => {
        const problem = gstinProblem(value);
        const state = stateOfGstin(value);
        if (!cleanGstin(value)) return null;
        if (problem === 'shape') return <span className="text-red-600 dark:text-red-400">15 characters, like 07AAACN1234F1Z5</span>;
        return (
            <span className={problem === 'checksum' ? accent('amber').text : accent('green').text}>
                {state?.name}{problem === 'checksum' ? ' · check for a typo' : ' · looks right'}
            </span>
        );
    };

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-[#f6f7f9] font-heading text-gray-900 dark:bg-[#07080b] dark:text-white">
            <style dangerouslySetInnerHTML={{ __html: `
                .invoice-builder input::-webkit-outer-spin-button, .invoice-builder input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                .invoice-builder input[type=number] { -moz-appearance: textfield; }
            ` }} />

            {/* Header */}
            <header className="relative z-40 shrink-0 border-b border-black/[0.06] bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#07080b]/90">
                <div className="flex h-16 items-center gap-2 px-2 sm:px-4">
                    <button type="button" onClick={leave} disabled={busy === 'leave'} aria-label="Back to invoices" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 hover:bg-black/5 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-white/10">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold leading-tight">
                            {idRef.current ? 'Edit invoice' : 'New invoice'}
                            {formData.invoiceNumber ? <span className="font-medium text-gray-500"> · {formData.invoiceNumber}</span> : null}
                        </p>
                        {statusLine}
                    </div>
                    <Button variant="secondary" onClick={() => setMobilePreview(true)} className="h-10 w-10 px-0 lg:hidden" aria-label="Preview"><Eye size={16} /></Button>
                    {shareMenu}
                    <Button variant="secondary" onClick={() => saveAndClose()} disabled={Boolean(busy)} className="hidden h-10 sm:inline-flex">
                        <Save size={15} /> {busy === 'save' ? 'Saving…' : 'Save & close'}
                    </Button>
                    <Button variant="accent" onClick={() => downloadPdf()} disabled={Boolean(busy)} className="hidden h-10 sm:inline-flex">
                        <Download size={15} /> {busy === 'pdf' ? 'Preparing…' : 'Download PDF'}
                    </Button>
                </div>
                <nav aria-label="Invoice steps" className="flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden">
                    {STEPS.map((s, i) => {
                        const active = step === s.id;
                        const errs = stepErrors(s.id);
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => goStep(s.id)}
                                aria-current={active ? 'step' : undefined}
                                className={cn('flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
                                    active ? a.solid : 'text-gray-600 hover:bg-black/5 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white')}
                            >
                                <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold', active ? 'bg-white/25 dark:bg-black/15' : 'bg-black/5 dark:bg-white/10')}>{i + 1}</span>
                                {s.label}
                                {errs > 0 && !active && <span className="h-2 w-2 rounded-full bg-red-500" aria-label={`${errs} to fix`} />}
                            </button>
                        );
                    })}
                </nav>
            </header>

            <main className="flex min-h-0 flex-1 overflow-hidden">
                {/* Editor */}
                <section ref={editorRef} className={cn('invoice-builder min-w-0 flex-1 overflow-y-auto overscroll-contain', expanded && 'lg:hidden')}>
                    <div className="mx-auto max-w-3xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 lg:pb-12">
                        <div className="mb-5">
                            <h2 className="text-[22px] font-extrabold tracking-tight">{STEPS[stepIndex].label}</h2>
                            <p className="text-[13px] text-gray-500">{STEPS[stepIndex].desc}</p>
                        </div>

                        {step === 'details' && (
                            <div className="space-y-5">
                                <BuilderCard title="Company" hint="Its logo heads the invoice">
                                    <div className="grid grid-cols-3 gap-2">
                                        {BRANDS.map(brand => {
                                            const on = formData.selectedLogo === brand.id;
                                            return (
                                                <button key={brand.id} type="button" onClick={() => set({ selectedLogo: brand.id })} aria-pressed={on}
                                                    className={cn('flex flex-col items-center gap-2 rounded-xl border p-2 text-[12px] font-semibold transition-colors',
                                                        on ? cn(a.border, a.soft) : 'border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20')}>
                                                    <span className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-white p-2"><img src={brand.path} alt="" className="h-full w-full object-contain" /></span>
                                                    {brand.label.replace('Newbi ', '')}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </BuilderCard>

                                <BuilderCard title="Number and dates" hint="Numbers run in order: INV-0001, INV-0002…">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <Field label="Invoice number">
                                            <input className={cn(fieldCls, numberClash && 'border-red-500/60')} value={formData.invoiceNumber} onChange={e => { numberAutoRef.current = false; set({ invoiceNumber: e.target.value.toUpperCase() }); }} autoCapitalize="characters" autoComplete="off" />
                                        </Field>
                                        <Field label="Issue date"><input type="date" className={fieldCls} value={formData.invoiceDate || ''} onChange={e => set({ invoiceDate: e.target.value })} /></Field>
                                        <Field label="Due date" optional><input type="date" className={fieldCls} value={formData.dueDate || ''} min={formData.invoiceDate || undefined} onChange={e => set({ dueDate: e.target.value })} /></Field>
                                    </div>
                                    {numberClash && (
                                        <Note tone="red" className="mt-3">
                                            {formData.invoiceNumber} is already used by another invoice.{' '}
                                            <button type="button" className="font-bold underline" onClick={() => set({ invoiceNumber: nextFreeNumber })}>Use {nextFreeNumber}</button>
                                        </Note>
                                    )}
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        <span className="flex h-9 items-center pr-1 text-[12px] font-bold text-gray-500">Due</span>
                                        {DUE_CHIPS.map(([label, n]) => (
                                            <Chip key={label} active={formData.dueDate === addDays(n)} onClick={() => set({ dueDate: addDays(n) })}>{label}</Chip>
                                        ))}
                                        {formData.dueDate && <button type="button" onClick={() => set({ dueDate: '' })} className="h-9 px-2 text-[12px] font-semibold text-gray-500">Clear</button>}
                                    </div>
                                </BuilderCard>

                                <BuilderCard title="Bill to" hint="Who receives and pays this invoice">
                                    <div className="space-y-3">
                                        <Field label="Client name">
                                            <input className={fieldCls} value={formData.clientName} onChange={e => set({ clientName: e.target.value })} placeholder="Company or person" list="invoice-known-clients" autoComplete="off" />
                                        </Field>
                                        <datalist id="invoice-known-clients">
                                            {[...knownClients.values()].slice(0, 200).map(inv => <option key={inv.id} value={inv.clientName} />)}
                                        </datalist>
                                        {canFillClient && (
                                            <button type="button" onClick={() => set({ clientAddress: knownClient.clientAddress || formData.clientAddress, clientGst: knownClient.clientGst || formData.clientGst, clientEmail: knownClient.clientEmail || formData.clientEmail })}
                                                className={cn('flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] font-semibold', a.border, a.soft)}>
                                                <Sparkles size={15} className={a.text} />
                                                <span className="min-w-0 flex-1">Use the address and GSTIN from {knownClient.invoiceNumber || 'their last invoice'}</span>
                                            </button>
                                        )}
                                        <Field label="Billing address">
                                            <textarea className={areaCls} value={formData.clientAddress} onChange={e => set({ clientAddress: e.target.value })} rows={3} />
                                        </Field>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <Field label="Client GSTIN" optional hint={gstReadout(formData.clientGst) || 'Leave empty for unregistered clients'}>
                                                <input className={fieldCls} value={formData.clientGst} onChange={e => set({ clientGst: e.target.value.toUpperCase() })} maxLength={20} autoCapitalize="characters" autoComplete="off" />
                                            </Field>
                                            <Field label="Client email" optional hint="Fills in the email when you send it">
                                                <input type="email" inputMode="email" className={fieldCls} value={formData.clientEmail || ''} onChange={e => set({ clientEmail: e.target.value.trim() })} autoCapitalize="off" />
                                            </Field>
                                        </div>
                                        {stateOfGstin(formData.clientGst) && gstinProblem(formData.clientGst) !== 'shape' ? (
                                            <p className="text-[12.5px] text-gray-500">Place of supply: <span className="font-semibold text-gray-800 dark:text-zinc-200">{supply?.name} ({supply?.code})</span>, from the GSTIN</p>
                                        ) : (
                                            <Field label="Client's state" optional hint="Printed as the place of supply. Decides CGST + SGST or IGST.">
                                                <ThemedSelect className={fieldCls} value={formData.clientState || ''} onChange={e => set({ clientState: e.target.value })}>
                                                    <option value="">Choose a state</option>
                                                    {Object.entries(GST_STATES).filter(([code]) => !['25', '28', '99'].includes(code)).sort((x, y) => x[1].localeCompare(y[1])).map(([code, name]) => (
                                                        <option key={code} value={code}>{name} ({code})</option>
                                                    ))}
                                                </ThemedSelect>
                                            </Field>
                                        )}
                                    </div>
                                </BuilderCard>

                                <BuilderCard
                                    title="Your details"
                                    hint={defaultsSource === 'profile' ? 'Filled from your saved defaults' : defaultsSource === 'last' ? 'Filled from your last invoice' : 'Printed as "Invoice by"'}
                                >
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <Field label="Business name"><input className={fieldCls} value={formData.senderName} onChange={e => set({ senderName: e.target.value })} /></Field>
                                        <Field label="GSTIN" hint={gstReadout(formData.senderGst)}><input className={fieldCls} value={formData.senderGst} onChange={e => set({ senderGst: e.target.value.toUpperCase() })} maxLength={20} autoCapitalize="characters" autoComplete="off" /></Field>
                                        <Field label="Phone"><input type="tel" inputMode="tel" className={fieldCls} value={formData.senderContact} onChange={e => set({ senderContact: e.target.value })} /></Field>
                                        <Field label="Email"><input type="email" inputMode="email" className={fieldCls} value={formData.senderEmail} onChange={e => set({ senderEmail: e.target.value.trim() })} autoCapitalize="off" /></Field>
                                        <div className="sm:col-span-2"><Field label="Address"><textarea className={areaCls} value={formData.senderAddress} onChange={e => set({ senderAddress: e.target.value })} rows={3} /></Field></div>
                                    </div>
                                    <div className="mt-2">
                                        <SaveDefaultButton onClick={() => saveDefaults({
                                            senderName: formData.senderName, senderAddress: formData.senderAddress, senderContact: formData.senderContact,
                                            senderEmail: formData.senderEmail, senderGst: cleanGstin(formData.senderGst), selectedLogo: formData.selectedLogo,
                                        })} />
                                    </div>
                                </BuilderCard>
                            </div>
                        )}

                        {step === 'items' && (
                            <div className="space-y-5">
                                <BuilderCard title="Columns" hint="Services use a SAC code (for example 998596 for event management)">
                                    <Toggle label="Show an HSN/SAC column" checked={hasHsn} onChange={toggleHsn} />
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        {customColumns.filter(c => c.id !== HSN_COLUMN.id).map(col => (
                                            <span key={col.id} className={cn('inline-flex h-9 items-center gap-1 rounded-full pl-3 pr-1 text-[12.5px] font-semibold', a.chip)}>
                                                {col.label}
                                                <button type="button" onClick={() => setCustomColumns(prev => prev.filter(c => c.id !== col.id))} aria-label={`Remove the ${col.label} column`} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"><X size={13} /></button>
                                            </span>
                                        ))}
                                        <div className="flex items-center gap-1.5">
                                            <input value={newColumn} onChange={e => setNewColumn(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addColumn(); } }} className={cn(fieldCls, 'h-10 w-40 text-[13px]')} placeholder="Another column" enterKeyHint="done" />
                                            <Button size="sm" variant="secondary" onClick={addColumn} disabled={!newColumn.trim()} className="h-10"><Plus size={13} /> Add</Button>
                                        </div>
                                    </div>
                                </BuilderCard>

                                <div className="space-y-3">
                                    {items.map((item, idx) => {
                                        const amount = invoiceLineAmount(item);
                                        return (
                                            <div key={item.id} className="rounded-2xl border border-black/[0.06] bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                                                <div className="mb-3 flex items-center justify-between gap-2">
                                                    <span className="flex items-center gap-2 text-[13px] font-bold">
                                                        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg text-[12px]', a.chip)}>{idx + 1}</span>
                                                        {item.name || item.description ? <span className="line-clamp-1">{item.name || item.description}</span> : <span className="text-gray-400">New item</span>}
                                                    </span>
                                                    <Menu trigger={({ toggle }) => (
                                                        <Button size="sm" variant="ghost" onClick={toggle} aria-label={`Actions for item ${idx + 1}`} className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
                                                    )}>
                                                        <MenuItem icon={Copy} onClick={() => duplicateItem(idx)}>Duplicate</MenuItem>
                                                        {idx > 0 && <MenuItem icon={ArrowUp} onClick={() => moveItem(idx, -1)}>Move up</MenuItem>}
                                                        {idx < items.length - 1 && <MenuItem icon={ArrowDown} onClick={() => moveItem(idx, 1)}>Move down</MenuItem>}
                                                        <MenuItem icon={Trash2} danger onClick={() => removeItem(idx)}>Remove</MenuItem>
                                                    </Menu>
                                                </div>
                                                <div className="space-y-3">
                                                    <Field label="Service"><input className={fieldCls} value={item.name || ''} onChange={e => updateItem(idx, { name: e.target.value })} placeholder="e.g. Brand activation" /></Field>
                                                    <Field label="Description" optional><textarea className={areaCls} rows={2} value={item.description || ''} onChange={e => updateItem(idx, { description: e.target.value })} /></Field>
                                                    <div className={cn('grid gap-3', hasHsn ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}>
                                                        {hasHsn && (
                                                            <Field label="HSN/SAC">
                                                                <input className={fieldCls} inputMode="numeric" value={item.customValues?.hsn || ''} onChange={e => updateItem(idx, { customValues: { ...(item.customValues || {}), hsn: e.target.value.replace(/[^0-9A-Za-z]/g, '') } })} maxLength={8} />
                                                            </Field>
                                                        )}
                                                        <Field label="Qty"><input type="number" inputMode="decimal" min="0" className={cn(fieldCls, 'text-center')} value={item.qty} onChange={e => updateItem(idx, { qty: numberInput(e.target.value) })} /></Field>
                                                        <Field label="Rate (₹)"><input type="number" inputMode="decimal" min="0" step="0.01" className={cn(fieldCls, 'text-right')} placeholder="0" value={item.price} onChange={e => updateItem(idx, { price: numberInput(e.target.value) })} /></Field>
                                                        <Field label="Amount"><div className={cn(fieldCls, 'flex items-center justify-end bg-black/[0.03] tabular-nums dark:bg-white/[0.02]')}>{rupees(amount)}</div></Field>
                                                    </div>
                                                    {customColumns.some(c => c.id !== HSN_COLUMN.id) && (
                                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                                            {customColumns.filter(c => c.id !== HSN_COLUMN.id).map(col => (
                                                                <Field key={col.id} label={col.label}>
                                                                    <input className={fieldCls} value={item.customValues?.[col.id] || ''} onChange={e => updateItem(idx, { customValues: { ...(item.customValues || {}), [col.id]: e.target.value } })} />
                                                                </Field>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <button type="button" onClick={addItem}
                                        className={cn('flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-[13.5px] font-bold transition-colors', a.border, a.text, 'hover:opacity-80')}>
                                        <Plus size={16} /> Add item
                                    </button>
                                </div>
                                <Summary />
                            </div>
                        )}

                        {step === 'payment' && (
                            <div className="space-y-5">
                                <BuilderCard title="GST" hint="Charged on the subtotal">
                                    <Toggle label="Charge GST" checked={Boolean(formData.showGst)} onChange={v => set({ showGst: v })} />
                                    {formData.showGst && (
                                        <div className="mt-3 space-y-3">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {GST_RATES.map(r => <Chip key={r} active={Number(formData.gstPercentage) === r} onClick={() => set({ gstPercentage: r })}>{r}%</Chip>)}
                                                <label className="flex items-center gap-1.5">
                                                    <span className="sr-only">Other rate</span>
                                                    <input type="number" inputMode="decimal" min="0" max="100" step="0.01" className={cn(fieldCls, 'h-9 w-24 text-center text-[13px]')} value={formData.gstPercentage} onChange={e => set({ gstPercentage: numberInput(e.target.value) })} />
                                                    <span className="text-[12px] font-semibold text-gray-500">%</span>
                                                </label>
                                            </div>
<Note tone={tax.type === 'single' ? 'amber' : 'blue'} icon={tax.type === 'single' ? AlertTriangle : CheckCircle2}>
                                                {tax.type === 'inter'
                                                    ? `IGST ${amounts.gstRate}%: you're in ${tax.seller.name} and the client is in ${tax.client.name}.`
                                                    : tax.type === 'intra'
                                                        ? `CGST ${amounts.gstRate / 2}% + SGST ${amounts.gstRate / 2}%: you and the client are both in ${tax.seller.name}.`
                                                        : !tax.seller
                                                            ? 'Add your GSTIN so the invoice can show CGST + SGST or IGST. Until then it prints one GST line.'
                                                            : "Add the client's GSTIN or state so the invoice can show CGST + SGST or IGST. Until then it prints one GST line."}
                                            </Note>
                                        </div>
                                    )}
                                </BuilderCard>

                                <BuilderCard title="Advance" hint="Money already received before this invoice">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <Field label="Advance received (₹)"><input type="number" inputMode="decimal" min="0" className={fieldCls} value={formData.advancePaid} onChange={e => set({ advancePaid: numberInput(e.target.value) })} /></Field>
                                        <Field label="Balance due"><div className={cn(fieldCls, 'flex items-center bg-black/[0.03] tabular-nums dark:bg-white/[0.02]')}>{rupees(balanceDue)}</div></Field>
                                    </div>
                                    <div className="mt-3"><Toggle label="Show the advance and balance on the invoice" hint="Off: the client sees the full total" checked={Boolean(formData.showAdvance)} onChange={v => set({ showAdvance: v })} /></div>
                                </BuilderCard>

                                <BuilderCard title="Online payment" hint="Razorpay takes every payment" action={<span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', accent('teal').chip)}><Landmark size={16} /></span>}>
                                    <p className="text-[13px] leading-relaxed text-gray-600 dark:text-zinc-300">
                                        Clients pay the balance on the invoice link with Razorpay (UPI, cards or netbanking). The printed invoice carries a “Pay online” button, and the invoice is marked paid as soon as the payment goes through.
                                    </p>
                                </BuilderCard>

                                <BuilderCard title="Notes and terms" hint='Printed under "Additional note"'>
                                    <Toggle label="Show notes" checked={Boolean(formData.showNotes)} onChange={v => set({ showNotes: v })} />
                                    {formData.showNotes && (
                                        <div className="mt-3 space-y-3">
                                            <RichEditor label="Notes and terms" value={asHtml(formData.note)} onChange={val => set({ note: val })} placeholder="Payment terms, a thank-you note…" minHeight={140} />
                                            <div>
                                                <p className="mb-1.5 text-[12px] font-bold text-gray-500">Add a common term</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {TERMS.map(t => <Chip key={t} onClick={() => appendTerm(t)} className="h-auto min-h-9 whitespace-normal py-1.5 text-left">+ {t}</Chip>)}
                                                </div>
                                            </div>
                                            <SaveDefaultButton onClick={() => saveDefaults({ terms: formData.note }, 'New invoices will start with these terms.')}>Use as default terms</SaveDefaultButton>
                                        </div>
                                    )}
                                </BuilderCard>

                                <Summary />
                            </div>
                        )}

                        {step === 'sign' && (
                            <div className="space-y-5">
                                <BuilderCard title="Authorised signature" hint={`Printed as "For ${formData.senderName || 'your business'} · Authorized Signatory"`}>
                                    <Toggle label="Show the signature box" checked={Boolean(formData.showSignatures)} onChange={v => set({ showSignatures: v })} />
                                    {formData.showSignatures && (
                                        <div className="mt-3 space-y-2">
                                            <SignatureField label="Signature" value={formData.providerSignature || null} onChange={setSignature} hint="Draw it, type it, or upload an image. A transparent PNG looks best." />
                                            {!formData.providerSignature && lastSignature && (
                                                <Button size="sm" variant="secondary" onClick={() => set({ providerSignature: lastSignature })} className="h-10"><Sparkles size={13} /> Use the last signature</Button>
                                            )}
                                        </div>
                                    )}
                                </BuilderCard>

                                <BuilderCard title="Company seal" action={<span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', accent('rose').chip)}><Stamp size={16} /></span>}>
                                    <Toggle label="Stamp the company seal" hint="Sits beside the signature" checked={Boolean(formData.showSeal)} onChange={v => set({ showSeal: v })} />
                                    {formData.showSeal && (
                                        <div className="mt-3 flex justify-center overflow-hidden rounded-xl bg-white p-4"><DocumentSeal className="h-[110px] w-[110px]" /></div>
                                    )}
                                </BuilderCard>

                                <BuilderCard title="Attachments" hint="Purchase order, work report, photos… The client sees them beside the invoice" action={<span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', accent('orange').chip)}><Paperclip size={16} /></span>}>
                                    {attachments.length > 0 && (
                                        <ul className="mb-3 divide-y divide-black/[0.05] rounded-xl border border-black/[0.06] dark:divide-white/[0.05] dark:border-white/[0.08]">
                                            {attachments.map(att => {
                                                const tone = att.fileType === 'pdf' ? 'red' : att.fileType === 'spreadsheet' ? 'green' : att.fileType === 'image' ? 'violet' : att.type === 'link' ? 'blue' : 'gray';
                                                return (
                                                    <li key={att.id} className="flex items-center gap-3 px-3 py-2.5">
                                                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', accent(tone).chip)}>{att.type === 'link' ? <Link2 size={15} /> : <FileText size={15} />}</span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-[13.5px] font-semibold">{att.name}</p>
                                                            <p className="text-[12px] text-gray-500">{att.type === 'link' ? 'Link' : formatBytes(att.size) || 'File'}</p>
                                                        </div>
                                                        <a href={att.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${att.name}`} className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 dark:hover:bg-white/10"><ExternalLink size={15} /></a>
                                                        <button type="button" onClick={() => removeAttachment(att.id)} aria-label={`Remove ${att.name}`} className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-500"><Trash2 size={15} /></button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                    {upload ? (
                                        <UploadProgress percent={upload.percent} step={`Uploading ${upload.name}`} />
                                    ) : linkDraft.open ? (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                <input className={fieldCls} value={linkDraft.url} onChange={e => setLinkDraft(d => ({ ...d, url: e.target.value }))} placeholder="https://" inputMode="url" autoCapitalize="off" />
                                                <input className={fieldCls} value={linkDraft.name} onChange={e => setLinkDraft(d => ({ ...d, name: e.target.value }))} placeholder="Name (optional)" />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="accent" size="sm" onClick={addAttachmentLink} className="h-10">Add link</Button>
                                                <Button variant="ghost" size="sm" onClick={() => setLinkDraft({ open: false, name: '', url: '' })} className="h-10">Cancel</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-black/10 px-4 text-[13px] font-semibold hover:border-black/20 dark:border-white/10 dark:hover:border-white/20">
                                                <Upload size={15} /> Add a file
                                                <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip" onChange={e => { addAttachmentFile(e.target.files?.[0]); e.target.value = ''; }} />
                                            </label>
                                            <Button variant="secondary" onClick={() => setLinkDraft({ open: true, name: '', url: '' })} className="h-11"><Link2 size={15} /> Add a link</Button>
                                        </div>
                                    )}
                                    <p className="mt-2 text-[12px] text-gray-500">Up to 35 MB per file.</p>
                                </BuilderCard>

                                <BuilderCard title="Ready to send?" hint="Checked again when you share or download">
                                    {issues.length === 0 ? (
                                        <Note tone="green" icon={CheckCircle2}>Everything a GST invoice needs is here.</Note>
                                    ) : (
                                        <ul className="space-y-1.5">
                                            {issues.map((issue, i) => (
                                                <li key={i} className="flex items-start gap-2 text-[13px]">
                                                    {issue.level === 'error'
                                                        ? <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
                                                        : <AlertTriangle size={15} className={cn('mt-0.5 shrink-0', accent('amber').text)} />}
                                                    <span className="min-w-0 flex-1">{issue.text}</span>
                                                    {issue.step !== step && <button type="button" onClick={() => goStep(issue.step)} className={cn('shrink-0 text-[12.5px] font-bold', a.text)}>Fix</button>}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <div className="mt-4"><Summary compact /></div>
                                </BuilderCard>
                            </div>
                        )}

                        {/* Step navigation (desktop) */}
                        <div className="mt-8 hidden items-center justify-between lg:flex">
                            <Button variant="ghost" onClick={() => stepIndex > 0 && goStep(STEPS[stepIndex - 1].id)} className={cn('h-11', stepIndex === 0 && 'invisible')}>
                                <ChevronLeft size={16} /> {STEPS[stepIndex - 1]?.label}
                            </Button>
                            {stepIndex < STEPS.length - 1 ? (
                                <Button variant="accent" onClick={() => goStep(STEPS[stepIndex + 1].id)} className="h-11 px-5">Next: {STEPS[stepIndex + 1].label} <ChevronRight size={16} /></Button>
                            ) : (
                                <Button variant="primary" onClick={() => saveAndClose()} disabled={Boolean(busy)} className="h-11 px-5"><Save size={16} /> {busy === 'save' ? 'Saving…' : 'Save & close'}</Button>
                            )}
                        </div>
                    </div>
                </section>

                {/* Phone footer: total and steps */}
                <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#07080b]/95 lg:hidden">
                    <div className="flex h-16 items-center gap-2 px-3">
                        <button type="button" onClick={() => setMobilePreview(true)} className="min-w-0 flex-1 text-left">
                            <span className="block text-[11.5px] text-gray-500">{(formData.showAdvance && advance > 0) || paymentsReceived > 0 ? 'Balance due' : 'Total'}</span>
                            <span className="block truncate text-[17px] font-extrabold tabular-nums">{rupees((formData.showAdvance && advance > 0) || paymentsReceived > 0 ? balanceDue : amounts.total)}</span>
                        </button>
                        {stepIndex > 0 && (
                            <Button variant="secondary" onClick={() => goStep(STEPS[stepIndex - 1].id)} aria-label="Previous step" className="h-11 w-11 px-0"><ChevronLeft size={18} /></Button>
                        )}
                        {stepIndex < STEPS.length - 1 ? (
                            <Button variant="accent" onClick={() => goStep(STEPS[stepIndex + 1].id)} className="h-11">Next <ChevronRight size={16} /></Button>
                        ) : (
                            <Button variant="primary" onClick={() => saveAndClose()} disabled={Boolean(busy)} className="h-11"><Save size={15} /> Save</Button>
                        )}
                    </div>
                </div>

                {/* Paper preview (desktop) */}
                <section className={cn('hidden flex-col overflow-hidden border-l border-black/[0.06] dark:border-white/[0.06] lg:flex', expanded ? 'flex-1 border-l-0' : 'lg:w-[440px] 2xl:w-[620px]')}>
                    {previewToolbar}
                    <PaperFrame key={expanded ? 'page' : 'width'} fit={expanded ? 'page' : 'width'} zoom={zoom} className="flex-1">{paper}</PaperFrame>
                </section>
            </main>

            {/* Paper preview (phones) */}
            <Sheet
                open={mobilePreview}
                onClose={() => setMobilePreview(false)}
                title="Preview"
                subtitle={`${formData.invoiceNumber || 'Invoice'} · ${rupees(amounts.total)}`}
                size="xl"
                bodyClassName="flex flex-col p-0"
                footer={(
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setMobilePreview(false)} className="h-11 flex-1">Keep editing</Button>
                        <Button variant="accent" onClick={() => downloadPdf()} disabled={Boolean(busy)} className="h-11 flex-1"><Download size={15} /> PDF</Button>
                    </div>
                )}
            >
                {previewToolbar}
                <PaperFrame zoom={zoom} className="h-[62dvh] flex-1">{paper}</PaperFrame>
            </Sheet>

            {/* Checks before sharing or downloading */}
            <Sheet
                open={dialog?.kind === 'issues'}
                onClose={() => setDialog(null)}
                variant="dialog"
                size="sm"
                title={dialog?.purpose === 'pdf' ? 'Before you download' : 'Before you send it'}
                subtitle={`${errors.length} thing${errors.length === 1 ? '' : 's'} to fix`}
                footer={dialog?.purpose === 'pdf' ? (
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => { const first = errors[0]; setDialog(null); if (first) goStep(first.step); }} className="h-11 flex-1">Fix it</Button>
                        <Button variant="accent" onClick={() => downloadPdf(true)} className="h-11 flex-1">Download anyway</Button>
                    </div>
                ) : (
                    <Button variant="accent" onClick={() => { const first = errors[0]; setDialog(null); if (first) goStep(first.step); }} className="h-11 w-full">Fix it</Button>
                )}
            >
                <ul className="space-y-2">
                    {errors.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-[14px]">
                            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                            <span className="min-w-0 flex-1">{issue.text}</span>
                            <button type="button" onClick={() => { setDialog(null); goStep(issue.step); }} className={cn('shrink-0 text-[13px] font-bold', a.text)}>{STEPS.find(s => s.id === issue.step)?.label}</button>
                        </li>
                    ))}
                </ul>
            </Sheet>

            <Sheet
                open={dialog?.kind === 'number'}
                onClose={() => setDialog(null)}
                variant="dialog"
                size="sm"
                title="That number is taken"
                subtitle={`${formData.invoiceNumber} is already used by another invoice. Two invoices shouldn't share a number.`}
                footer={(
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button variant="secondary" onClick={() => { setDialog(null); saveAndClose(true); }} className="h-11 flex-1">Save with {formData.invoiceNumber}</Button>
                        <Button variant="accent" onClick={() => { numberAutoRef.current = false; set({ invoiceNumber: nextFreeNumber }); setDialog(null); }} className="h-11 flex-1">Use {nextFreeNumber}</Button>
                    </div>
                )}
            >
                <p className="text-[14px] text-gray-500">Pick the next free number, then save again.</p>
            </Sheet>

            <Sheet
                open={dialog?.kind === 'leave'}
                onClose={() => setDialog(null)}
                variant="dialog"
                size="sm"
                title="Couldn't save your latest changes"
                subtitle="Check your connection. If you leave now, the last few changes will be lost."
                footer={(
                    <div className="flex gap-2">
                        <Button variant="danger" onClick={() => { isDirtyRef.current = false; setDialog(null); navigate('/admin/invoices'); }} className="h-11 flex-1">Leave anyway</Button>
                        <Button variant="accent" onClick={() => { setDialog(null); leave(); }} className="h-11 flex-1">Try again</Button>
                    </div>
                )}
            >
                <p className="text-[14px] text-gray-500">Your invoice is still open here.</p>
            </Sheet>

            {/* Pages drawn off-screen for the PDF */}
            {capturing && (
                <div className="invoice-pdf-capture pointer-events-none fixed left-[-10000px] top-0" aria-hidden="true">
                    {pages.map((pageItems, i) => (
                        <InvoicePage key={i} forCapture data={paperData} columns={customColumns} pageItems={pageItems} pageIndex={i} pageCount={pageCount} amounts={amounts} balanceDue={balanceDue} paymentsReceived={paymentsReceived} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default InvoiceGenerator;
