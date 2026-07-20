import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ScrollToTop from './components/ScrollToTop';
import { useStore } from './lib/store'; 
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { requestNotificationPermission, initForegroundMessaging } from './lib/notifications';
import Layout from './components/Layout';
import GlobalLoader from './components/ui/GlobalLoader';

import Home from './pages/Home';
import ConcertZone from './pages/ConcertZone';
import Contact from './pages/Contact';
import Invoice from './pages/Invoice';
import Dashboard from './pages/Admin/Dashboard';
import CampusActivationBuilder from './pages/Admin/CampusActivationBuilder';
import CampusActivationPage from './pages/CampusActivationPage';
import InvoiceGenerator from './pages/Admin/InvoiceGenerator';
import InvoiceManagement from './pages/Admin/InvoiceManagement';
import FinanceDashboard from './pages/Admin/FinanceDashboard';
import SpendsManagement from './pages/Admin/SpendsManagement';
import OtherIncomeManagement from './pages/Admin/OtherIncomeManagement';
import PayeeRegistry from './pages/Admin/PayeeRegistry';
import AnnouncementsManager from './pages/Admin/AnnouncementsManager';
import ConcertManager from './pages/Admin/ConcertManager';
import MessageManager from './pages/Admin/MessageManager';
import ArtistManager from './pages/Admin/ArtistManager';
import ClientRequestManager from './pages/Admin/ClientRequestManager';
import ProposalManagement from './pages/Admin/ProposalManagement';
import AIStudio from './pages/Admin/AIStudio';
import ProposalGenerator from './pages/Admin/ProposalGenerator';
import DocumentPDFGenerator from './pages/Admin/DocumentPDFGenerator';
import DocumentPDFManagement from './pages/Admin/DocumentPDFManagement';
import AgreementGenerator from './pages/Admin/AgreementGenerator';
import Proposal from './pages/Proposal';
import Agreement from './pages/Agreement';
import FormManager from './pages/Admin/FormManager';
import FormBuilder from './pages/Admin/FormBuilder';
import AdminManager from './pages/Admin/AdminManager';
import FormViewer from './pages/FormViewer';
import CommunityJoin from './pages/CommunityJoin';
import CreatorJoin from './pages/CreatorJoin';
import CreatorDashboard from './pages/CreatorDashboard';
import VolunteerGigManager from './pages/Admin/VolunteerGigManager';
import CreatorManager from './pages/Admin/CreatorManager';
import CampaignManager from './pages/Admin/CampaignManager';
import UpcomingEventsManager from './pages/Admin/UpcomingEventsManager';
import Maintenance from './pages/Admin/Maintenance';
import GiveawayManager from './pages/Admin/GiveawayManager';
import GiveawayParticipants from './pages/Admin/GiveawayParticipants';
import DevSettings from './pages/Admin/DevSettings';
import MailingManager from './pages/Admin/MailingManager';
import GiveawayPage from './pages/GiveawayPage';
import ActionHandler from './pages/Auth/ActionHandler';
import ConcertZoneBlog from './pages/ConcertZoneBlog';
import BlogPostDetail from './pages/BlogPostDetail';
import BlogManager from './pages/Admin/BlogManager';
import ConcertZoneStudio from './pages/Admin/ConcertZoneStudio';
import BlogPostEditor from './pages/Admin/BlogPostEditor';
import CampaignPublicView from './pages/CampaignPublicView';
import ArtistAnt from './pages/ArtistAnt';
import ArtistantHub from './pages/Admin/ArtistantHub';
import AgreementManagement from './pages/Admin/AgreementManagement';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import EventScanner from './pages/Admin/EventScanner';
import TicketingManagement from './pages/Admin/TicketingManagement';
import GuestlistManager from './pages/Admin/GuestlistManager';
import CreatorHub from './pages/Admin/CreatorHub';
import CreatorLanding from './pages/CreatorLanding';
import LiveCampaigns from './pages/LiveCampaigns';
import DigitalTicket from './pages/DigitalTicket';
import NewsletterStudio from './pages/Admin/NewsletterStudio';
import PayeeRegistration from './pages/PayeeRegistration';
import VerifyPayout from './pages/VerifyPayout';
import DocumentHub from './pages/Admin/DocumentHub';
import DocumentViewer from './pages/DocumentViewer';
import CampusConnect from './pages/CampusConnect';
import CampusManager from './pages/Admin/CampusManager';


