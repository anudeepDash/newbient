/*
 * Built-in forms: the question types, their defaults and the checks run
 * before a response is accepted. The same checks run on the server in
 * api/forms.js (validateAnswers) — keep the two in step.
 *
 * A built-in form is a `forms` document with a `fields` array:
 *   { id, type, label, help, required, placeholder, options, min, max, accept, maxSizeMb }
 * Older forms only have `formUrl` (a Google Form) and keep working as before.
 */

export const FIELD_TYPES = [
    { type: 'short', label: 'Short answer', hint: 'A line of text', tone: 'blue' },
    { type: 'long', label: 'Paragraph', hint: 'Longer text', tone: 'cyan' },
    { type: 'email', label: 'Email', hint: 'Checked for a valid address', tone: 'indigo' },
    { type: 'phone', label: 'Phone', hint: 'Mobile number', tone: 'green' },
    { type: 'number', label: 'Number', hint: 'With optional limits', tone: 'teal' },
    { type: 'radio', label: 'Multiple choice', hint: 'Pick one', tone: 'violet' },
    { type: 'checkbox', label: 'Checkboxes', hint: 'Pick any', tone: 'fuchsia' },
    { type: 'select', label: 'Dropdown', hint: 'Pick one from a list', tone: 'pink' },
    { type: 'date', label: 'Date', hint: 'A calendar day', tone: 'amber' },
    { type: 'url', label: 'Link', hint: 'Instagram, portfolio, Drive…', tone: 'orange' },
    { type: 'file', label: 'File upload', hint: 'Photo, PDF or document', tone: 'rose' },
    { type: 'heading', label: 'Section title', hint: 'Splits the form into parts', tone: 'gray' },
];

export const FIELD_TYPE_MAP = Object.fromEntries(FIELD_TYPES.map(t => [t.type, t]));
export const CHOICE_TYPES = ['radio', 'checkbox', 'select'];
export const NO_ANSWER_TYPES = ['heading'];

export const FILE_ACCEPT = {
    image: { label: 'Images', accept: 'image/*' },
    pdf: { label: 'PDF', accept: 'application/pdf,.pdf' },
    any: { label: 'Images, PDF or documents', accept: 'image/*,application/pdf,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt' },
};

