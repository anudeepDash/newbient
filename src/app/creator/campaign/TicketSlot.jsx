import React from 'react';
import YourTicket from '../YourTicket';

/*
 * "Your ticket" on the campaign page: the creator's campaign ticket (Phase 5,
 * src/app/creator/YourTicket.jsx). Renders nothing without a ticket, so the
 * page never shows an empty block. CampaignView places it between the status
 * and the brief.
 */
// eslint-disable-next-line no-unused-vars
const TicketSlot = ({ campaign, creator }) => <YourTicket campaignId={campaign.id} />;

export default TicketSlot;
