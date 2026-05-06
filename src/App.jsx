import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import { useStore } from './lib/store'; // Import store
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { requestNotificationPermission, initForegroundMessaging } from './lib/notifications';
import Layout from './components/Layout';
import Home from './pages/Home';

import ConcertZone from './pages/ConcertZone';
import Contact from './pages/Contact';
import Invoice from './pages/Invoice';
import Dashboard from './pages/Admin/Dashboard';
import InvoiceGenerator from './pages/Admin/InvoiceGenerator';
import InvoiceManagement from './pages/Admin/InvoiceManagement';
import AnnouncementsManager from './pages/Admin/AnnouncementsManager';
import ConcertManager from './pages/Admin/ConcertManager';
import SiteSettings from './pages/Admin/SiteSettings';
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
import AuthOverlay from './components/auth/AuthOverlay';
import AdminGuard from './components/AdminGuard';
import MaintenanceGuard from './components/MaintenanceGuard';
import LoadingScreen from './components/LoadingScreen'; // New Loader
import ConcertZoneBlog from './pages/ConcertZoneBlog'; // New Blog
import BlogPostDetail from './pages/BlogPostDetail'; // New Post
import BlogManager from './pages/Admin/BlogManager'; // New Admin Blog
import BlogPostEditor from './pages/Admin/BlogPostEditor'; // New Editor
import CampaignPublicView from './pages/CampaignPublicView'; // New Public View
import ArtistAnt from './pages/ArtistAnt';
import ArtistantHub from './pages/Admin/ArtistantHub';
import AgreementManagement from './pages/Admin/AgreementManagement';
import AgreementGenerator from './pages/Admin/AgreementGenerator';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import NeuralToast from './components/ui/NeuralToast';
import EventScanner from './pages/Admin/EventScanner';
import TicketingManagement from './pages/Admin/TicketingManagement';
import DigitalTicket from './pages/DigitalTicket';