// Guards & Components
import AuthOverlay from './components/auth/AuthOverlay';
import AdminGuard from './components/AdminGuard';
import FinanceGuard from './components/FinanceGuard';
import MaintenanceGuard from './components/MaintenanceGuard';
import NewbiToast from './components/ui/NewbiToast';

function AppContent() {
  const { user, subscribeToData, subscribeToNotifications, checkUserRole, loading, authInitialized } = useStore();
  const location = useLocation();

  const getColorByPath = (path) => {
    if (path.startsWith('/admin')) return '#00F0FF'; // Neon Blue
    if (path.startsWith('/concertzone')) return '#FF4F8B'; // Neon Pink
    if (path.startsWith('/artistant')) return '#A855F7'; // Neon Purple
    return '#39FF14'; // Neon Green
  };

  const currentColor = getColorByPath(location.pathname);
  const isAdmin = ['developer', 'super_admin', 'editor', 'admin', 'founder', 'content_admin', 'gate_manager', 'scanner', 'blog_writer'].includes(user?.role) || localStorage.getItem('adminAuth') === 'true';

  useEffect(() => {
    const unsubscribeData = subscribeToData(isAdmin);
    const unsubscribeNotifications = subscribeToNotifications(user?.uid);
    initForegroundMessaging();
    
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      const { checkUserRole } = useStore.getState();
      checkUserRole(user).then(() => {
          if (user) {
              requestNotificationPermission();
          }
      });
    });

    return () => {
      if (unsubscribeData) unsubscribeData();
      if (unsubscribeNotifications) unsubscribeNotifications();
      if (unsubAuth) unsubAuth();
    };
  }, [subscribeToData, subscribeToNotifications, isAdmin, user?.uid]);

  return (
    <>
      <ScrollToTop />
      
      <AnimatePresence mode="wait">
        {loading && <GlobalLoader key="global-loader" color={currentColor} />}
      </AnimatePresence>

      <Suspense fallback={<GlobalLoader color={currentColor} />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<MaintenanceGuard isPage featureId="home"><Home /></MaintenanceGuard>} />
            <Route path="contact" element={<MaintenanceGuard isPage featureId="contact"><Contact /></MaintenanceGuard>} />
            <Route path="invoice/:id" element={<Invoice />} />
            <Route path="proposal/:id" element={<MaintenanceGuard isPage featureId="docs"><Proposal /></MaintenanceGuard>} />
            <Route path="agreement/:id" element={<MaintenanceGuard isPage featureId="docs"><Agreement /></MaintenanceGuard>} />
            <Route path="community" element={<MaintenanceGuard isPage featureId="community"><CommunityJoin /></MaintenanceGuard>} />

            <Route path="creator" element={<MaintenanceGuard isPage featureId="influencer_public"><CreatorLanding /></MaintenanceGuard>} />
            <Route path="creator/join" element={<MaintenanceGuard isPage featureId="influencer_public"><CreatorJoin /></MaintenanceGuard>} />
            <Route path="campaigns" element={<MaintenanceGuard isPage featureId="influencer_public"><LiveCampaigns /></MaintenanceGuard>} />
            <Route path="creator-dashboard" element={<MaintenanceGuard isPage featureId="influencer_public"><CreatorDashboard /></MaintenanceGuard>} />
            <Route path="creator-dashboard/settings" element={<MaintenanceGuard isPage featureId="influencer_public"><CreatorDashboard /></MaintenanceGuard>} />
            <Route path="forms/:id" element={<MaintenanceGuard isPage featureId="forms_public"><FormViewer /></MaintenanceGuard>} />
            <Route path="giveaway/:slug" element={<MaintenanceGuard isPage featureId="giveaways_public"><GiveawayPage /></MaintenanceGuard>} />
            <Route path="ticket/:id" element={<MaintenanceGuard isPage featureId="ticketing"><DigitalTicket /></MaintenanceGuard>} />
            
            <Route path="concertzone" element={<MaintenanceGuard isPage featureId="concerts"><ConcertZoneBlog /></MaintenanceGuard>} />
            <Route path="concertzone/:category" element={<MaintenanceGuard isPage featureId="concerts"><ConcertZoneBlog /></MaintenanceGuard>} />
            <Route path="concertzone/:category/:slug" element={<MaintenanceGuard isPage featureId="concerts"><BlogPostDetail /></MaintenanceGuard>} />
            <Route path="artistant" element={<MaintenanceGuard isPage featureId="artistant_public"><ArtistAnt /></MaintenanceGuard>} />
            <Route path="terms" element={<Terms />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="register-payment" element={<PayeeRegistration />} />
            <Route path="verify-payout" element={<VerifyPayout />} />

            <Route path="admin" element={<AdminGuard><Dashboard /></AdminGuard>} />
            <Route path="admin/manage-admins" element={<AdminGuard><MaintenanceGuard featureId="admins"><AdminManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/finance" element={<AdminGuard><FinanceGuard><MaintenanceGuard featureId="invoices"><FinanceDashboard /></MaintenanceGuard></FinanceGuard></AdminGuard>} />
            <Route path="admin/spends" element={<AdminGuard><FinanceGuard><MaintenanceGuard featureId="invoices"><SpendsManagement /></MaintenanceGuard></FinanceGuard></AdminGuard>} />
            <Route path="admin/other-income" element={<AdminGuard><FinanceGuard><MaintenanceGuard featureId="invoices"><OtherIncomeManagement /></MaintenanceGuard></FinanceGuard></AdminGuard>} />
            <Route path="admin/payees" element={<AdminGuard><FinanceGuard><MaintenanceGuard featureId="invoices"><PayeeRegistry /></MaintenanceGuard></FinanceGuard></AdminGuard>} />
            <Route path="admin/invoices" element={<AdminGuard><FinanceGuard><MaintenanceGuard featureId="invoices"><InvoiceManagement /></MaintenanceGuard></FinanceGuard></AdminGuard>} />
            <Route path="admin/create-invoice" element={<AdminGuard><FinanceGuard><MaintenanceGuard featureId="invoices"><InvoiceGenerator /></MaintenanceGuard></FinanceGuard></AdminGuard>} />
            <Route path="admin/edit-invoice/:id" element={<AdminGuard><FinanceGuard><MaintenanceGuard featureId="invoices"><InvoiceGenerator /></MaintenanceGuard></FinanceGuard></AdminGuard>} />
            <Route path="admin/announcements" element={<AdminGuard><MaintenanceGuard featureId="blog_announcements"><AnnouncementsManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/concertzone" element={<AdminGuard><MaintenanceGuard featureId="concerts"><ConcertManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/messages" element={<AdminGuard><MaintenanceGuard featureId="messages"><MessageManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/mailing" element={<AdminGuard><MaintenanceGuard featureId="mailing"><MailingManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/proposals" element={<AdminGuard><MaintenanceGuard featureId="docs"><ProposalManagement /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/create-proposal" element={<AdminGuard><MaintenanceGuard featureId="docs"><ProposalGenerator /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/edit-proposal/:id" element={<AdminGuard><MaintenanceGuard featureId="docs"><ProposalGenerator /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/agreements" element={<AdminGuard><MaintenanceGuard featureId="docs"><AgreementManagement /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/agreements/new" element={<AdminGuard><MaintenanceGuard featureId="docs"><AgreementGenerator /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/agreements/edit/:id" element={<AdminGuard><MaintenanceGuard featureId="docs"><AgreementGenerator /></MaintenanceGuard></AdminGuard>} />
            
            <Route path="admin/gen-documents" element={<AdminGuard><MaintenanceGuard featureId="docs"><DocumentPDFManagement /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/create-gen-document" element={<AdminGuard><MaintenanceGuard featureId="docs"><DocumentPDFGenerator /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/edit-gen-document/:id" element={<AdminGuard><MaintenanceGuard featureId="docs"><DocumentPDFGenerator /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/ai-studio" element={<AdminGuard><MaintenanceGuard featureId="docs"><AIStudio /></MaintenanceGuard></AdminGuard>} />

            <Route path="admin/forms" element={<AdminGuard><MaintenanceGuard featureId="forms_public"><FormManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/forms/create" element={<AdminGuard><MaintenanceGuard featureId="forms_public"><FormBuilder /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/forms/edit/:id" element={<AdminGuard><MaintenanceGuard featureId="forms_public"><FormBuilder /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/artists" element={<AdminGuard><MaintenanceGuard featureId="artists"><ArtistManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/client-requests" element={<AdminGuard><MaintenanceGuard featureId="client_requests"><ClientRequestManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/artistant" element={<AdminGuard><MaintenanceGuard featureId="artists"><ArtistantHub /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/volunteer-gigs" element={<AdminGuard><MaintenanceGuard featureId="community"><VolunteerGigManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/guestlists" element={<AdminGuard><MaintenanceGuard featureId="guestlists"><GuestlistManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/upcoming-events" element={<AdminGuard><MaintenanceGuard featureId="upcoming_events"><UpcomingEventsManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/campus" element={<AdminGuard><MaintenanceGuard featureId="campus"><CampusManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/campus/activation/new" element={<AdminGuard><MaintenanceGuard featureId="campus"><CampusActivationBuilder /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/campus/activation/edit/:id" element={<AdminGuard><MaintenanceGuard featureId="campus"><CampusActivationBuilder /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/creators" element={<AdminGuard><MaintenanceGuard featureId="influencer"><CreatorManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/creators/leaderboard" element={<AdminGuard><MaintenanceGuard featureId="influencer"><CreatorManager showLeaderboardOnly={true} /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/creators/:id" element={<AdminGuard><MaintenanceGuard featureId="influencer"><CreatorManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/campaigns" element={<AdminGuard><MaintenanceGuard featureId="influencer"><CampaignManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/campaigns/create" element={<AdminGuard><MaintenanceGuard featureId="influencer"><CampaignManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/campaigns/edit/:id" element={<AdminGuard><MaintenanceGuard featureId="influencer"><CampaignManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/campaigns/manage/:id" element={<AdminGuard><MaintenanceGuard featureId="influencer"><CampaignManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/giveaways" element={<AdminGuard><MaintenanceGuard featureId="giveaways"><GiveawayManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/giveaways/:giveawayId/participants" element={<AdminGuard><MaintenanceGuard featureId="giveaways"><GiveawayParticipants /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/blog" element={<AdminGuard><MaintenanceGuard featureId="blog_announcements"><ConcertZoneStudio /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/concertzone/studio" element={<AdminGuard><MaintenanceGuard featureId="blog_announcements"><ConcertZoneStudio /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/blog/create" element={<AdminGuard><MaintenanceGuard featureId="blog_announcements"><BlogPostEditor /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/blog/edit/:id" element={<AdminGuard><MaintenanceGuard featureId="blog_announcements"><BlogPostEditor /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/newsletter/studio" element={<AdminGuard><MaintenanceGuard featureId="blog_announcements"><NewsletterStudio /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/scanner" element={<AdminGuard><MaintenanceGuard featureId="ticketing"><EventScanner /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/ticketing" element={<AdminGuard><MaintenanceGuard featureId="ticketing"><TicketingManagement /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/documents" element={<AdminGuard><DocumentHub /></AdminGuard>} />

            <Route path="campaign/:id" element={<CampaignPublicView />} />
            <Route path="doc/:id" element={<DocumentViewer />} />
            <Route path="auth/action" element={<ActionHandler />} />
          </Route>
        </Routes>
      </Suspense>
      <AuthOverlay />
      <NewbiToast />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
