import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ScrollToTop from './components/ScrollToTop';
import { useStore } from './lib/store'; 
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { requestNotificationPermission, initForegroundMessaging } from './lib/notifications';
import GlobalLoader from './components/ui/GlobalLoader';
import { isAppHost, isAdminHost, adminUrl, landingAppBase, LANDING_ORIGIN } from './app/host';
import { withHandoff, hasHandoffCode, redeemHandoff } from './app/adminHandoff';


// Lazy-loaded Public Pages
const ConcertZone = lazy(() => import('./pages/ConcertZone'));
const Invoice = lazy(() => import('./pages/Invoice'));
const Proposal = lazy(() => import('./pages/Proposal'));
const Agreement = lazy(() => import('./pages/Agreement'));
const ActionHandler = lazy(() => import('./pages/Auth/ActionHandler'));
const ConcertZoneBlog = lazy(() => import('./pages/ConcertZoneBlog'));
const BlogPostDetail = lazy(() => import('./pages/BlogPostDetail'));
const ArtistAnt = lazy(() => import('./pages/ArtistAnt'));
const ToApp = lazy(() => import('./app/ToApp'));
const PayeeRegistration = lazy(() => import('./pages/PayeeRegistration'));
const VerifyPayout = lazy(() => import('./pages/VerifyPayout'));
const VerifyCreator = lazy(() => import('./pages/VerifyCreator'));
const DocumentViewer = lazy(() => import('./pages/DocumentViewer'));

// The app (app.newbi.live): its own shell and route tree, loaded only when visited.
const AppRoutes = lazy(() => import('./app/AppRoutes'));
const ToAppRedirect = lazy(() => import('./app/redirects').then(m => ({ default: m.ToAppRedirect })));

// Lazy-loaded Admin Pages & Heavy Tools
const Dashboard = lazy(() => import('./pages/Admin/Dashboard'));
const InvoiceGenerator = lazy(() => import('./pages/Admin/InvoiceGenerator'));
const InvoiceManagement = lazy(() => import('./pages/Admin/InvoiceManagement'));
const FinanceDashboard = lazy(() => import('./pages/Admin/FinanceDashboard'));
const SpendsManagement = lazy(() => import('./pages/Admin/SpendsManagement'));
const OtherIncomeManagement = lazy(() => import('./pages/Admin/OtherIncomeManagement'));
const PayeeRegistry = lazy(() => import('./pages/Admin/PayeeRegistry'));
const AnnouncementsManager = lazy(() => import('./pages/Admin/AnnouncementsManager'));
const ConcertManager = lazy(() => import('./pages/Admin/ConcertManager'));
const MessageManager = lazy(() => import('./pages/Admin/MessageManager'));
const ProposalManagement = lazy(() => import('./pages/Admin/ProposalManagement'));
const AIStudio = lazy(() => import('./pages/Admin/AIStudio'));
const ProposalGenerator = lazy(() => import('./pages/Admin/ProposalGenerator'));
const AgreementGenerator = lazy(() => import('./pages/Admin/AgreementGenerator'));
const FormManager = lazy(() => import('./pages/Admin/FormManager'));
const FormBuilder = lazy(() => import('./pages/Admin/FormBuilder'));
const AdminManager = lazy(() => import('./pages/Admin/AdminManager'));
const ActiveUsers = lazy(() => import('./pages/Admin/ActiveUsers'));
const VolunteerGigManager = lazy(() => import('./pages/Admin/VolunteerGigManager'));
const CreatorPortalLayout = lazy(() => import('./pages/Admin/CreatorPortalLayout'));
const CreatorManager = lazy(() => import('./pages/Admin/CreatorManager'));
const CampaignManager = lazy(() => import('./pages/Admin/CampaignManager'));
const UpcomingEventsManager = lazy(() => import('./pages/Admin/UpcomingEventsManager'));
const GiveawayManager = lazy(() => import('./pages/Admin/GiveawayManager'));
const GiveawayParticipants = lazy(() => import('./pages/Admin/GiveawayParticipants'));
const DevSettings = lazy(() => import('./pages/Admin/DevSettings'));
const MailingManager = lazy(() => import('./pages/Admin/MailingManager'));
const BlogManager = lazy(() => import('./pages/Admin/BlogManager'));
const ConcertZoneStudio = lazy(() => import('./pages/Admin/ConcertZoneStudio'));
const BlogPostEditor = lazy(() => import('./pages/Admin/BlogPostEditor'));
const AgreementManagement = lazy(() => import('./pages/Admin/AgreementManagement'));
const EventScanner = lazy(() => import('./pages/Admin/EventScanner'));
const TicketingManagement = lazy(() => import('./pages/Admin/TicketingManagement'));
const GuestlistManager = lazy(() => import('./pages/Admin/GuestlistManager'));
const CreatorSettingsPage = lazy(() => import('./pages/Admin/CreatorSettingsPage'));
const CreatorGroupsPage = lazy(() => import('./pages/Admin/CreatorGroupsPage'));
const CityGroupPage = lazy(() => import('./pages/Admin/CityGroupPage'));
const SiteContentManager = lazy(() => import('./pages/Admin/SiteContentManager'));
const NewsletterStudio = lazy(() => import('./pages/Admin/NewsletterStudio'));
const AdminShell = lazy(() => import('./components/admin/shell/AdminShell'));


