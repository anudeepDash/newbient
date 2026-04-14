import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import { useStore } from './lib/store'; // Import store
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

import ProposalManagement from './pages/Admin/ProposalManagement';
import ProposalGenerator from './pages/Admin/ProposalGenerator';
import Proposal from './pages/Proposal';
import FormManager from './pages/Admin/FormManager';
import FormBuilder from './pages/Admin/FormBuilder';
import AdminManager from './pages/Admin/AdminManager';
import FormViewer from './pages/FormViewer';
import GuestlistManager from './pages/Admin/GuestlistManager';
import CommunityJoin from './pages/CommunityJoin';
import GuestlistJoin from './pages/GuestlistJoin';
import CreatorJoin from './pages/CreatorJoin';
import CreatorDashboard from './pages/CreatorDashboard';
import VolunteerGigManager from './pages/Admin/VolunteerGigManager';
import CreatorManager from './pages/Admin/CreatorManager';
import CampaignManager from './pages/Admin/CampaignManager';
import UpcomingEventsManager from './pages/Admin/UpcomingEventsManager';
import Maintenance from './pages/Admin/Maintenance';
import TicketManager from './pages/Admin/TicketManager';
import GiveawayManager from './pages/Admin/GiveawayManager';
import GiveawayParticipants from './pages/Admin/GiveawayParticipants';
import DevSettings from './pages/Admin/DevSettings';
import MailingManager from './pages/Admin/MailingManager';
import GiveawayPage from './pages/GiveawayPage';
import TicketViewer from './pages/TicketViewer';
import ActionHandler from './pages/Auth/ActionHandler';
import TicketSelection from './pages/TicketSelection';
import AuthOverlay from './components/auth/AuthOverlay';
import AdminGuard from './components/AdminGuard';
import MaintenanceGuard from './components/MaintenanceGuard';
import LoadingScreen from './components/LoadingScreen'; // New Loader
import ConcertZoneBlog from './pages/ConcertZoneBlog'; // New Blog
import BlogPostDetail from './pages/BlogPostDetail'; // New Post
import BlogManager from './pages/Admin/BlogManager'; // New Admin Blog
import BlogPostEditor from './pages/Admin/BlogPostEditor'; // New Editor
import CampaignPublicView from './pages/CampaignPublicView'; // New Public View

function App() {
  const { subscribeToData, subscribeToNotifications, checkUserRole, loading, authInitialized } = useStore();

  useEffect(() => {
    const unsubscribeData = subscribeToData();
    const unsubscribeNotifications = subscribeToNotifications();
    initForegroundMessaging();
    
    let unsubAuth;
    const initAuth = async () => {
      const { auth } = await import('./lib/firebase');
      const { onAuthStateChanged } = await import('firebase/auth');

      unsubAuth = onAuthStateChanged(auth, (user) => {
        const { checkUserRole } = useStore.getState();
        checkUserRole(user).then(() => {
            if (user) {
                requestNotificationPermission();
            }
        });
      });
    };

    initAuth();

    return () => {
      if (unsubscribeData) unsubscribeData();
      if (unsubscribeNotifications) unsubscribeNotifications();
      if (unsubAuth) unsubAuth();
    };
  }, [subscribeToData, subscribeToNotifications]);

    return (
    <Router>
      <LoadingScreen isVisible={loading || !authInitialized} />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MaintenanceGuard isPage featureId="home"><Home /></MaintenanceGuard>} />

          <Route path="concertzone" element={<MaintenanceGuard isPage featureId="concerts"><ConcertZone /></MaintenanceGuard>} />
          <Route path="contact" element={<MaintenanceGuard isPage featureId="contact"><Contact /></MaintenanceGuard>} />
          <Route path="invoice/:id" element={<Invoice />} />
          <Route path="proposal/:id" element={<Proposal />} />
          <Route path="community" element={<MaintenanceGuard isPage featureId="community"><CommunityJoin /></MaintenanceGuard>} />
          <Route path="creator" element={<MaintenanceGuard isPage featureId="influencer"><CreatorJoin /></MaintenanceGuard>} />
          <Route path="creator-dashboard" element={<MaintenanceGuard isPage featureId="influencer"><CreatorDashboard /></MaintenanceGuard>} />
          <Route path="forms/:id" element={<FormViewer />} />
          <Route path="guestlist/join/:id" element={<GuestlistJoin />} />
          <Route path="ticket/:bookingRef" element={<TicketViewer />} />
          <Route path="giveaway/:slug" element={<GiveawayPage />} />
          
          {/* Concert Zone Media System */}
          <Route path="concert-zone" element={<ConcertZoneBlog />} />
          <Route path="concert-zone/:category" element={<ConcertZoneBlog />} />
          <Route path="concert-zone/:category/:slug" element={<BlogPostDetail />} />

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

          <Route path="admin/forms" element={<AdminGuard><MaintenanceGuard featureId="forms"><FormManager /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/guestlists" element={<AdminGuard><GuestlistManager /></AdminGuard>} />

          <Route path="admin/forms/create" element={<AdminGuard><MaintenanceGuard featureId="forms"><FormBuilder /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/forms/edit/:id" element={<AdminGuard><MaintenanceGuard featureId="forms"><FormBuilder /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/tickets" element={<AdminGuard><MaintenanceGuard featureId="tickets"><TicketManager /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/volunteer-gigs" element={<AdminGuard><MaintenanceGuard featureId="forms"><VolunteerGigManager /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/upcoming-events" element={<AdminGuard><MaintenanceGuard featureId="upcoming_events"><UpcomingEventsManager /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/creators" element={<AdminGuard><MaintenanceGuard featureId="influencer"><CreatorManager /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/campaigns" element={<AdminGuard><MaintenanceGuard featureId="influencer"><CampaignManager /></MaintenanceGuard></AdminGuard>} />
          <Route path="admin/giveaways" element={<AdminGuard><GiveawayManager /></AdminGuard>} />
          <Route path="admin/giveaways/:giveawayId/participants" element={<AdminGuard><GiveawayParticipants /></AdminGuard>} />
          <Route path="admin/blog" element={<AdminGuard><BlogManager /></AdminGuard>} />
          <Route path="admin/blog/create" element={<AdminGuard><BlogPostEditor /></AdminGuard>} />
          <Route path="admin/blog/edit/:id" element={<AdminGuard><BlogPostEditor /></AdminGuard>} />

          <Route path="campaign/:id" element={<CampaignPublicView />} />
          <Route path="ticket-selection" element={<TicketSelection />} />
          {/* Auth Action Handler (Password Reset, Email Verify, etc.) */}
          <Route path="auth/action" element={<ActionHandler />} />
        </Route>
      </Routes>
      <AuthOverlay />
    </Router>
  );
}

export default App;
