import React, { useEffect, useState } from 'react';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import KeyRound from 'lucide-react/dist/esm/icons/key-round';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import UserMinus from 'lucide-react/dist/esm/icons/user-minus';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Info from 'lucide-react/dist/esm/icons/info';
import { cn } from '../../../lib/utils';
import Sheet from '../Sheet';
import { Avatar, Badge, Button } from '../ui';
import { accent } from '../theme';
import { Field, fieldCls } from '../uploads/UploadKit';
import { RoleBadge, RolePicker, roleInfo, roleModules, TOP_ROLES } from './roles';
import { EMAIL_RE, formatDay } from './format';

const Note = ({ tone = 'gray', icon: Icon = Info, children }) => (
    <div className={cn('flex gap-2.5 rounded-xl px-3.5 py-3 text-[13px] leading-snug', accent(tone).soft, tone === 'gray' ? 'text-gray-600 dark:text-zinc-300' : accent(tone).text)}>
        <Icon size={15} className="mt-0.5 shrink-0" />
        <div className="min-w-0">{children}</div>
    </div>
);

const FormError = ({ children }) => children ? <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{children}</p> : null;

/* ── Invite ─────────────────────────────────────────────────────────────── */

export const InviteSheet = ({ open, onClose, roles, onInvite }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('content_admin');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { if (open) { setEmail(''); setRole('content_admin'); setBusy(false); setError(''); } }, [open]);

    const submit = async (e) => {
        e?.preventDefault();
        if (busy) return;
        const clean = email.trim().toLowerCase();
        if (!EMAIL_RE.test(clean)) { setError('Enter a valid email address.'); return; }
        setBusy(true);
        setError('');
        try {
            await onInvite(clean, role);
            onClose();
        } catch (err) {
            setError(err?.userMessage || "Couldn't add them. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const top = TOP_ROLES.includes(role);

    return (
        <Sheet
            open={open}
            onClose={busy ? () => {} : onClose}
            size="lg"
            title="Invite a teammate"
            subtitle="They sign in with this email and get the access you pick."
            bodyClassName="space-y-5"
            footer={(
                <div className="space-y-3">
                    <FormError>{error}</FormError>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={busy} className="h-12">Cancel</Button>
                        <Button variant="primary" type="submit" form="invite-form" disabled={busy || !email.trim()} className="h-12 flex-1">
                            <UserPlus size={16} /> {busy ? 'Adding…' : `Add as ${roleInfo(role).label}`}
                        </Button>
                    </div>
                </div>
            )}
        >
            <form id="invite-form" onSubmit={submit} noValidate className="space-y-5">
                <Field label="Email address">
                    <input
                        type="email"
                        inputMode="email"
                        autoCapitalize="off"
                        autoCorrect="off"
                        autoComplete="off"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        placeholder="name@newbi.live"
                        className={fieldCls}
                    />
                </Field>
                <div>
                    <p className="mb-2 text-[12px] font-bold text-gray-500">What can they open?</p>
                    <RolePicker value={role} onChange={setRole} roles={roles} disabled={busy} />
                </div>
                {top && <Note tone="amber" icon={AlertTriangle}>{roleInfo(role).label}s get full access, including money and team roles. Only pick this for someone who runs the company.</Note>}
                <Note>We'll email them that they've been added. If they've already asked for access, this approves their request.</Note>
            </form>
        </Sheet>
    );
};

/* ── Change role / approve request ──────────────────────────────────────── */

export const RoleSheet = ({ open, onClose, person, roles, mode = 'change', blockedReason, onSave }) => {
    const [role, setRole] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setRole(mode === 'approve' ? 'content_admin' : (person?.role || ''));
        setBusy(false);
        setError('');
    }, [open, person?.id, mode]); // eslint-disable-line react-hooks/exhaustive-deps

    const unchanged = mode === 'change' && role === person?.role;
    const save = async () => {
        if (busy || unchanged || !role) return;
        setBusy(true);
        setError('');
        try {
            await onSave(role);
            onClose();
        } catch (err) {
            setError(err?.userMessage || "Couldn't update the role. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const name = person?.displayName || person?.email || 'this person';
    const top = TOP_ROLES.includes(role) && !TOP_ROLES.includes(person?.role);

    return (
        <Sheet
            open={open}
            onClose={busy ? () => {} : onClose}
            size="lg"
            zIndex={310}
            title={mode === 'approve' ? 'Approve access' : 'Change role'}
            subtitle={name}
            bodyClassName="space-y-5"
            footer={(
                <div className="space-y-3">
                    <FormError>{error}</FormError>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={busy} className="h-12">Cancel</Button>
                        <Button variant="primary" onClick={save} disabled={busy || unchanged || !role || Boolean(blockedReason)} className="h-12 flex-1">
                            <ShieldCheck size={16} />
                            {busy ? 'Saving…' : mode === 'approve' ? `Approve as ${roleInfo(role).label}` : unchanged ? 'Pick a new role' : `Change to ${roleInfo(role).label}`}
                        </Button>
                    </div>
                </div>
            )}
        >
            {mode === 'change' && person?.role && (
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-gray-500">
                    Now: <RoleBadge role={person.role} />
                </div>
            )}
            {blockedReason ? (
                <Note tone="red" icon={AlertTriangle}>{blockedReason}</Note>
            ) : (
                <>
                    <RolePicker value={role} onChange={setRole} roles={roles} disabled={busy} />
                    {top && <Note tone="amber" icon={AlertTriangle}>This gives full access, including money, team roles and system settings.</Note>}
                    <Note>
                        {mode === 'approve'
                            ? "They'll get an email, and can open the admin after they reload."
                            : 'The new access applies the next time they open or reload the admin.'}
                    </Note>
                </>
            )}
        </Sheet>
    );
};

/* ── Rename ─────────────────────────────────────────────────────────────── */

export const RenameSheet = ({ open, onClose, person, onSave }) => {
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { if (open) { setName(person?.displayName || ''); setBusy(false); setError(''); } }, [open, person?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const save = async (e) => {
        e?.preventDefault();
        const clean = name.trim();
        if (busy || !clean) return;
        setBusy(true);
        setError('');
        try {
            await onSave(clean);
            onClose();
        } catch (err) {
            setError(err?.userMessage || "Couldn't save the name. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={busy ? () => {} : onClose}
            variant="dialog"
            size="sm"
            zIndex={310}
            title="Change display name"
            subtitle={person?.email}
            footer={(
                <div className="space-y-3">
                    <FormError>{error}</FormError>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={busy} className="h-11 flex-1 sm:flex-none">Cancel</Button>
                        <Button variant="primary" type="submit" form="rename-form" disabled={busy || !name.trim()} className="h-11 flex-1">{busy ? 'Saving…' : 'Save name'}</Button>
                    </div>
                </div>
            )}
        >
            <form id="rename-form" onSubmit={save}>
                <Field label="Name shown in the admin">
                    <input autoFocus className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                </Field>
            </form>
        </Sheet>
    );
};

/* ── Team member detail ─────────────────────────────────────────────────── */

const Row = ({ label, children }) => (
    <div className="flex items-start justify-between gap-4 py-2.5">
        <span className="shrink-0 text-[13px] text-gray-500">{label}</span>
        <span className="min-w-0 break-words text-right text-[14px] font-semibold">{children}</span>
    </div>
);

const ActionButton = ({ icon: Icon, children, hint, danger, ...rest }) => (
    <button
        type="button"
        className={cn(
            'flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 text-left transition-colors disabled:opacity-40',
            danger ? 'text-red-600 hover:bg-red-500/[0.07] dark:text-red-400' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
        )}
        {...rest}
    >
        <Icon size={17} className={cn('shrink-0', danger ? '' : 'text-gray-400')} />
        <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold">{children}</span>
            {hint && <span className="block truncate text-[12px] font-medium text-gray-500">{hint}</span>}
        </span>
    </button>
);

export const TeamMemberSheet = ({ open, onClose, admin, isSelf, perms, onChangeRole, onRename, onResetPassword, onSignOut, onRemove }) => {
    if (!admin) return <Sheet open={false} onClose={onClose} />;
    const info = roleInfo(admin.role);
    const modules = roleModules(admin.role);
    return (
        <Sheet
            open={open}
            onClose={onClose}
            size="md"
            header={(
                <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={admin.displayName || admin.email} size={48} />
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-extrabold tracking-tight">{admin.displayName || admin.email}</h2>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <RoleBadge role={admin.role} />
                            {isSelf && <Badge tone="gray">You</Badge>}
                        </div>
                    </div>
                </div>
            )}
            bodyClassName="space-y-6"
        >
            <section>
                <p className="mb-1 text-[12px] font-bold text-gray-500">What they can open</p>
                <p className="text-[14px] leading-relaxed text-gray-700 dark:text-zinc-300">{info.summary}</p>
                {modules.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {modules.map(m => (
                            <span key={m.id} className={cn('inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold', accent(m.accent).chip)}>
                                <m.icon size={12} /> {m.name}
                            </span>
                        ))}
                    </div>
                )}
            </section>

            <section className="divide-y divide-black/[0.06] rounded-2xl border border-black/[0.06] px-4 dark:divide-white/[0.06] dark:border-white/[0.08]">
                <Row label="Email"><a href={`mailto:${admin.email}`} className="text-sky-600 hover:underline dark:text-neon-blue">{admin.email}</a></Row>
                <Row label="Added">{admin.createdAt ? formatDay(admin.createdAt) : 'Unknown'}</Row>
                {admin.addedBy && <Row label="Added by">{admin.addedBy}</Row>}
                {admin.requestedBy && !admin.addedBy && <Row label="How">Asked for access</Row>}
            </section>

            <section className="-mx-1 space-y-0.5">
                {perms.canEditRoles && !isSelf && (
                    <ActionButton icon={ShieldCheck} hint="See what each role can open" onClick={onChangeRole}>Change role</ActionButton>
                )}
                {(isSelf || perms.canEditRoles) && <ActionButton icon={Pencil} onClick={onRename}>Change display name</ActionButton>}
                <ActionButton icon={Mail} onClick={() => { window.location.href = `mailto:${admin.email}`; }}>Send an email</ActionButton>
                {perms.canEditRoles && !isSelf && (
                    <ActionButton icon={KeyRound} hint="Emails them a link to set a new password" onClick={onResetPassword}>Send password reset</ActionButton>
                )}
                {perms.canEditRoles && !isSelf && (
                    <ActionButton icon={LogOut} hint="Ends every session on every device" onClick={onSignOut}>Sign out of all devices</ActionButton>
                )}
                {perms.canEditRoles && !isSelf && (
                    <ActionButton icon={UserMinus} danger hint="They lose admin access" onClick={onRemove}>Remove from team</ActionButton>
                )}
                {isSelf && <p className="px-3 pt-2 text-[12px] text-gray-500">You can't change your own role or remove yourself. Ask another founder.</p>}
            </section>
        </Sheet>
    );
};
