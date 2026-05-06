import { useState, useCallback, useMemo } from 'react';
import { CLAUSE_LIBRARY, getDefaultStrictness } from '../../services/clauseLibrary';

const INITIAL_FORM = {
  agreementNumber: `NB-AGR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
  type: 'Service Agreement',
  template: 'Service Agreement',
  risk: 'Medium',
  status: 'Draft',
  effectiveDate: new Date().toISOString().split('T')[0],
  parties: {
    firstParty: { name: 'Newbi Entertainment', address: 'Bangalore, India', role: 'Service Provider', email: '' },
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
};

export const useContractGenerator = (existingData) => {
  const [formData, setFormData] = useState(existingData || INITIAL_FORM);
  const [isGenerating, setIsGenerating] = useState(false);

  const updateField = useCallback((path, value) => {
    setFormData(prev => {
      const keys = path.split('.');
      const updated = JSON.parse(JSON.stringify(prev));
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  }, []);

  const toggleClause = useCallback((clauseId, action, reorderedList) => {
    if (reorderedList) { setFormData(prev => ({ ...prev, clauses: reorderedList })); return; }
    if (action === 'add') {
      const lib = CLAUSE_LIBRARY.find(c => c.id === clauseId);
      if (!lib) return;
      const s = getDefaultStrictness(formData.risk);
      setFormData(prev => ({ ...prev, clauses: [...prev.clauses, { ...lib, strictness: s, content: lib.levels[s], isActive: true }] }));
    }
  }, [formData.risk]);

  const updateClause = useCallback((clauseId, updates) => {
    setFormData(prev => ({ ...prev, clauses: prev.clauses.map(c => c.id === clauseId ? { ...c, ...updates } : c) }));
  }, []);

  const removeClause = useCallback((clauseId) => {
    setFormData(prev => ({ ...prev, clauses: prev.clauses.filter(c => c.id !== clauseId) }));
  }, []);

  const addCustomClause = useCallback((title, content) => {
    const id = `custom-${Date.now()}`;
    setFormData(prev => ({ ...prev, clauses: [...prev.clauses, { id, title, content, isActive: true, isCustom: true, strictness: 'medium', category: 'custom' }] }));
  }, []);

  const paginatedPages = useMemo(() => {
    const pages = [];
    const isHidden = (f) => (formData.hiddenFields || []).includes(f);
    
    pages.push({ type: 'intro' });
    if (formData.details?.purpose && !isHidden('mission')) pages.push({ type: 'mission' });
    if (formData.commercials?.totalValue && !isHidden('commercials')) pages.push({ type: 'commercials' });
    
    const active = formData.clauses.filter(c => c.isActive !== false);
    if (active.length > 0 && !isHidden('clauses')) {
      for (let i = 0; i < active.length; i += 3) {
        pages.push({ type: 'clauses', items: active.slice(i, i + 3), pageIndex: Math.floor(i / 3) + 1 });
      }
    }
    pages.push({ type: 'execution' });
    return pages;
  }, [formData]);

  return {
    formData, setFormData, updateField,
    toggleClause, updateClause, removeClause, addCustomClause,
    paginatedPages,
    isGenerating, setIsGenerating
  };
};

export default useContractGenerator;
