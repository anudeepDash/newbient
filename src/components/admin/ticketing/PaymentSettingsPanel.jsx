import React, { useEffect, useState } from 'react';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import { useStore } from '../../../lib/store';
import { callTicketApi } from '../../../lib/ticketApi';
import { upiLink } from '../../../lib/ticketing';
import { Button, Badge } from '../ui';
import { Panel, PanelTitle } from './kit';

/*
 * How buyers of this event pay, at a glance. The details are edited in the
 * sale editor's Payments section (onEdit), so they live in one place.
 */

const Row = ({ label, children }) => (
    <div className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
        <span className="text-gray-500">{label}</span>
        <span className="min-w-0 truncate text-right font-semibold">{children}</span>
    </div>
);

const PaymentSettingsPanel = ({ event, onEdit }) => {
    const raw = useStore(s => s.upcomingEvents.find(e => e.id === event?.id)) || event;
    const site = useStore(s => s.paymentDetails);
    const [gatewayReady, setGatewayReady] = useState(null);
    useEffect(() => { callTicketApi('ticket-config', {}).then(res => setGatewayReady(res.ok ? Boolean(res.data.gatewayReady) : null)); }, []);

    const upiOn = raw?.payments?.upi !== false;
    const gatewayOn = raw?.payments?.gateway === true;
    const upiId = raw?.upiId || raw?.paymentDetails?.upiId || '';
    const fallback = !upiId && site?.upiId ? site.upiId : '';
    const shownId = upiId || fallback;
    const preview = raw?.qrCodeUrl
        || (shownId ? `/api/qr?size=480&margin=1&text=${encodeURIComponent(upiLink({ upiId: shownId, payeeName: raw?.upiName || 'Newbi', amount: 1 }))}` : '');

    return (
        <Panel className="p-4 sm:p-5">
            <PanelTitle icon={Wallet} tone="blue" title="How buyers pay" hint="Paid UPI orders wait in Orders until you check the UTR."
                action={onEdit && <Button variant="secondary" className="h-11" onClick={() => onEdit('payments')}><Pencil size={14} /> Edit</Button>} />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                    <Row label="UPI apps">{upiOn ? <Badge tone="green">On</Badge> : <Badge tone="gray">Off</Badge>}</Row>
                    {upiOn && <Row label="UPI ID">{shownId ? <span className="font-mono">{shownId}</span> : <span className="text-red-600 dark:text-red-400">Not set</span>}{fallback && <span className="ml-1 text-[11px] font-medium text-gray-500">(site-wide)</span>}</Row>}
                    {upiOn && raw?.upiName && <Row label="Name shown">{raw.upiName}</Row>}
                    {upiOn && <Row label="Business UPI">{raw?.upiMerchant ? 'Yes' : 'No'}</Row>}
                    <Row label="Razorpay">
                        {gatewayOn && gatewayReady ? <Badge tone="green">On</Badge>
                            : gatewayOn ? <Badge tone="amber">On, but not set up</Badge>
                                : <Badge tone="gray">{gatewayReady === false ? 'Not set up' : 'Off'}</Badge>}
                    </Row>
                </div>
                {upiOn && (
                    <div className="flex flex-col items-center gap-2">
                        {preview
                            ? <img src={preview} alt="Payment QR code" className="h-36 w-36 rounded-2xl border border-black/10 bg-white object-contain p-2 dark:border-white/10" />
                            : <div className="flex h-36 w-36 items-center justify-center rounded-2xl border-2 border-dashed border-black/10 text-gray-400 dark:border-white/10"><QrCode size={32} /></div>}
                        <p className="text-[11px] text-gray-500">{raw?.qrCodeUrl ? 'Your QR image' : 'Checkout makes one per order, for the exact amount'}</p>
                    </div>
                )}
            </div>
        </Panel>
    );
};

export default PaymentSettingsPanel;
