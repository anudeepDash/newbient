import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useStore } from './lib/store'; // Import store
import Layout from './components/Layout';
// ... imports

function App() {
  const subscribeToData = useStore((state) => state.subscribeToData);

  useEffect(() => {
    const unsubscribe = subscribeToData();
    return () => unsubscribe();
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
