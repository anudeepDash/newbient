/**
 * Admin navigation section definitions
 * Single source of truth used by both Dashboard.jsx and AdminCommunityHubLayout.jsx
 */
import {
  TrendingUp, FileText, FileSpreadsheet, Scale,
  Calendar, Radio, Music, Ticket, Zap,
  Users, Star, Gift, Megaphone, UserCheck,
  Shield, Mail, Settings
} from 'lucide-react';
import { FINANCE_ROLES } from './roles';

/**
 * Color class mapping for dynamic Tailwind classes
 * Required because Tailwind purges `text-${variable}` at build time
 */
export const COLOR_CLASS_MAP = {
  'neon-green': 'text-neon-green',
  'neon-blue': 'text-neon-blue',
  'neon-pink': 'text-neon-pink',
  'neon-purple': 'text-neon-purple',
  'yellow-400': 'text-yellow-400',
  'white': 'text-white',
  'red-400': 'text-red-400',
};

export const BG_COLOR_CLASS_MAP = {
  'neon-green': 'bg-neon-green/10',
  'neon-blue': 'bg-neon-blue/10',
  'neon-pink': 'bg-neon-pink/10',
  'neon-purple': 'bg-neon-purple/10',
  'yellow-400': 'bg-yellow-400/10',
  'white': 'bg-white/10',
  'red-400': 'bg-red-400/10',
};

export const BORDER_COLOR_CLASS_MAP = {
  'neon-green': 'border-neon-green/20',
  'neon-blue': 'border-neon-blue/20',
  'neon-pink': 'border-neon-pink/20',
  'neon-purple': 'border-neon-purple/20',
  'yellow-400': 'border-yellow-400/20',
  'white': 'border-white/20',
  'red-400': 'border-red-400/20',
};

/**
 * Build admin navigation sections based on user role and maintenance cards
 * @param {Object} user - Current user object with role property
 * @param {Object} cards - Maintenance feature flags
 * @returns {Array} Navigation sections
 */
export const getAdminSections = (user, cards = {}) => [
  {
    title: "Finance & Strategic Assets",
    color: "neon-green",
    visible: user?.role !== 'scanner' && user?.role !== 'gate_manager' && user?.role !== 'blog_writer',
    links: [
      { name: "Finance Board", path: "/admin/finance", icon: TrendingUp, color: "neon-green", show: FINANCE_ROLES.includes(user?.role) && !cards.invoices },
      { name: "Invoices", path: "/admin/invoices", icon: FileText, color: "neon-blue", show: FINANCE_ROLES.includes(user?.role) && !cards.invoices },
      { name: "Proposals", path: "/admin/proposals", icon: FileSpreadsheet, color: "neon-green", show: !cards.docs },
      { name: "Contracts", path: "/admin/agreements", icon: Scale, color: "neon-purple", show: !cards.docs }
    ]
  },
  {
    title: "Core Content Infrastructure",
    color: "neon-pink",
    visible: user?.role !== 'scanner' && user?.role !== 'gate_manager',
    links: [
      { name: "Upcoming", path: "/admin/upcoming-events", icon: Calendar, color: "neon-green", show: !cards.upcoming_events },
      { name: "Announcements", path: "/admin/announcements", icon: Radio, color: "neon-pink", show: !cards.blog_announcements },
      { name: "Blog", path: "/admin/blog", icon: FileText, color: "neon-blue", show: !cards.blog_announcements },
      { name: "Portfolio", path: "/admin/concertzone", icon: Music, color: "neon-purple", show: !cards.concerts }
    ]
  },
  {
    title: "Event & Ticketing Operations",
    color: "yellow-400",
    visible: true,
    links: [
      { name: "Ticketing Ops", path: "/admin/ticketing", icon: Ticket, color: "neon-green", show: !cards.ticketing },
      { name: "QR Scanner", path: "/admin/scanner", icon: Zap, color: "yellow-400", show: !cards.ticketing }
    ]
  },
  {
    title: "Personnel & Community Ops",
    color: "neon-blue",
    visible: user?.role !== 'scanner' && user?.role !== 'gate_manager' && user?.role !== 'blog_writer',
    links: [
      { name: "Community Hub", path: "/admin/volunteer-gigs", icon: Users, color: "neon-green", show: !cards.community },
      { name: "Creator Studio", path: "/admin/creators", icon: Star, color: "neon-blue", show: !cards.influencer },
      { name: "Giveaways", path: "/admin/giveaways", icon: Gift, color: "neon-purple", show: !cards.giveaways },
      { name: "Artistant", path: "/admin/artistant", icon: Music, color: "neon-blue", show: !cards.artists },
      { name: "Mailing", path: "/admin/mailing", icon: Megaphone, color: "neon-blue", show: !cards.mailing },
      { name: "Active Users", path: "/admin/active-users", icon: UserCheck, color: "neon-green", show: user?.role !== 'editor' && user?.role !== 'content_admin' && user?.role !== 'blog_writer' && !cards.admins },
      { name: "Members", path: "/admin/manage-admins", icon: Shield, color: "neon-blue", show: user?.role !== 'editor' && user?.role !== 'content_admin' && user?.role !== 'blog_writer' && !cards.admins },
      { name: "System Command", path: "/admin/system-command", icon: Settings, color: "neon-blue", show: ['developer', 'super_admin', 'founder'].includes(user?.role) },
      { name: "Inbox", path: "/admin/messages", icon: Mail, color: "white", show: !cards.messages }
    ]
  }
];
