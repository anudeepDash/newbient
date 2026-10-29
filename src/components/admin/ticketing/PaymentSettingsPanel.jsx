import React, { useEffect, useState } from 'react';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import { useStore } from '../../../lib/store';
import { callTicketApi } from '../../../lib/ticketApi';
import { Button, Badge } from '../ui';
import { Panel, PanelTitle } from './kit';

/*
 * How buyers of this event pay, at a glance. Razorpay is the only way to pay;
 * the one per-event choice (free bookings) is edited in the sale editor's
 * Payments section (onEdit).
 */

const Row = ({ label, children }) => (
    <div className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
        <span className="text-gray-500">{label}</span>
        <span className="min-w-0 truncate text-right font-semibold">{children}</span>
    </div>
);

const PaymentSettingsPanel = ({ event, onEdit }) => {
    const raw = useStore(s => s.upcomingEvents.find(e => e.id === event?.id)) || event;
    const [gatewayReady, setGatewayReady] = useState(null);
    useEffect(() => { callTicketApi('ticket-config', {}).then(res => setGatewayReady(res.ok ? Boolean(res.data.gatewayReady) : null)); }, []);

    return (
        <Panel className="p-4 sm:p-5">
            <PanelTitle icon={Wallet} tone="blue" title="How buyers pay" hint="Razorpay takes every payment. Tickets are issued the moment it goes through."
                action={onEdit && <Button variant="secondary" className="h-11" onClick={() => onEdit('payments')}><Pencil size={14} /> Edit</Button>} />
            <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                {raw?.payments?.free === true && <Row label="Free bookings"><Badge tone="amber">On: no payment taken</Badge></Row>}
                <Row label="Razorpay (UPI, cards, netbanking)">
                    {gatewayReady ? <Badge tone="green">Ready</Badge> : <Badge tone={gatewayReady === false ? 'amber' : 'gray'}>{gatewayReady === false ? 'Not set up' : 'Checking'}</Badge>}
                </Row>
            </div>
        </Panel>
    );
};

export default PaymentSettingsPanel;
