import React, { useEffect, useState } from 'react';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import { useStore } from '../../../lib/store';
import { Button } from '../ui';
import { Field, fieldCls } from '../uploads/UploadKit';
import { Panel, PanelTitle } from './kit';

/** Where buyers of this event pay: UPI ID, QR image and an optional payment page. */
const PaymentSettingsPanel = ({ event }) => {
    const addToast = useStore(s => s.addToast);
    const initial = () => ({ upiId: event?.upiId || '', qrCodeUrl: event?.qrCodeUrl || '', gatewayUrl: event?.gatewayUrl || '' });
    const [form, setForm] = useState(initial);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [problem, setProblem] = useState('');

    useEffect(() => { setForm(initial()); setProblem(''); }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const saved = initial();
    const dirty = ['upiId', 'qrCodeUrl', 'gatewayUrl'].some(k => (form[k] || '').trim() !== (saved[k] || '').trim());

    const submit = async (e) => {
        e.preventDefault();
        if (saving) return;
        setProblem('');
        const upiId = form.upiId.trim();
        const gatewayUrl = form.gatewayUrl.trim();
        const qrCodeUrl = form.qrCodeUrl.trim();
        if (upiId && !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) return setProblem('That UPI ID looks wrong. It should look like name@bank.');
        if (gatewayUrl && !/^https?:\/\/\S+$/i.test(gatewayUrl)) return setProblem('The payment page link should start with https://');
        if (qrCodeUrl && !/^https?:\/\/\S+$/i.test(qrCodeUrl)) return setProblem('The QR image link should start with https://');
        setSaving(true);
        try {
            await useStore.getState().updateUpcomingEvent(event.id, { upiId, qrCodeUrl, gatewayUrl });
            addToast('Payment settings saved.', 'success');
        } catch (err) {
            console.error(err);
            setProblem("Couldn't save payment settings. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const uploadQr = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) { addToast('Choose an image file.', 'error'); return; }
        setUploading(true);
        try {
            const url = await useStore.getState().uploadToCloudinary(file);
            if (!url) throw new Error('No URL returned');
            setForm(f => ({ ...f, qrCodeUrl: url }));
            await useStore.getState().updateUpcomingEvent(event.id, { qrCodeUrl: url });
            addToast('QR code uploaded and saved.', 'success');
        } catch (err) {
            console.error(err);
            addToast("Couldn't upload the QR code. Please try again.", 'error');
        } finally {
            setUploading(false);
        }
    };

    const upi = form.upiId.trim();
    const preview = form.qrCodeUrl.trim()
        || (upi ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`upi://pay?pa=${upi}&pn=NEWBI&cu=INR`)}` : '');

    return (
        <Panel className="p-4 sm:p-5">
            <PanelTitle icon={Wallet} tone="blue" title="How buyers pay" hint="Shown on the payment step of checkout. Leave blank to use the site-wide details." />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <form onSubmit={submit} className="space-y-4 lg:col-span-3" noValidate>
                    <Field label="UPI ID">
                        <input className={fieldCls} value={form.upiId} onChange={e => setForm({ ...form, upiId: e.target.value })} placeholder="newbi@okaxis" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
                    </Field>
                    <Field label="QR image link" optional hint="Upload one on the right, or paste a link">
                        <input className={fieldCls} type="url" inputMode="url" autoCapitalize="off" value={form.qrCodeUrl} onChange={e => setForm({ ...form, qrCodeUrl: e.target.value })} placeholder="https://…" />
                    </Field>
                    <Field label="Payment page link" optional hint="A Razorpay or similar page, if you use one">
                        <input className={fieldCls} type="url" inputMode="url" autoCapitalize="off" value={form.gatewayUrl} onChange={e => setForm({ ...form, gatewayUrl: e.target.value })} placeholder="https://…" />
                    </Field>
                    {problem && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{problem}</p>}
                    <div className="flex items-center gap-3">
                        <Button type="submit" variant="accent" className="h-12 px-6" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save'}</Button>
                        {dirty && !saving && <span className="text-[12px] font-semibold text-amber-600 dark:text-amber-300">Unsaved changes</span>}
                    </div>
                </form>

                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/[0.03] p-5 text-center dark:bg-white/[0.03] lg:col-span-2">
                    {preview ? (
                        <img src={preview} alt="Payment QR code" className="h-48 w-48 rounded-2xl border border-black/10 bg-white object-contain p-2 dark:border-white/10" />
                    ) : (
                        <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-black/10 text-gray-400 dark:border-white/10">
                            <QrCode size={40} />
                        </div>
                    )}
                    <p className="text-[12px] text-gray-500">
                        {form.qrCodeUrl.trim() ? 'Your QR image' : upi ? 'Made from the UPI ID (used when there is no QR image)' : 'No QR yet'}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        <Button as="label" variant="secondary" className="h-11 cursor-pointer">
                            <Upload size={14} /> {uploading ? 'Uploading…' : form.qrCodeUrl ? 'Replace QR' : 'Upload QR'}
                            <input type="file" accept="image/*" onChange={uploadQr} className="hidden" disabled={uploading} />
                        </Button>
                        {form.qrCodeUrl && (
                            <Button variant="ghost" className="h-11 text-red-600 dark:text-red-400" onClick={() => setForm({ ...form, qrCodeUrl: '' })}>
                                <Trash2 size={14} /> Remove
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Panel>
    );
};

export default PaymentSettingsPanel;
