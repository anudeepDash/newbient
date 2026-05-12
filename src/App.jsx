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
const InvoiceGenerator = lazy(() => import('./pages/Admin/InvoiceGenerator'));
const InvoiceManagement = lazy(() => import('./pages/Admin/InvoiceManagement'));
const AnnouncementsManager = lazy(() => import('./pages/Admin/AnnouncementsManager'));
const ConcertManager = lazy(() => import('./pages/Admin/ConcertManager'));
const MessageManager = lazy(() => import('./pages/Admin/MessageManager'));
const ArtistManager = lazy(() => import('./pages/Admin/ArtistManager'));
const ClientRequestManager = lazy(() => import('./pages/Admin/ClientRequestManager'));
const ProposalManagement = lazy(() => import('./pages/Admin/ProposalManagement'));
const ProposalGenerator = lazy(() => import('./pages/Admin/ProposalGenerator'));
const Proposal = lazy(() => import('./pages/Proposal'));
const Agreement = lazy(() => import('./pages/Agreement'));
const FormManager = lazy(() => import('./pages/Admin/FormManager'));
const FormBuilder = lazy(() => import('./pages/Admin/FormBuilder'));
const AdminManager = lazy(() => import('./pages/Admin/AdminManager'));
const FormViewer = lazy(() => import('./pages/FormViewer'));
const CommunityJoin = lazy(() => import('./pages/CommunityJoin'));
const CreatorJoin = lazy(() => import('./pages/CreatorJoin'));
const CreatorDashboard = lazy(() => import('./pages/CreatorDashboard'));
const VolunteerGigManager = lazy(() => import('./pages/Admin/VolunteerGigManager'));
const CreatorManager = lazy(() => import('./pages/Admin/CreatorManager'));
const CampaignManager = lazy(() => import('./pages/Admin/CampaignManager'));
const UpcomingEventsManager = lazy(() => import('./pages/Admin/UpcomingEventsManager'));
const Maintenance = lazy(() => import('./pages/Admin/Maintenance'));
const GiveawayManager = lazy(() => import('./pages/Admin/GiveawayManager'));
const GiveawayParticipants = lazy(() => import('./pages/Admin/GiveawayParticipants'));
const DevSettings = lazy(() => import('./pages/Admin/DevSettings'));
const MailingManager = lazy(() => import('./pages/Admin/MailingManager'));
const GiveawayPage = lazy(() => import('./pages/GiveawayPage'));
const ActionHandler = lazy(() => import('./pages/Auth/ActionHandler'));
const ConcertZoneBlog = lazy(() => import('./pages/ConcertZoneBlog'));
const BlogPostDetail = lazy(() => import('./pages/BlogPostDetail'));
const BlogManager = lazy(() => import('./pages/Admin/BlogManager'));
const BlogPostEditor = lazy(() => import('./pages/Admin/BlogPostEditor'));
const CampaignPublicView = lazy(() => import('./pages/CampaignPublicView'));
const ArtistAnt = lazy(() => import('./pages/ArtistAnt'));
const ArtistantHub = lazy(() => import('./pages/Admin/ArtistantHub'));
const AgreementManagement = lazy(() => import('./pages/Admin/AgreementManagement'));
const AgreementGenerator = lazy(() => import('./pages/Admin/AgreementGenerator'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const EventScanner = lazy(() => import('./pages/Admin/EventScanner'));
const TicketingManagement = lazy(() => import('./pages/Admin/TicketingManagement'));
const GuestlistManager = lazy(() => import('./pages/Admin/GuestlistManager'));
const CreatorHub = lazy(() => import('./pages/Admin/CreatorHub'));
const DigitalTicket = lazy(() => import('./pages/DigitalTicket'));

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