// Guards & Components. The public layout, guards and the old sign-in overlay load on
// demand, so the app (app.newbi.live, /app) doesn't download the site's navbar,
// profile panel or admin code before its first screen.
const Layout = lazy(() => import('./components/Layout'));
const AuthOverlay = lazy(() => import('./components/auth/AuthOverlay'));
const AdminGuard = lazy(() => import('./components/AdminGuard'));
const FinanceGuard = lazy(() => import('./components/FinanceGuard'));
const MaintenanceGuard = lazy(() => import('./components/MaintenanceGuard'));
import NewbiToast from './components/ui/NewbiToast';

import { safeLocalStorage } from './lib/storage';

// Redirect that keeps the query string (?ref=, ?campaignId=, ?taskId=) and fills
// in :params, so old or hand-typed creator links still land in the right place.
function RedirectKeepQuery({ to }) {
  const location = useLocation();
  const params = useParams();
  const target = to.replace(/:([A-Za-z]+)/g, (_, key) => encodeURIComponent(params[key] || ''));
  return <Navigate to={`${target}${location.search}${location.hash}`} replace />;
}

// The landing pages (newbi.live: /, /creator, /contact, /terms, /privacy) are their own
// prerendered entry with the new navbar (src/landing). A link inside this app that lands on
// one loads it for real instead of drawing it inside the old site layout. If the load comes
// straight back here (a host without the landing rewrites), the page renders in place.
// newbi.live's own pages (prerendered, landing.html). Reaching one inside this
// app (a link, the logo or Back from ConcertZone, a doc or the admin) makes a
// full load so the new landing serves it; the old pages are gone. If that load
// comes straight back here (a host without the landing rewrites), a plain
// "continue" screen shows instead of reloading forever.
const LANDING_PATHS = ['', 'work', 'creator', 'contact', 'terms', 'privacy'];

function ToLanding() {
  const location = useLocation();
  const target = `${location.pathname}${location.search}${location.hash}`;
  const [looping] = useState(() => {
    try {
      const last = JSON.parse(sessionStorage.getItem('nb-to-landing') || 'null');
      // A real loop bounces back within a second or two; going Back and Back by hand is slower.
      const bounce = Boolean(last && last.path === location.pathname && Date.now() - last.at < 2000);
      sessionStorage.setItem('nb-to-landing', JSON.stringify({ path: location.pathname, at: Date.now(), n: bounce ? (last.n || 1) + 1 : 1 }));
      return bounce && (last.n || 1) >= 2;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!looping) window.location.replace(target);
  }, [looping, target]);
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#F4F2EC] dark:bg-[#050505] px-6">
      {looping && (
        <a href={target} className="inline-flex h-12 items-center rounded-full bg-neon-green px-6 font-heading text-sm font-bold text-black">
          Continue to newbi.live
        </a>
      )}
    </div>
  );
}

