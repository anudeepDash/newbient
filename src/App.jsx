import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import { useStore } from './lib/store'; 
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { requestNotificationPermission, initForegroundMessaging } from './lib/notifications';
import Layout from './components/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';

import Home from './pages/Home';
import ConcertZone from './pages/ConcertZone';
import Contact from './pages/Contact';
import Invoice from './pages/Invoice';
import Dashboard from './pages/Admin/Dashboard';
import InvoiceGenerator from './pages/Admin/InvoiceGenerator';
import InvoiceManagement from './pages/Admin/InvoiceManagement';
import AnnouncementsManager from './pages/Admin/AnnouncementsManager';
import ConcertManager from './pages/Admin/ConcertManager';
import MessageManager from './pages/Admin/MessageManager';
import ArtistManager from './pages/Admin/ArtistManager';
import ClientRequestManager from './pages/Admin/ClientRequestManager';
import ProposalManagement from './pages/Admin/ProposalManagement';
import ProposalGenerator from './pages/Admin/ProposalGenerator';
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
import BlogPostEditor from './pages/Admin/BlogPostEditor';
import CampaignPublicView from './pages/CampaignPublicView';
import ArtistAnt from './pages/ArtistAnt';
import ArtistantHub from './pages/Admin/ArtistantHub';
import AgreementManagement from './pages/Admin/AgreementManagement';
import AgreementGenerator from './pages/Admin/AgreementGenerator';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import EventScanner from './pages/Admin/EventScanner';
import TicketingManagement from './pages/Admin/TicketingManagement';
import GuestlistManager from './pages/Admin/GuestlistManager';
import CreatorHub from './pages/Admin/CreatorHub';
import DigitalTicket from './pages/DigitalTicket';

// Guards & Components
import AuthOverlay from './components/auth/AuthOverlay';
import AdminGuard from './components/AdminGuard';
import MaintenanceGuard from './components/MaintenanceGuard';
import NeuralToast from './components/ui/NeuralToast';



