import React, { useMemo } from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import { cn } from '../../../lib/utils';
import { accent } from '../theme';
import { Badge } from '../ui';
import { getAdminNav } from '../../../constants/adminNavigation';

/*
 * Team roles: one label, colour and plain explanation per role. What each role
 * can open is read from the admin navigation, so the explanation always matches
 * what the person will actually see.
 */
export const ROLE_INFO = {
    founder: { label: 'Founder', tone: 'amber', summary: 'Everything, including money (invoices, finance board), team roles and system settings.' },
    developer: { label: 'Developer', tone: 'cyan', summary: 'Everything a founder has. Also keeps using the site while maintenance switches are on, to test fixes.' },
    super_admin: { label: 'Super admin', tone: 'violet', summary: 'Runs day-to-day work in every module except finance. Can see the team and system settings, but not change roles.' },
    content_admin: { label: 'Content admin', tone: 'green', summary: 'Documents, creators, events, community tools, site content and the inbox. No finance, team or system settings.' },
    editor: { label: 'Content admin (old role)', tone: 'green', summary: 'Same access as a content admin. Switch them to Content admin to tidy up.' },
    gate_manager: { label: 'Ticketing admin', tone: 'orange', summary: 'Ticket orders and the gate scanner for event days. Nothing else.' },
    scanner: { label: 'Ticketing admin (old role)', tone: 'orange', summary: 'Same access as a ticketing admin. Switch them to Ticketing admin to tidy up.' },
    blog_writer: { label: 'Blog writer', tone: 'blue', summary: 'Blog, announcements, portfolio and site content, plus events and tickets.' },
    admin: { label: 'Admin (old role)', tone: 'teal', summary: 'An older role. Pick one of the current roles so their access is clear.' },
    pending: { label: 'Waiting for approval', tone: 'amber', summary: "Asked for access. Can't open the admin until someone approves them." },
};

export const roleInfo = (role) => ROLE_INFO[role] || { label: role ? String(role).replace(/_/g, ' ') : 'No role', tone: 'gray', summary: '' };

/** Roles that only founders and developers may hand out. */
export const TOP_ROLES = ['founder', 'developer'];

/** Roles the current user may pick for someone whose role is now `currentRole`. */
export const assignableRoles = (actorRole, currentRole) => {
    const list = ['content_admin', 'gate_manager', 'blog_writer', 'super_admin'];
    if (actorRole === 'founder' || actorRole === 'developer') list.push('founder', 'developer');
    if (currentRole && ROLE_INFO[currentRole] && currentRole !== 'pending' && !list.includes(currentRole)) list.push(currentRole);
    return list;
};

/** The admin modules a role can open (dashboard left out: everyone has it). */
export const roleModules = (role) => getAdminNav(role, {})
    .flatMap(g => g.items)
    .filter(item => item.id !== 'dashboard');

export const RoleBadge = ({ role, className }) => {
    const info = roleInfo(role);
    return <Badge tone={info.tone} className={className}>{info.label}</Badge>;
};

/** Big radio cards: one per role, with what it can open. */
export const RolePicker = ({ value, onChange, roles, disabled }) => {
    const modulesByRole = useMemo(() => Object.fromEntries(roles.map(r => [r, roleModules(r)])), [roles]);
    return (
        <div className="space-y-2" role="radiogroup">
            {roles.map(role => {
                const info = roleInfo(role);
                const a = accent(info.tone);
                const on = value === role;
                const modules = modulesByRole[role] || [];
                return (
                    <button
                        key={role}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={disabled}
                        onClick={() => onChange(role)}
                        className={cn(
                            'flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors disabled:opacity-50',
                            on ? cn(a.border, a.soft) : 'border-black/[0.08] hover:border-black/20 dark:border-white/[0.08] dark:hover:border-white/20'
                        )}
                    >
                        <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', on ? cn(a.dot, 'border-transparent text-white dark:text-black') : 'border-black/15 dark:border-white/20')}>
                            {on && <Check size={13} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className={cn('block text-[15px] font-bold', on && a.text)}>{info.label}</span>
                            <span className="mt-0.5 block text-[13px] leading-snug text-gray-500 dark:text-zinc-400">{info.summary}</span>
                            {modules.length > 0 && (
                                <span className="mt-2 flex flex-wrap gap-1">
                                    {modules.map(m => (
                                        <span key={m.id} className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-semibold', accent(m.accent).chip)}>{m.name}</span>
                                    ))}
                                </span>
                            )}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};