const ADMIN_ROLES = ['developer', 'super_admin', 'editor', 'admin', 'founder', 'content_admin', 'gate_manager', 'scanner', 'blog_writer'];

// The admin lives on admin.newbi.live: /admin on the other production hosts makes a
// full load there, and signed-in staff carry their sign-in over (src/app/adminHandoff.js).
// Localhost and previews keep it in place.
function ToAdmin() {
  const location = useLocation();
  const target = adminUrl(`${location.pathname}${location.search}${location.hash}`);
  const away = /^https?:/.test(target);
  const authInitialized = useStore(s => s.authInitialized);
  const role = useStore(s => s.user?.role);
  useEffect(() => {
    if (!away) return undefined;
    let done = false;
    const go = (url) => { if (!done) { done = true; window.location.replace(url); } };
    // Wait for the sign-in to load (at most 5s), then go.
    const fallback = setTimeout(() => go(target), 5000);
    if (authInitialized) {
      if (ADMIN_ROLES.includes(role)) withHandoff(target).then(go);
      else go(target);
    }
    return () => clearTimeout(fallback);
  }, [away, target, authInitialized, role]);
  return away ? <GlobalLoader color="#00F0FF" /> : <Outlet />;
}

// admin.newbi.live serves only the admin; any other path goes to the same path on newbi.live.
function ToSite() {
  const location = useLocation();
  useEffect(() => {
    window.location.replace(`${LANDING_ORIGIN}${location.pathname}${location.search}${location.hash}`);
  }, [location.pathname, location.search, location.hash]);
  return <div className="min-h-dvh bg-[#F4F2EC] dark:bg-[#050505]" />;
}

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
  const adminHost = isAdminHost();
  // admin.newbi.live opened from the app with a sign-in code: sign in before showing the admin.
  // 'pending' while the code is used, then the uid until the store has loaded that user.
  const [handoff, setHandoff] = useState(() => (adminHost && hasHandoffCode() ? 'pending' : null));
  useEffect(() => {
    if (handoff !== 'pending') return;
    redeemHandoff().then(uid => setHandoff(uid || null));
  }, [handoff]);
  useEffect(() => {
    if (!handoff) return undefined;
    const t = setTimeout(() => setHandoff(null), 8000);
    return () => clearTimeout(t);
  }, [handoff]);
  const handoffBusy = handoff === 'pending' || Boolean(handoff && user?.uid !== handoff);
  const appHost = isAppHost();
  const appBase = landingAppBase();
  const onAdminPath = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  // The app's own screens; the admin (also served on app.newbi.live) is not one of them.
  const inApp = (appHost && !onAdminPath) || Boolean(appBase && (location.pathname === appBase || location.pathname.startsWith(`${appBase}/`)));
  const isAdmin = ADMIN_ROLES.includes(user?.role) || safeLocalStorage.getItem('adminAuth') === 'true';

  // Foreground push handler: once per page load, not on every auth change.
  useEffect(() => {
    initForegroundMessaging();
  }, []);

  // One auth listener for the page's lifetime (signing in no longer tears it down).
  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (user) => {
      const { checkUserRole } = useStore.getState();
      if (checkUserRole) {
        checkUserRole(user).then(() => {
          if (user) {
            requestNotificationPermission();
          }
        }).catch(err => console.warn("Auth state check warning:", err));
      }
    }, (err) => console.warn("Auth state listener warning:", err));
  }, []);

  // Site config listeners: re-subscribed only when admin access changes, not on every login.
  // The app reads its own per-user data (src/lib/store/*), so it skips these.
  useEffect(() => {
    if (inApp) return undefined;
    const unsubscribeData = subscribeToData ? subscribeToData(isAdmin) : null;
    return () => { if (unsubscribeData) unsubscribeData(); };
  }, [subscribeToData, isAdmin, inApp]);

  // The old sign-in overlay is only fetched the first time someone opens it.
  const isAuthOpen = useStore(s => s.isAuthOpen);
  const [authOverlayLoaded, setAuthOverlayLoaded] = useState(false);
  useEffect(() => { if (isAuthOpen) setAuthOverlayLoaded(true); }, [isAuthOpen]);

  // The signed-in user's notifications.
  useEffect(() => {
    const unsubscribeNotifications = subscribeToNotifications ? subscribeToNotifications(user?.uid) : null;
    return () => { if (unsubscribeNotifications) unsubscribeNotifications(); };
  }, [subscribeToNotifications, user?.uid]);


  // The admin route tree. Served on admin.newbi.live/admin; ToAdmin sends /admin on
  // newbi.live and app.newbi.live there (localhost and previews keep it in place).
  const adminRoutes = (
    <Route element={<ToAdmin />}>
    <Route element={<AdminShell />}>
      <Route path="admin" element={<AdminGuard><Dashboard /></AdminGuard>} />
      <Route path="admin/manage-admins" element={<AdminGuard><MaintenanceGuard featureId="admins"><AdminManager /></MaintenanceGuard></AdminGuard>} />
      <Route path="admin/users" element={<AdminGuard><MaintenanceGuard featureId="admins"><AdminManager view="users" /></MaintenanceGuard></AdminGuard>} />
      <Route path="admin/active-users" element={<Navigate to="/admin/users?tab=active" replace />} />
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
    
      {/* The Documents section was removed from the admin; old links go to the dashboard. */}
      <Route path="admin/gen-documents" element={<Navigate to="/admin" replace />} />
      <Route path="admin/create-gen-document" element={<Navigate to="/admin" replace />} />
      <Route path="admin/edit-gen-document/:id" element={<Navigate to="/admin" replace />} />
      <Route path="admin/ai-studio" element={<AdminGuard><MaintenanceGuard featureId="docs"><AIStudio /></MaintenanceGuard></AdminGuard>} />

      <Route path="admin/forms" element={<AdminGuard><MaintenanceGuard featureId="forms_public"><FormManager /></MaintenanceGuard></AdminGuard>} />
      <Route path="admin/forms/create" element={<AdminGuard><MaintenanceGuard featureId="forms_public"><FormBuilder /></MaintenanceGuard></AdminGuard>} />
      <Route path="admin/forms/edit/:id" element={<AdminGuard><MaintenanceGuard featureId="forms_public"><FormBuilder /></MaintenanceGuard></AdminGuard>} />
      {/* Artistant is its own product now (artistant.in); old admin links go to the dashboard. */}
      <Route path="admin/artists" element={<Navigate to="/admin" replace />} />
      <Route path="admin/client-requests" element={<Navigate to="/admin" replace />} />
      <Route path="admin/artistant" element={<Navigate to="/admin" replace />} />
      <Route path="admin/volunteer-gigs" element={<AdminGuard><MaintenanceGuard featureId="community"><VolunteerGigManager /></MaintenanceGuard></AdminGuard>} />
      <Route path="admin/guestlists" element={<AdminGuard><MaintenanceGuard featureId="guestlists"><GuestlistManager /></MaintenanceGuard></AdminGuard>} />
      <Route path="admin/upcoming-events" element={<AdminGuard><MaintenanceGuard featureId="upcoming_events"><UpcomingEventsManager /></MaintenanceGuard></AdminGuard>} />
      <Route element={<AdminGuard><MaintenanceGuard featureId="influencer"><CreatorPortalLayout /></MaintenanceGuard></AdminGuard>}>
        <Route path="admin/creators" element={<CreatorManager isEmbedded />} />
        <Route path="admin/creators/leaderboard" element={<CreatorManager showLeaderboardOnly={true} isEmbedded />} />
        <Route path="admin/creators/:id" element={<CreatorManager isEmbedded />} />
        <Route path="admin/creators/settings" element={<CreatorSettingsPage isEmbedded />} />
        <Route path="admin/creators/groups" element={<CreatorGroupsPage />} />
        <Route path="admin/campaigns" element={<CampaignManager isEmbedded />} />
        <Route path="admin/campaigns/create" element={<CampaignManager isEmbedded />} />
        <Route path="admin/campaigns/edit/:id" element={<CampaignManager isEmbedded />} />
        <Route path="admin/campaigns/manage/:id" element={<CampaignManager isEmbedded />} />
        <Route path="admin/campaigns/:id" element={<RedirectKeepQuery to="/admin/campaigns/manage/:id" />} />
      </Route>
      <Route path="admin/city-groups" element={<Navigate to="/admin/creators/groups" replace />} />
                    <Route path="admin/creator-hub" element={<Navigate to="/admin/creators" replace />} />
      <Route path="admin/site" element={<AdminGuard><SiteContentManager view="site" /></AdminGuard>} />
      <Route path="admin/brands" element={<AdminGuard><SiteContentManager view="brands" /></AdminGuard>} />
      <Route path="admin/app-settings" element={<AdminGuard><SiteContentManager view="app" /></AdminGuard>} />
      <Route path="admin/content" element={<Navigate to="/admin/site" replace />} />
      <Route path="admin/site-content" element={<Navigate to="/admin/site" replace />} />
      <Route path="admin/giveaways" element={<AdminGuard><MaintenanceGuard featureId="giveaways"><GiveawayManager /></MaintenanceGuard></AdminGuard>} />
      <Route path="admin/giveaways/:giveawayId/participants" element={<AdminGuard><MaintenanceGuard featureId="giveaways"><GiveawayParticipants /></MaintenanceGuard></AdminGuard>} />
      <Route path="admin/blog" element={<AdminGuard><MaintenanceGuard featureId="blog_announcements"><ConcertZoneStudio /></MaintenanceGuard></AdminGuard>} />
      <Route path="admin/concertzone/studio" element={<AdminGuard><MaintenanceGuard featureId="blog_announcements"><ConcertZoneStudio /></MaintenanceGuard></AdminGuard>} />
      <Route path="admin/blog/create" element={<AdminGuard><MaintenanceGuard featureId="blog_announcements"><BlogPostEditor /></MaintenanceGuard></AdminGuard>} />
      <Route path="admin/blog/edit/:id" element={<AdminGuard><MaintenanceGuard featureId="blog_announcements"><BlogPostEditor /></MaintenanceGuard></AdminGuard>} />
      <Route path="admin/newsletter/studio" element={<AdminGuard><MaintenanceGuard featureId="blog_announcements"><NewsletterStudio /></MaintenanceGuard></AdminGuard>} />
      <Route path="admin/scanner" element={<AdminGuard><MaintenanceGuard featureId="ticketing"><EventScanner /></MaintenanceGuard></AdminGuard>} />
      <Route path="admin/ticketing" element={<AdminGuard><MaintenanceGuard featureId="ticketing"><TicketingManagement /></MaintenanceGuard></AdminGuard>} />
      <Route path="admin/documents" element={<Navigate to="/admin" replace />} />
      <Route path="admin/system-command" element={<AdminGuard><DevSettings /></AdminGuard>} />
      <Route path="admin/settings" element={<Navigate to="/admin/system-command" replace />} />
      <Route path="admin/dev-settings" element={<Navigate to="/admin/system-command" replace />} />
    </Route>
    </Route>
  );

  return (
    <>
      <ScrollToTop />
      
      <AnimatePresence mode="wait">
        {loading && location.pathname.startsWith('/admin') && <GlobalLoader key="global-loader" color={currentColor} />}
      </AnimatePresence>

      <Suspense fallback={<GlobalLoader color={currentColor} />}>
        {handoffBusy ? (
          <GlobalLoader color={currentColor} />
        ) : adminHost ? (
          // admin.newbi.live: the admin, and nothing else.
          <Routes>
            <Route path="auth/action" element={<ActionHandler />} />
            <Route index element={<Navigate to="/admin" replace />} />
            <Route element={<Layout />}>{adminRoutes}</Route>
            <Route path="*" element={<ToSite />} />
          </Routes>
        ) : appHost ? (
          // app.newbi.live: the app owns every path.
          <Routes>
            <Route path="auth/action" element={<ActionHandler />} />
            <Route element={<Layout />}>{adminRoutes}</Route>
            <Route path="*" element={<AppRoutes />} />
          </Routes>
        ) : (
        <Routes>
          {/* Dev and previews: the same app tree under /app (Safari can't open app.localhost). */}
          {appBase && <Route path={`${appBase}/*`} element={<AppRoutes />} />}
          {/* The landing site's pages: always a full load of the new landing, never an old page. */}
          {LANDING_PATHS.map(path => (
            <Route key={path || 'home'} {...(path ? { path } : { index: true })} element={<ToLanding />} />
          ))}
          {/* Old links into the app: they redirect straight away, outside the old site's layout (no old navbar on the way). */}
          <Route path="community" element={<ToAppRedirect />} />
          <Route path="community-join" element={<ToAppRedirect />} />

          {/* Retired creator pages and their aliases: they live in the app now (src/app/redirects.jsx). */}
          {['creator/join', 'creator-dashboard', 'creator-dashboard/*', 'campaigns', 'campaigns/:id', 'campaign/:id',
            'creator/campaign/:id', 'creator/campaigns/:id', 'creator/dashboard', 'creator/hub', 'creator/studio',
            'creator/campaigns', 'creators', 'creator-hub', 'creator-studio', 'creator-join', 'creator/apply',
            'creator/register', 'creator/signup', 'creator/landing'].map(path => (
            <Route key={path} path={path} element={<ToAppRedirect />} />
          ))}
          <Route path="forms" element={<ToAppRedirect />} />
          <Route path="forms/:id" element={<ToAppRedirect />} />
          <Route path="form/:id" element={<ToAppRedirect />} />
          <Route path="form" element={<ToAppRedirect />} />
          {/* Passes and giveaways live in the app now (Phase 5). */}
          <Route path="giveaway/:slug" element={<ToApp to="/community/giveaways/:slug" />} />
          <Route path="ticket/:id" element={<ToApp to="/p/:id" />} />

          <Route path="/" element={<Layout />}>
            <Route path="invoice/:id" element={<Invoice />} />
            <Route path="proposal/:id" element={<MaintenanceGuard isPage featureId="docs"><Proposal /></MaintenanceGuard>} />
            <Route path="agreement/:id" element={<MaintenanceGuard isPage featureId="docs"><Agreement /></MaintenanceGuard>} />
            <Route path="concertzone" element={<MaintenanceGuard isPage featureId="concerts"><ConcertZoneBlog /></MaintenanceGuard>} />
            <Route path="concertzone/:category" element={<MaintenanceGuard isPage featureId="concerts"><ConcertZoneBlog /></MaintenanceGuard>} />
            <Route path="concertzone/:category/:slug" element={<MaintenanceGuard isPage featureId="concerts"><BlogPostDetail /></MaintenanceGuard>} />
            <Route path="artistant" element={<MaintenanceGuard isPage featureId="artistant_public"><ArtistAnt /></MaintenanceGuard>} />
            <Route path="register-payment" element={<PayeeRegistration />} />
            <Route path="verify-payout" element={<VerifyPayout />} />
            <Route path="verify-creator" element={<VerifyCreator />} />

            {adminRoutes}

            <Route path="doc/:id" element={<DocumentViewer />} />
            <Route path="auth/action" element={<ActionHandler />} />

          </Route>
          {/* 404, in the landing's colours and outside the old layout (no old navbar). */}
          <Route path="*" element={
            <div className="min-h-dvh bg-[#F4F2EC] dark:bg-[#050505] flex items-center justify-center p-6">
              <div className="text-center space-y-4 max-w-md">
                <h1 className="font-heading text-5xl font-bold text-gray-950 dark:text-white">404</h1>
                <p className="text-gray-600 dark:text-zinc-400">This page does not exist.</p>
                <a href="/" className="inline-flex h-12 px-6 items-center rounded-xl bg-gray-950 text-white dark:bg-white dark:text-black font-semibold">
                  Go to the home page
                </a>
              </div>
            </div>
          } />
        </Routes>
        )}
      </Suspense>
      {/* The app has its own sign-in sheet (src/app/auth/SignInSheet). */}
      {!inApp && authOverlayLoaded && (
        <Suspense fallback={null}><AuthOverlay /></Suspense>
      )}
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
