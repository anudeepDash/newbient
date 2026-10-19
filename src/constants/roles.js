/**
 * Centralized admin role definitions
 * Single source of truth for role-based access control across the admin UI
 */

// All roles that grant access to the admin panel
export const ADMIN_ROLES = [
  'founder',
  'super_admin',
  'developer',
  'admin',
  'editor',
  'content_admin',
  'scanner',
  'gate_manager',
  'blog_writer',
];

/*
 * admins/{key}: each team member's record is stored under their email,
 * lowercased, so the Firestore rules can look up "is this person staff?"
 * (rules can read a document by id but can't search by email).
 */
export const adminKey = (email) => String(email || '').trim().toLowerCase();

/*
 * Testers: see every campaign in the app (any status) and can apply and submit
 * without meeting the criteria or being shortlisted. Their submissions are
 * saved with test: true and marked "Test" in the admin.
 */
export const TESTER_ROLES = ['developer'];
export const isTesterRole = (role) => TESTER_ROLES.includes(String(role || '').toLowerCase());

// Roles with full admin access (all features)
export const FULL_ACCESS_ROLES = ['developer', 'super_admin', 'founder'];

// Roles that can access financial features
export const FINANCE_ROLES = ['developer', 'founder'];

// Roles that can bypass maintenance mode
export const MAINTENANCE_BYPASS_ROLES = ['developer', 'super_admin', 'founder'];

// Roles with limited/scoped access
export const SCANNER_ROLES = ['scanner', 'gate_manager'];
export const CONTENT_ROLES = ['editor', 'content_admin', 'blog_writer'];

/**
 * Check if a role has admin access
 * @param {string} role
 * @returns {boolean}
 */
export const isAdminRole = (role) => ADMIN_ROLES.includes(role);

/**
 * Check if a role has full admin access
 * @param {string} role
 * @returns {boolean}
 */
export const isFullAccessRole = (role) => FULL_ACCESS_ROLES.includes(role);

/**
 * Check if a role can access financial features
 * @param {string} role
 * @returns {boolean}
 */
export const isFinanceRole = (role) => FINANCE_ROLES.includes(role);

/**
 * Check if a role can bypass maintenance
 * @param {string} role
 * @returns {boolean}
 */
export const canBypassMaintenance = (role) => MAINTENANCE_BYPASS_ROLES.includes(role);
