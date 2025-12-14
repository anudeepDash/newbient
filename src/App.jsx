import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import GalleryManager from './pages/Admin/GalleryManager';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="gallery" element={<MediaGallery />} />
          <Route path="concerts" element={<ConcertZone />} />
          <Route path="contact" element={<Contact />} />
          <Route path="invoice/:id" element={<Invoice />} />

          {/* Admin Routes */}
          <Route path="admin" element={<Dashboard />} />
          <Route path="admin/invoices" element={<InvoiceManagement />} />
          <Route path="admin/create-invoice" element={<InvoiceGenerator />} />
          <Route path="admin/announcements" element={<AnnouncementsManager />} />
          <Route path="admin/concerts" element={<ConcertManager />} />
          <Route path="admin/site-content" element={<SiteContentManager />} />
          <Route path="admin/gallery-manager" element={<GalleryManager />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
