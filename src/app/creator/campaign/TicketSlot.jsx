/*
 * "Your ticket" block on the campaign page. Owned by Phase 5 (community and
 * the two ticket flows): it shows the creator's campaign ticket here, read
 * from the passes slice (campaignPasses(passes, campaign.id)) and the pass's
 * externalTicket (link or PDF).
 *
 * The campaign page renders <TicketSlot campaign creator /> between the
 * status and the brief, and nothing else depends on it. Until Phase 5 fills
 * it in it renders nothing, so the page never shows an empty block.
 */
// eslint-disable-next-line no-unused-vars
const TicketSlot = ({ campaign, creator }) => null;

export default TicketSlot;
