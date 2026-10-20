import React, { useEffect, useRef, useState } from 'react';
import ImagePlus from 'lucide-react/dist/esm/icons/image-plus';
import X from 'lucide-react/dist/esm/icons/x';
import { Button, Sheet, TextInput } from '../../../components/app';
import { callCreatorApi, uploadProof } from '../api';
import { FormBlock, Notice, TextArea } from '../ui';
import { useT } from '../../../i18n';

/*
 * Submit (or resubmit) one deliverable: a link to the post, a screenshot, or
 * both, plus an optional note. It goes to the server, which writes
 * campaigns/{id}/submissions/{uid} with status "submitted".
 */
const SubmitTaskSheet = ({ open, onClose, campaign, task, current, onSubmitted }) => {
    const t = useT();
    const [link, setLink] = useState('');
    const [note, setNote] = useState('');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const fileRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        setLink(current?.contentLink && /^https?:/.test(current.contentLink) ? current.contentLink : '');
        setNote(current?.note || '');
        setFile(null);
        setPreview(null);
        setError(null);
        // Only on open.
        // eslint-disable-next-line
    }, [open, task?.id]);

    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const pick = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) return setError(t('Choose an image (a screenshot of your post or story).'));
        if (f.size > 15 * 1024 * 1024) return setError(t('That image is over 15 MB.'));
        setError(null);
        setFile(f);
        setPreview(URL.createObjectURL(f));
        return undefined;
    };

    const submit = async () => {
        const url = link.trim();
        if (!url && !file && !current?.proofUrl) return setError(t('Add the link to your post or a screenshot.'));
        if (url && !/^https?:\/\//i.test(url)) return setError(t('Paste the full link, starting with https://'));
        setBusy(true);
        setError(null);
        let proofUrl = current?.proofUrl || '';
        if (file) {
            try {
                proofUrl = await uploadProof(file);
            } catch {
                setBusy(false);
                return setError(t('The screenshot didn’t upload. Check your connection and try again.'));
            }
        }
        const res = await callCreatorApi('campaign-submit', { campaignId: campaign.id, taskId: String(task.id), contentLink: url, proofUrl, note: note.trim() });
        setBusy(false);
        if (!res.ok) return setError(res.error);
        onSubmitted?.(res.data.submission);
        onClose?.();
        return undefined;
    };

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title={current?.status === 'rejected' ? t('Resubmit deliverable') : t('Submit deliverable')}
            subtitle={task?.title}
            zIndex={460}
            footer={<Button className="w-full" size="lg" loading={busy} onClick={submit}>{t('Send for review')}</Button>}
        >
            <div className="space-y-5">
                {current?.status === 'rejected' && current.rejectionReason && (
                    <Notice tone="warn" title={t('What to change')}>{current.rejectionReason}</Notice>
                )}
                <TextInput
                    label={t('Link to your post')}
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://www.instagram.com/p/…"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    type="url"
                />
                <FormBlock label={t('Screenshot')} hint={t('For stories, or to show views and reach.')}>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
                    {preview || current?.proofUrl ? (
                        <div className="relative w-32 overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/[0.1]">
                            <img src={preview || current.proofUrl} alt={t('Your screenshot')} className="aspect-[9/16] w-full object-cover" />
                            <button
                                type="button"
                                onClick={() => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ''; fileRef.current?.click(); }}
                                className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                                aria-label={t('Choose another screenshot')}
                            >
                                <X size={15} />
                            </button>
                        </div>
                    ) : (
                        <Button variant="secondary" icon={ImagePlus} onClick={() => fileRef.current?.click()}>{t('Add screenshot')}</Button>
                    )}
                </FormBlock>
                <FormBlock label={t('Note for the team (optional)')}>
                    <TextArea value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} rows={3} placeholder={t('Anything we should know')} />
                </FormBlock>
                {error && <Notice tone="error">{error}</Notice>}
            </div>
        </Sheet>
    );
};

export default SubmitTaskSheet;
