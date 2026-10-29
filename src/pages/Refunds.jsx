import React from 'react';
import LegalDoc, { P, UL, A } from './legal/LegalDoc';

/*
 * newbi.live/refund-policy. Keep it in step with the cancellation and refund terms in Terms.jsx,
 * and update UPDATED with every change.
 */

const UPDATED = '29 October 2026';
const SUPPORT = <A href="mailto:support@newbi.live">support@newbi.live</A>;

const sections = [
    {
        id: 'tickets',
        title: 'Tickets and passes',
        body: (
            <UL items={[
                'If an event is cancelled, you receive a full refund of the amount you paid for it.',
                'If an event is postponed or moved, your ticket stays valid for the new date or venue. If you cannot attend the new date, write to us and we will review a refund.',
                'Tickets are otherwise non-refundable once issued, unless the event page says differently.',
                'A refund is not due if entry is declined for not following the organiser’s or venue’s rules, or if you do not attend.',
            ]} />
        ),
    },
    {
        id: 'services',
        title: 'Project work',
        body: (
            <UL items={[
                'Cancellation and refund terms for production, activation, campaign and campus work are set out in the proposal or agreement you accept.',
                'If we cannot deliver an agreed service, the amount paid for the undelivered part is returned.',
            ]} />
        ),
    },
    {
        id: 'how-refunds-work',
        title: 'How refunds are paid',
        body: (
            <>
                <P>
                    Approved refunds go back to the account or UPI ID the payment came from, within 5 to 7 working days of approval. We
                    confirm by email when the refund has been sent.
                </P>
                <P>If a payment was deducted but no booking was confirmed, write to us with the payment reference and we will resolve it within 7 working days.</P>
            </>
        ),
    },
    {
        id: 'ask',
        title: 'Request a cancellation or refund',
        body: (
            <P>
                Email {SUPPORT} with your name, the booking or payment reference and the event or service. We reply within a working day.
                You can also use the <A href="/contact">contact page</A>.
            </P>
        ),
    },
];

const Refunds = () => (
    <LegalDoc
        eyebrow="Refunds"
        title="Cancellation &amp; refund"
        highlight="policy."
        updated={UPDATED}
        intro={<p>When a cancellation or refund applies, how to ask for one, and how long it takes.</p>}
        sections={sections}
    />
);

export default Refunds;
