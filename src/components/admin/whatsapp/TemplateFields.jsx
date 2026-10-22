import React, { useEffect, useMemo, useState } from 'react';
import { Field, fieldCls } from '../uploads/UploadKit';
import { callOutreach } from '../campaigns/outreach/outreachApi';
import { FIELDS, fieldsFor, isAuto, token, fillTokens } from '../../../lib/outreach/waFields';

/*
 * Picking an approved WhatsApp template and filling its variables (the
 * "Send on WhatsApp" sheet and the campaign's "Message creators"). Fields that
 * can be filled for each person ({first_name}, and {campaign_title} etc. when
 * there's a campaign) start filled in; the server fills them per person
 * (api/_lib/whatsappCenter.js, wa-bulk). Every field can be typed over.
 */

const fill = (text, values) => String(text || '').replace(/\{\{(\d+)\}\}/g, (_, n) => values[Number(n) - 1] || `{{${n}}}`);

/** State for the picker. `active` loads the approved templates the first time it's true. */
export const useWhatsAppTemplate = ({ active, campaign = false }) => {
    const aud = { campaign: Boolean(campaign) };
    const [templates, setTemplates] = useState({ loading: false, list: null, error: '' });
    const [key, setKey] = useState('');
    const [body, setBody] = useState([]);
    const [buttons, setButtons] = useState({});
    const [headerUrl, setHeaderUrl] = useState('');

    useEffect(() => {
        if (!active || templates.list || templates.loading) return;
        setTemplates({ loading: true, list: null, error: '' });
        callOutreach('wa-templates').then(r => setTemplates({
            loading: false,
            list: r.ok ? r.data.templates.filter(t => t.status === 'APPROVED') : [],
            error: r.ok ? '' : r.error,
        }));
    }, [active, templates.list, templates.loading]);

    const tpl = (templates.list || []).find(t => `${t.name}|${t.language}` === key) || null;
    const fields = useMemo(() => (tpl ? fieldsFor(tpl) : { body: [], button: null }), [tpl]);

    useEffect(() => {
        setBody(tpl ? fields.body.map(k => (k && isAuto(k, aud) ? token(k) : '')) : []);
        setButtons(tpl && fields.button && isAuto(fields.button, aud) ? Object.fromEntries(tpl.buttons.filter(b => b.dynamic).map(b => [b.index, token(fields.button)])) : {});
        setHeaderUrl('');
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    const ready = Boolean(tpl) && body.every(v => v.trim())
        && tpl.buttons.filter(b => b.dynamic).every(b => String(buttons[b.index] || '').trim())
        && (tpl.header?.format !== 'DOCUMENT' || /^https:\/\//.test(headerUrl));

    return {
        aud, templates, key, setKey, tpl, fields, body, setBody, buttons, setButtons, headerUrl, setHeaderUrl, ready,
        reset: () => setKey(''),
        payload: tpl ? { template: tpl.name, language: tpl.language, params: { body, buttons, headerUrl: headerUrl.trim() || undefined } } : null,
    };
};

export const WhatsAppTemplateFields = ({ wa, campaign = null, sampleName = '' }) => {
    const { aud, templates, key, setKey, tpl, fields, body, setBody, buttons, setButtons, headerUrl, setHeaderUrl } = wa;
    if (templates.loading || !templates.list) return <p className="text-[13px] text-gray-500">Loading approved templates…</p>;
    if (templates.error) return <p className="text-[13px] text-rose-600">{templates.error}</p>;
    if (!templates.list.length) return <p className="text-[13px] text-gray-500">No approved templates yet. They show here once Meta approves them.</p>;

    const sample = {
        ...Object.fromEntries(Object.entries(FIELDS).map(([k, f]) => [k, f.example])),
        ...(sampleName ? { first_name: sampleName.split(/\s+/)[0], full_name: sampleName } : {}),
        ...(campaign ? { campaign_title: campaign.title, campaign_id: campaign.id } : {}),
    };
    const hint = (k, value, set) => {
        if (!k) return null;
        if (/^\{[a-z_]+\}$/.test(value)) {
            return <span className="text-[12px] text-emerald-700 dark:text-neon-green">Filled in for each person · <button type="button" className="font-semibold underline" onClick={() => set('')}>type it instead</button></span>;
        }
        if (isAuto(k, aud)) return <button type="button" className="text-[12px] font-semibold text-emerald-700 dark:text-neon-green" onClick={() => set(token(k))}>Use each person’s {FIELDS[k].label.toLowerCase()}</button>;
        if (FIELDS[k]?.auto === 'campaign') return <span className="text-[12px] text-gray-500">Type it in: there’s no campaign here to fill it from.</span>;
        return null;
    };

    return (
        <div className="space-y-3">
            <Field label="Approved template">
                <select className={fieldCls} value={key} onChange={(e) => setKey(e.target.value)}>
                    <option value="">Choose a template</option>
                    {templates.list.map(t => <option key={`${t.name}|${t.language}`} value={`${t.name}|${t.language}`}>{t.name} · {t.language}</option>)}
                </select>
            </Field>
            {tpl && (
                <>
                    {tpl.header?.format === 'DOCUMENT' && (
                        <Field label="PDF link">
                            <input className={fieldCls} value={headerUrl} onChange={(e) => setHeaderUrl(e.target.value)} placeholder="https://…pdf" inputMode="url" />
                        </Field>
                    )}
                    {body.map((v, i) => {
                        const k = fields.body[i];
                        const set = (val) => setBody(b => b.map((x, j) => (j === i ? val : x)));
                        return (
                            <div key={i} className="space-y-1">
                                <Field label={`{{${i + 1}}}${k ? ` · ${FIELDS[k]?.label || k}` : ''}`}>
                                    <input className={fieldCls} value={v} onChange={(e) => set(e.target.value)} placeholder={tpl.examples[i] ? `e.g. ${tpl.examples[i]}` : ''} maxLength={900} />
                                </Field>
                                {hint(k, v, set)}
                            </div>
                        );
                    })}
                    {tpl.buttons.filter(b => b.dynamic).map(b => {
                        const set = (val) => setButtons(x => ({ ...x, [b.index]: val }));
                        return (
                            <div key={b.index} className="space-y-1">
                                <Field label={`“${b.text}” link ending`}>
                                    <input className={fieldCls} value={buttons[b.index] || ''} onChange={(e) => set(e.target.value)} placeholder={b.url.replace('{{1}}', '…')} />
                                </Field>
                                {hint(fields.button, buttons[b.index] || '', set)}
                            </div>
                        );
                    })}
                    <div className="whitespace-pre-wrap rounded-2xl bg-[#dcf8c6] p-3 text-[13.5px] text-gray-900 dark:bg-[#005c4b] dark:text-white">
                        {fill(tpl.body, body.map(v => fillTokens(v, sample)))}
                        {tpl.buttons.map(b => <span key={b.index} className="mt-1 block text-center font-semibold text-sky-700 dark:text-sky-300">{b.text}</span>)}
                    </div>
                </>
            )}
        </div>
    );
};
