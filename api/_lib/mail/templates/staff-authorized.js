const ROLE_LABELS = {
    content_admin: 'Content admin', gate_manager: 'Ticketing admin', blog_writer: 'Blog writer',
    super_admin: 'Super admin', founder: 'Founder', developer: 'Developer', admin: 'Admin', editor: 'Editor',
};

/** data: { role, adminUrl } */
export default (data = {}) => ({
    sender: 'security',
    kind: 'transactional',
    subject: 'You now have access to Newbi Admin',
    preheader: `You've been given ${ROLE_LABELS[data.role] || data.role || 'staff'} access.`,
    eyebrow: 'Staff access',
    title: 'Your admin access is ready',
    blocks: [
        { p: 'You have been given access to the Newbi admin. Sign in with this email address to get started.' },
        { details: [['Role', ROLE_LABELS[data.role] || data.role]] },
        { note: "If you weren't expecting this, reply and let us know." },
    ],
    cta: { label: 'Open Newbi Admin', url: data.adminUrl || '/admin' },
    reason: 'Security email from Newbi.',
});