const uid = () => `f_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

export const newField = (type) => {
    const base = { id: uid(), type, label: '', help: '', required: false, placeholder: '' };
    if (CHOICE_TYPES.includes(type)) return { ...base, options: ['Option 1', 'Option 2'] };
    if (type === 'file') return { ...base, accept: 'any', maxSizeMb: 10 };
    if (type === 'number') return { ...base, min: '', max: '' };
    if (type === 'heading') return { ...base, label: 'New section' };
    return base;
};

export const copyField = (field) => ({ ...JSON.parse(JSON.stringify(field)), id: uid() });

/** A ready-made start so a new form isn't a blank page. */
export const starterFields = () => [
    { ...newField('short'), label: 'Full name', required: true },
    { ...newField('email'), label: 'Email', required: true },
    { ...newField('phone'), label: 'Phone number', required: true },
];

export const isNativeForm = (form) => Array.isArray(form?.fields) && form.fields.length > 0;

/** Why a form isn't taking responses ('' when it is). */
export const formClosedReason = (form, now = new Date()) => {
    if (!form) return 'This form is not available.';
    if (String(form.activeLabel || '').toLowerCase() === 'closed') return 'This form is closed.';
    if (form.closesAt) {
        const end = new Date(form.closesAt);
        if (!isNaN(end.getTime()) && end < now) return 'This form has stopped taking responses.';
    }
    const limit = Number(form.responseLimit) || 0;
    if (limit > 0 && (Number(form.responseCount) || 0) >= limit) return 'This form has reached its response limit.';
    return '';
};

/** live | filling | closed, for badges and tabs. */
export const formState = (form, now = new Date()) => {
    if (formClosedReason(form, now)) return 'closed';
    if (form.activeLabel === 'Few Slots Remain') return 'filling';
    return 'live';
};

export const FORM_STATE_LABEL = {
    live: { label: 'Live', tone: 'green' },
    filling: { label: 'Filling fast', tone: 'amber' },
    closed: { label: 'Closed', tone: 'red' },
};

const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0);

/** { answers, errors } — answers cleaned to the form's questions. */
export const validateAnswers = (fields, raw) => {
    const answers = {};
    const errors = {};
    (fields || []).forEach(field => {
        if (!field?.id || NO_ANSWER_TYPES.includes(field.type)) return;
        let v = raw?.[field.id];
        if (typeof v === 'string') v = v.trim().slice(0, 5000);
        if (isEmpty(v)) {
            if (field.required) errors[field.id] = 'This is required.';
            return;
        }
        const options = (field.options || []).map(String);
        switch (field.type) {
            case 'email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v))) errors[field.id] = 'Enter a valid email.';
                break;
            case 'phone': {
                const digits = String(v).replace(/\D/g, '');
                if (digits.length < 7 || digits.length > 15) errors[field.id] = 'Enter a valid phone number.';
                break;
            }
            case 'number': {
                const n = Number(v);
                if (!Number.isFinite(n)) errors[field.id] = 'Enter a number.';
                else if (field.min !== undefined && field.min !== '' && n < Number(field.min)) errors[field.id] = `Must be at least ${field.min}.`;
                else if (field.max !== undefined && field.max !== '' && n > Number(field.max)) errors[field.id] = `Must be at most ${field.max}.`;
                else v = n;
                break;
            }
            case 'url':
                if (!/^https?:\/\/\S+\.\S+/i.test(String(v))) errors[field.id] = 'Enter a link starting with http.';
                break;
            case 'select':
            case 'radio':
                if (!options.includes(String(v))) errors[field.id] = 'Pick one of the options.';
                break;
            case 'checkbox':
                if (!Array.isArray(v) || v.some(x => !options.includes(String(x)))) errors[field.id] = 'Pick from the options.';
                break;
            case 'date':
                if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) errors[field.id] = 'Pick a date.';
                break;
            case 'file': {
                const files = (Array.isArray(v) ? v : [v]).filter(Boolean);
                if (!files.length || files.some(f => typeof f?.url !== 'string' || !/^https:\/\//.test(f.url))) errors[field.id] = 'Upload the file again.';
                else v = files;
                break;
            }
            default:
                v = String(v);
        }
        if (!errors[field.id]) answers[field.id] = v;
    });
    return { answers, errors };
};

/** Problems with the form itself before it can be saved (builder side). */
export const builderProblems = (fields) => {
    const problems = {};
    (fields || []).forEach(f => {
        if (!String(f.label || '').trim()) problems[f.id] = 'Give this question a title.';
        else if (CHOICE_TYPES.includes(f.type)) {
            const opts = (f.options || []).map(o => String(o).trim());
            if (opts.filter(Boolean).length === 0) problems[f.id] = 'Add at least one option.';
            else if (opts.some(o => !o)) problems[f.id] = 'Fill in or remove the empty option.';
            else if (new Set(opts.map(o => o.toLowerCase())).size !== opts.length) problems[f.id] = 'Two options are the same.';
        } else if (f.type === 'number' && f.min !== '' && f.max !== '' && f.min !== undefined && f.max !== undefined && Number(f.min) > Number(f.max)) {
            problems[f.id] = 'The lowest value is above the highest.';
        }
    });
    return problems;
};

/** Plain text of an answer for tables and exports. */
export const answerText = (field, value) => {
    if (value === undefined || value === null || value === '') return '';
    if (field?.type === 'file' || (Array.isArray(value) && value[0]?.url) || value?.url) {
        const files = Array.isArray(value) ? value : [value];
        return files.map(f => f.url).join('\n');
    }
    if (Array.isArray(value)) return value.join(', ');
    if (field?.type === 'date') {
        const d = new Date(`${value}T00:00:00`);
        return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return String(value);
};

/**
 * The questions to show for a response: the form's current questions plus
 * any older ones the response still has answers for.
 */
export const responseFields = (form, responses = []) => {
    const current = (form?.fields || []).filter(f => !NO_ANSWER_TYPES.includes(f.type));
    const known = new Set(current.map(f => f.id));
    const extra = [];
    responses.forEach(r => (r.fields || []).forEach(f => {
        if (!known.has(f.id) && r.answers && f.id in r.answers) {
            known.add(f.id);
            extra.push({ ...f, removed: true });
        }
    }));
    return [...current, ...extra];
};

/** Name / email / phone pulled from a response for list rows. */
export const responseIdentity = (response, fields = []) => {
    const a = response?.answers || {};
    const find = (test) => {
        const f = fields.find(test);
        return f ? a[f.id] : '';
    };
    const name = response?.name || find(f => f.type === 'short' && /name/i.test(f.label || '')) || find(f => f.type === 'short') || '';
    const email = response?.email || find(f => f.type === 'email') || '';
    const phone = find(f => f.type === 'phone') || '';
    return { name: String(name || ''), email: String(email || ''), phone: String(phone || '') };
};