function App() {
  const { subscribeToData, subscribeToNotifications, checkUserRole, loading, authInitialized } = useStore();




  useEffect(() => {
    const unsubscribeData = subscribeToData();
    const unsubscribeNotifications = subscribeToNotifications();
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
  }, [subscribeToData, subscribeToNotifications]);

    return (
    <Router>

      <ScrollToTop />
      <Suspense fallback={
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
          <LoadingSpinner size="lg" color="#2bd93e" />
          <p className="text-gray-500 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Initializing Interface...</p>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<MaintenanceGuard isPage featureId="home"><Home /></MaintenanceGuard>} />

            <Route path="concertzone" element={<MaintenanceGuard isPage featureId="concerts"><ConcertZone /></MaintenanceGuard>} />
            <Route path="contact" element={<MaintenanceGuard isPage featureId="contact"><Contact /></MaintenanceGuard>} />
            <Route path="invoice/:id" element={<Invoice />} />
            <Route path="proposal/:id" element={<MaintenanceGuard isPage featureId="docs"><Proposal /></MaintenanceGuard>} />
            <Route path="agreement/:id" element={<MaintenanceGuard isPage featureId="docs"><Agreement /></MaintenanceGuard>} />
            <Route path="community" element={<MaintenanceGuard isPage featureId="community"><CommunityJoin /></MaintenanceGuard>} />
            <Route path="creator" element={<MaintenanceGuard isPage featureId="influencer_public"><CreatorJoin /></MaintenanceGuard>} />
            <Route path="creator-dashboard" element={<MaintenanceGuard isPage featureId="influencer_public"><CreatorDashboard /></MaintenanceGuard>} />
            <Route path="forms/:id" element={<MaintenanceGuard isPage featureId="forms_public"><FormViewer /></MaintenanceGuard>} />
            <Route path="giveaway/:slug" element={<MaintenanceGuard isPage featureId="giveaways_public"><GiveawayPage /></MaintenanceGuard>} />
            <Route path="ticket/:id" element={<MaintenanceGuard isPage featureId="ticketing"><DigitalTicket /></MaintenanceGuard>} />
            
            {/* Concert Zone Media System */}
            <Route path="concert-zone" element={<MaintenanceGuard isPage featureId="concerts"><ConcertZoneBlog /></MaintenanceGuard>} />
            <Route path="concert-zone/:category" element={<MaintenanceGuard isPage featureId="concerts"><ConcertZoneBlog /></MaintenanceGuard>} />
            <Route path="concert-zone/:category/:slug" element={<MaintenanceGuard isPage featureId="concerts"><BlogPostDetail /></MaintenanceGuard>} />
            <Route path="artistant" element={<MaintenanceGuard isPage featureId="artistant_public"><ArtistAnt /></MaintenanceGuard>} />
            <Route path="terms" element={<Terms />} />
            <Route path="privacy" element={<Privacy />} />


            {/* Admin Routes wrapped in AdminGuard */}
            <Route path="admin" element={<AdminGuard><Dashboard /></AdminGuard>} />
            <Route path="admin/system-command" element={<AdminGuard><DevSettings /></AdminGuard>} />
            <Route path="admin/manage-admins" element={<AdminGuard><MaintenanceGuard featureId="admins"><AdminManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/invoices" element={<AdminGuard><MaintenanceGuard featureId="invoices"><InvoiceManagement /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/create-invoice" element={<AdminGuard><MaintenanceGuard featureId="invoices"><InvoiceGenerator /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/edit-invoice/:id" element={<AdminGuard><MaintenanceGuard featureId="invoices"><InvoiceGenerator /></MaintenanceGuard></AdminGuard>} />
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


            <Route path="admin/forms" element={<AdminGuard><MaintenanceGuard featureId="forms_public"><FormManager /></MaintenanceGuard></AdminGuard>} />

            <Route path="admin/forms/create" element={<AdminGuard><MaintenanceGuard featureId="forms_public"><FormBuilder /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/forms/edit/:id" element={<AdminGuard><MaintenanceGuard featureId="forms_public"><FormBuilder /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/artists" element={<AdminGuard><MaintenanceGuard featureId="artists"><ArtistManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/client-requests" element={<AdminGuard><MaintenanceGuard featureId="client_requests"><ClientRequestManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/artistant" element={<AdminGuard><MaintenanceGuard featureId="artists"><ArtistantHub /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/volunteer-gigs" element={<AdminGuard><MaintenanceGuard featureId="community"><VolunteerGigManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/guestlists" element={<AdminGuard><MaintenanceGuard featureId="guestlists"><GuestlistManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/upcoming-events" element={<AdminGuard><MaintenanceGuard featureId="upcoming_events"><UpcomingEventsManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/creators" element={<AdminGuard><MaintenanceGuard featureId="influencer"><CreatorHub /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/campaigns" element={<AdminGuard><MaintenanceGuard featureId="influencer"><CreatorHub /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/giveaways" element={<AdminGuard><MaintenanceGuard featureId="giveaways"><GiveawayManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/giveaways/:giveawayId/participants" element={<AdminGuard><MaintenanceGuard featureId="giveaways"><GiveawayParticipants /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/blog" element={<AdminGuard><MaintenanceGuard featureId="blog_announcements"><BlogManager /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/blog/create" element={<AdminGuard><MaintenanceGuard featureId="blog_announcements"><BlogPostEditor /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/blog/edit/:id" element={<AdminGuard><MaintenanceGuard featureId="blog_announcements"><BlogPostEditor /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/scanner" element={<AdminGuard><MaintenanceGuard featureId="ticketing"><EventScanner /></MaintenanceGuard></AdminGuard>} />
            <Route path="admin/ticketing" element={<AdminGuard><MaintenanceGuard featureId="ticketing"><TicketingManagement /></MaintenanceGuard></AdminGuard>} />

            <Route path="campaign/:id" element={<CampaignPublicView />} />
            {/* Auth Action Handler (Password Reset, Email Verify, etc.) */}
            <Route path="auth/action" element={<ActionHandler />} />
          </Route>
        </Routes>
      </Suspense>
      <AuthOverlay />
      <NeuralToast />
    </Router>
  );
}

export default App;