function App() {
  const { subscribeToData, subscribeToNotifications, checkUserRole, loading, authInitialized } = useStore();
  const [showProgress, setShowProgress] = React.useState(false);

  useEffect(() => {
    // Only show loader if initialization takes more than 500ms
    const timer = setTimeout(() => {
        if (loading || !authInitialized) {
            setShowProgress(true);
        }
    }, 2000);

    return () => clearTimeout(timer);
  }, [loading, authInitialized]);

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
      <LoadingScreen isVisible={showProgress && (loading || !authInitialized)} />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MaintenanceGuard isPage featureId="home"><Home /></MaintenanceGuard>} />

          <Route path="concertzone" element={<MaintenanceGuard isPage featureId="concerts"><ConcertZone /></MaintenanceGuard>} />
          <Route path="contact" element={<MaintenanceGuard isPage featureId="contact"><Contact /></MaintenanceGuard>} />
          <Route path="invoice/:id" element={<Invoice />} />
          <Route path="proposal/:id" element={<Proposal />} />
          <Route path="agreement/:id" element={<Agreement />} />
          <Route path="community" element={<MaintenanceGuard isPage featureId="community"><CommunityJoin /></MaintenanceGuard>} />
          <Route path="creator" element={<MaintenanceGuard isPage featureId="influencer"><CreatorJoin /></MaintenanceGuard>} />
          <Route path="creator-dashboard" element={<MaintenanceGuard isPage featureId="influencer"><CreatorDashboard /></MaintenanceGuard>} />
          <Route path="forms/:id" element={<FormViewer />} />
          <Route path="giveaway/:slug" element={<GiveawayPage />} />
          <Route path="ticket/:id" element={<DigitalTicket />} />
          
          {/* Concert Zone Media System */}
          <Route path="concert-zone" element={<ConcertZoneBlog />} />
          <Route path="concert-zone/:category" element={<ConcertZoneBlog />} />
          <Route path="concert-zone/:category/:slug" element={<BlogPostDetail />} />
          <Route path="artistant" element={<ArtistAnt />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />


          {/* Admin Routes wrapped in AdminGuard */}
          <Route path="admin" element={<AdminGuard><Dashboard /></AdminGuard>} />
          <Route path="admin/dev-settings" element={<AdminGuard><DevSettings /></AdminGuard>} />
          <Route path="admin/manage-admins" element={<AdminGuard><AdminManager /></AdminGuard>} />
          <Route path="admin/invoices" element={<AdminGuard><MaintenanceGuard featureId="invoices"><InvoiceManagement /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/create-invoice" element={<AdminGuard><MaintenanceGuard featureId="invoices"><InvoiceGenerator /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/edit-invoice/:id" element={<AdminGuard><MaintenanceGuard featureId="invoices"><InvoiceGenerator /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/announcements" element={<AdminGuard><MaintenanceGuard featureId="announcements"><AnnouncementsManager /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/concertzone" element={<AdminGuard><MaintenanceGuard featureId="concerts"><ConcertManager /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/messages" element={<AdminGuard><MaintenanceGuard featureId="messages"><MessageManager /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/mailing" element={<AdminGuard><MailingManager /></AdminGuard>} />
          <Route path="admin/site-settings" element={<AdminGuard><MaintenanceGuard featureId="site_content"><SiteSettings /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/proposals" element={<AdminGuard><ProposalManagement /></AdminGuard>} />
          <Route path="admin/create-proposal" element={<AdminGuard><ProposalGenerator /></AdminGuard>} />
          <Route path="admin/edit-proposal/:id" element={<AdminGuard><ProposalGenerator /></AdminGuard>} />
          <Route path="admin/agreements" element={<AdminGuard><AgreementManagement /></AdminGuard>} />
          <Route path="admin/agreements/new" element={<AdminGuard><AgreementGenerator /></AdminGuard>} />
          <Route path="admin/agreements/edit/:id" element={<AdminGuard><AgreementGenerator /></AdminGuard>} />


          <Route path="admin/forms" element={<AdminGuard><MaintenanceGuard featureId="forms"><FormManager /></MaintenanceGuard></AdminGuard>} />

          <Route path="admin/forms/create" element={<AdminGuard><MaintenanceGuard featureId="forms"><FormBuilder /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/forms/edit/:id" element={<AdminGuard><MaintenanceGuard featureId="forms"><FormBuilder /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/artists" element={<AdminGuard><ArtistManager /></AdminGuard>} />
          <Route path="admin/client-requests" element={<AdminGuard><ClientRequestManager /></AdminGuard>} />
          <Route path="admin/artistant" element={<AdminGuard><ArtistantHub /></AdminGuard>} />
          <Route path="admin/volunteer-gigs" element={<AdminGuard><MaintenanceGuard featureId="forms"><VolunteerGigManager /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/upcoming-events" element={<AdminGuard><MaintenanceGuard featureId="upcoming_events"><UpcomingEventsManager /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/creators" element={<AdminGuard><MaintenanceGuard featureId="influencer"><CreatorManager /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/campaigns" element={<AdminGuard><MaintenanceGuard featureId="influencer"><CampaignManager /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/giveaways" element={<AdminGuard><GiveawayManager /></AdminGuard>} />
          <Route path="admin/giveaways/:giveawayId/participants" element={<AdminGuard><GiveawayParticipants /></AdminGuard>} />
          <Route path="admin/blog" element={<AdminGuard><BlogManager /></AdminGuard>} />
          <Route path="admin/blog/create" element={<AdminGuard><BlogPostEditor /></AdminGuard>} />
          <Route path="admin/blog/edit/:id" element={<AdminGuard><BlogPostEditor /></AdminGuard>} />
          <Route path="admin/scanner" element={<AdminGuard><EventScanner /></AdminGuard>} />
          <Route path="admin/ticketing" element={<AdminGuard><TicketingManagement /></AdminGuard>} />

          <Route path="campaign/:id" element={<CampaignPublicView />} />
          {/* Auth Action Handler (Password Reset, Email Verify, etc.) */}
          <Route path="auth/action" element={<ActionHandler />} />
        </Route>
      </Routes>
      <AuthOverlay />
      <NeuralToast />
    </Router>
  );
}

export default App;
