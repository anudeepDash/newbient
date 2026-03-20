const fs = require('fs');
const path = require('path');

const files = [
    'src/pages/Proposal.jsx',
    'src/pages/Invoice.jsx',
    'src/pages/Admin/CampaignManager.jsx',
    'src/pages/Admin/CreatorManager.jsx',
    'src/pages/Admin/DevSettings.jsx',
    'src/pages/Admin/GiveawayManager.jsx',
    'src/pages/Admin/GiveawayParticipants.jsx',
    'src/pages/Admin/InvoiceGenerator.jsx',
    'src/pages/Admin/InvoiceManagement.jsx',
    'src/pages/Admin/Maintenance.jsx',
    'src/pages/Admin/ProposalGenerator.jsx',
    'src/pages/Admin/SiteContentManager.jsx',
    'src/pages/Admin/TicketManager.jsx',
    'src/pages/Admin/UpcomingEventsManager.jsx',
    'src/pages/Admin/ProposalManagement.jsx',
    'src/pages/Admin/SiteSettings.jsx',
    'src/pages/Admin/MessageManager.jsx',
    'src/pages/Admin/GalleryManager.jsx',
    'src/pages/Admin/FormBuilder.jsx',
    'src/pages/Admin/ConcertManager.jsx',
    'src/pages/Admin/AnnouncementsManager.jsx',
    'src/pages/Admin/AdminManager.jsx',
    'src/components/admin/AdminCommunityHubLayout.jsx'
];

const root = 'c:/Users/anude/OneDrive/Documents/codeBase/newbient';

files.forEach(file => {
    const filePath = path.join(root, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        const updatedContent = content.replace(/BACK TO COMMAND CENTRE/g, 'BACK TO ADMIN DASHBOARD');
        if (content !== updatedContent) {
            fs.writeFileSync(filePath, updatedContent);
            console.log(`Updated: ${file}`);
        }
    } else {
        console.warn(`File not found: ${filePath}`);
    }
});
