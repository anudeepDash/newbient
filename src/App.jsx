import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useStore } from './lib/store'; // Import store
import Layout from './components/Layout';
import Home from './pages/Home';
import MediaGallery from './pages/MediaGallery';
import ConcertZone from './pages/ConcertZone';
import Contact from './pages/Contact';
import Invoice from './pages/Invoice';
import Dashboard from './pages/Admin/Dashboard';
import InvoiceGenerator from './pages/Admin/InvoiceGenerator';
import InvoiceManagement from './pages/Admin/InvoiceManagement';
import AnnouncementsManager from './pages/Admin/AnnouncementsManager';
import ConcertManager from './pages/Admin/ConcertManager';
import SiteContentManager from './pages/Admin/SiteContentManager';
import MessageManager from './pages/Admin/MessageManager';
import GalleryManager from './pages/Admin/GalleryManager';
import FormManager from './pages/Admin/FormManager';
import FormBuilder from './pages/Admin/FormBuilder';
import AdminManager from './pages/Admin/AdminManager';
import FormViewer from './pages/FormViewer';
import CommunityJoin from './pages/CommunityJoin';
import VolunteerGigManager from './pages/Admin/VolunteerGigManager';
import UpcomingEventsManager from './pages/Admin/UpcomingEventsManager';
import Maintenance from './pages/Admin/Maintenance';
import TicketManager from './pages/Admin/TicketManager';
import DevSettings from './pages/Admin/DevSettings';
import MaintenanceGuard from './components/MaintenanceGuard';
import ActionHandler from './pages/Auth/ActionHandler';
function App() {
  const { subscribeToData, checkUserRole } = useStore();

  useEffect(() => {
    let unsubAuth;
    const initAuth = async () => {
      const { auth } = await import('./lib/firebase');
      const { onAuthStateChanged } = await import('firebase/auth');

      unsubAuth = onAuthStateChanged(auth, (user) => {
        checkUserRole(user);
      });
    };

    const unsubscribe = subscribeToData();
    initAuth();

    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubAuth) unsubAuth();
    };
  }, [subscribeToData, checkUserRole]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MaintenanceGuard isPage featureId="home"><Home /></MaintenanceGuard>} />
          <Route path="gallery" element={<MaintenanceGuard isPage featureId="gallery"><MediaGallery /></MaintenanceGuard>} />
          <Route path="concerts" element={<MaintenanceGuard isPage featureId="concerts"><ConcertZone /></MaintenanceGuard>} />
          <Route path="contact" element={<MaintenanceGuard isPage featureId="contact"><Contact /></MaintenanceGuard>} />
          <Route path="invoice/:id" element={<Invoice />} />
          <Route path="community-join" element={<MaintenanceGuard isPage featureId="community"><CommunityJoin /></MaintenanceGuard>} />
          <Route path="forms/:id" element={<FormViewer />} />

          {/* Admin Routes */}
          <Route path="admin" element={<Dashboard />} />
          <Route path="admin/dev-settings" element={<DevSettings />} />
          <Route path="admin/manage-admins" element={<AdminManager />} />
          <Route path="admin/invoices" element={<MaintenanceGuard featureId="invoices"><InvoiceManagement /></MaintenanceGuard>} />
          <Route path="admin/create-invoice" element={<MaintenanceGuard featureId="invoices"><InvoiceGenerator /></MaintenanceGuard>} />
          <Route path="admin/edit-invoice/:id" element={<MaintenanceGuard featureId="invoices"><InvoiceGenerator /></MaintenanceGuard>} />
          <Route path="admin/announcements" element={<MaintenanceGuard featureId="announcements"><AnnouncementsManager /></MaintenanceGuard>} />
          <Route path="admin/concerts" element={<MaintenanceGuard featureId="concerts"><ConcertManager /></MaintenanceGuard>} />
          <Route path="admin/messages" element={<MaintenanceGuard featureId="messages"><MessageManager /></MaintenanceGuard>} />
          <Route path="admin/site-content" element={<MaintenanceGuard featureId="site_content"><SiteContentManager /></MaintenanceGuard>} />
          <Route path="admin/gallery-manager" element={<MaintenanceGuard featureId="gallery_manager"><GalleryManager /></MaintenanceGuard>} />
          <Route path="admin/forms" element={<MaintenanceGuard featureId="forms"><FormManager /></MaintenanceGuard>} />

          // ...
          <Route path="admin/forms/create" element={<MaintenanceGuard featureId="forms"><FormBuilder /></MaintenanceGuard>} />
          <Route path="admin/forms/edit/:id" element={<MaintenanceGuard featureId="forms"><FormBuilder /></MaintenanceGuard>} />
          <Route path="admin/tickets" element={<MaintenanceGuard featureId="tickets"><TicketManager /></MaintenanceGuard>} />
          <Route path="admin/volunteer-gigs" element={<MaintenanceGuard featureId="forms"><VolunteerGigManager /></MaintenanceGuard>} />
          <Route path="admin/upcoming-events" element={<MaintenanceGuard featureId="upcoming_events"><UpcomingEventsManager /></MaintenanceGuard>} />

          {/* Auth Action Handler (Password Reset, Email Verify, etc.) */}
          <Route path="auth/action" element={<ActionHandler />} />
        </Route>
      </Routes>
      <AuthOverlay />
    </Router>
  );
}

export default App;
