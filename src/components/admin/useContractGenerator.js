import { useState, useCallback, useMemo } from 'react';
import { CLAUSE_LIBRARY, getDefaultStrictness } from '../../services/clauseLibrary';
import { todayKey } from '../../lib/invoicing';

/** A fresh contract number. Built per contract (not once per page load) so two new contracts never share one. */
export const newAgreementNumber = () => `NB-AGR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

/** Clauses every new contract starts with (the ones a contract shouldn't go out without). */
export const ESSENTIAL_CLAUSE_IDS = ['confidentiality', 'ip_rights', 'termination', 'liability', 'governing_law', 'dispute_resolution'];

export const clauseFromLibrary = (libId, strictness = 'medium') => {
  const lib = CLAUSE_LIBRARY.find(c => c.id === libId);
  if (!lib) return null;
  return { ...lib, strictness, content: lib.levels[strictness], isActive: true };
};

const makeInitialForm = () => ({
  agreementNumber: newAgreementNumber(),
  type: 'Service Agreement',
  template: 'Service Agreement',
  risk: 'Medium',
  status: 'Draft',
  // Local date: toISOString() is UTC, a day behind in India before 5:30 am.
  effectiveDate: todayKey(),
  parties: {
    firstParty: { name: 'Newbi Entertainment & Marketing LLP', address: 'Bangalore, India', role: 'Service Provider', email: '' },
    secondParty: { name: '', address: '', role: 'Client', email: '' }
  },
  details: { projectName: '', purpose: '', duration: '', territory: 'India' },
  commercials: { totalValue: '', paymentSchedule: '', currency: 'INR', gstIncluded: true },
  clauses: [],
  revenueTerms: null,
  showSeal: false,
  showSignatures: false,
  providerSignature: null,
  providerName: 'Authorized Signatory',
  providerDesignation: 'Director of Operations',
  clientSignature: null,
  hiddenFields: [],
});

/**
 * Fills in the nested objects a contract needs so older or partial records
 * (AI drafts, uploads, early contracts) never crash the editor or preview.
 * Only adds missing pieces; never changes values that are there.
 */
export const normalizeContract = (data) => {
  if (!data) return makeInitialForm();
  const base = makeInitialForm();
  const parties = data.parties || {};
  return {
    ...data,
    agreementNumber: data.agreementNumber || base.agreementNumber,
    effectiveDate: data.effectiveDate || '',
    parties: {
      firstParty: { ...base.parties.firstParty, ...(parties.firstParty || {}) },
      secondParty: { ...base.parties.secondParty, ...(parties.secondParty || {}) },
    },
    details: { ...base.details, ...(data.details || {}) },
    commercials: { ...base.commercials, ...(data.commercials || {}) },
    clauses: Array.isArray(data.clauses) ? data.clauses.filter(Boolean) : [],
    hiddenFields: Array.isArray(data.hiddenFields) ? data.hiddenFields : [],
  };
};

/** Pages of the contract paper, in order. Shared by the editor preview and the PDF. */
export const paginateContract = (formData) => {
  const pages = [];
  const isHidden = (f) => (formData?.hiddenFields || []).includes(f);

  pages.push({ type: 'intro' });
  if (formData?.details?.purpose && !isHidden('mission')) pages.push({ type: 'mission' });
  if (formData?.commercials?.totalValue && !isHidden('commercials')) pages.push({ type: 'commercials' });

  const active = (formData?.clauses || []).filter(c => c && c.isActive !== false);
  if (active.length > 0 && !isHidden('clauses')) {
    for (let i = 0; i < active.length; i += 3) {
      pages.push({ type: 'clauses', items: active.slice(i, i + 3), pageIndex: Math.floor(i / 3) + 1 });
    }
  }
  pages.push({ type: 'execution' });
  return pages;
};

/**
 * Contract editor state. `options.withDefaultClauses` starts a brand-new
 * contract with the essential clauses already added.
 */
export const useContractGenerator = (existingData, options = {}) => {
  const [formData, setFormData] = useState(() => {
    if (existingData) return normalizeContract(existingData);
    const fresh = makeInitialForm();
    if (options.withDefaultClauses) {
      fresh.clauses = ESSENTIAL_CLAUSE_IDS.map(cid => clauseFromLibrary(cid, getDefaultStrictness(fresh.risk))).filter(Boolean);
    }
    return fresh;
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const updateField = useCallback((path, value) => {
    setFormData(prev => {
      const keys = path.split('.');
      const updated = JSON.parse(JSON.stringify(prev));
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        if (obj[keys[i]] === null || typeof obj[keys[i]] !== 'object') obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  }, []);

  const toggleClause = useCallback((clauseId, action, reorderedList) => {
    if (reorderedList) { setFormData(prev => ({ ...prev, clauses: reorderedList })); return; }
    if (action === 'add') {
      setFormData(prev => {
        if ((prev.clauses || []).some(c => c.id === clauseId)) return prev;
        const clause = clauseFromLibrary(clauseId, getDefaultStrictness(prev.risk || 'Medium'));
        if (!clause) return prev;
        return { ...prev, clauses: [...(prev.clauses || []), clause] };
      });
    }
  }, []);

  const updateClause = useCallback((clauseId, updates) => {
    setFormData(prev => ({ ...prev, clauses: (prev.clauses || []).map(c => c.id === clauseId ? { ...c, ...updates } : c) }));
  }, []);

  const removeClause = useCallback((clauseId) => {
    setFormData(prev => ({ ...prev, clauses: (prev.clauses || []).filter(c => c.id !== clauseId) }));
  }, []);

  const addCustomClause = useCallback((title, content) => {
    const id = `custom-${Date.now()}`;
    setFormData(prev => ({ ...prev, clauses: [...(prev.clauses || []), { id, title, content, isActive: true, isCustom: true, strictness: 'medium', category: 'custom' }] }));
  }, []);

  const paginatedPages = useMemo(() => paginateContract(formData), [formData]);

  return {
    formData, setFormData, updateField,
    toggleClause, updateClause, removeClause, addCustomClause,
    paginatedPages,
    isGenerating, setIsGenerating
  };
};

export default useContractGenerator;
