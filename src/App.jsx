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
import FormViewer from './pages/FormViewer';
import CommunityJoin from './pages/CommunityJoin';

function App() {
  const subscribeToData = useStore((state) => state.subscribeToData);

  useEffect(() => {
    try {
      const unsubscribe = subscribeToData();
      if (typeof unsubscribe === 'function') {
        return () => unsubscribe();
      }
    } catch (error) {
      console.error("Failed to subscribe to real-time data:", error);
    }
  }, [subscribeToData]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="gallery" element={<MediaGallery />} />
          <Route path="concerts" element={<ConcertZone />} />
          <Route path="contact" element={<Contact />} />
          <Route path="invoice/:id" element={<Invoice />} />
          <Route path="join" element={<CommunityJoin />} />
          <Route path="forms/:id" element={<FormViewer />} />

          {/* Admin Routes */}
          <Route path="admin" element={<Dashboard />} />
          <Route path="admin/invoices" element={<InvoiceManagement />} />
          <Route path="admin/create-invoice" element={<InvoiceGenerator />} />
          <Route path="admin/announcements" element={<AnnouncementsManager />} />
          <Route path="admin/concerts" element={<ConcertManager />} />
          <Route path="admin/messages" element={<MessageManager />} />
          <Route path="admin/site-content" element={<SiteContentManager />} />
          <Route path="admin/gallery-manager" element={<GalleryManager />} />
          <Route path="admin/forms" element={<FormManager />} />
          <Route path="admin/forms/create" element={<FormBuilder />} />
          <Route path="admin/forms/edit/:id" element={<FormBuilder />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
