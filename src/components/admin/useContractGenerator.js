import { useState, useCallback, useMemo } from 'react';
import { CLAUSE_LIBRARY, getDefaultStrictness } from '../../services/clauseLibrary';
import { generateContractFromRequirement, generateClauseAction, analyzeContractRisk, generateRevenueContract, negotiateContract, compareContractVersions } from '../../services/aiService';

const INITIAL_FORM = {
  agreementNumber: `NB-AGR-${Date.now().toString(36).toUpperCase()}`,
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
  showSeal: true,
  showSignature: true,
};

export const useContractGenerator = (existingData) => {
  const [formData, setFormData] = useState(existingData || INITIAL_FORM);
  const [aiLoading, setAiLoading] = useState(false);
  const [clauseActionLoading, setClauseActionLoading] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [negotiateLoading, setNegotiateLoading] = useState(false);
  const [negotiateResult, setNegotiateResult] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState(null);
  const [aiError, setAiError] = useState(null);

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

  const handleAIGenerate = useCallback(async (prompt, apiKey, modelName) => {
    setAiLoading(true); setAiError(null);
    try {
      const result = await generateContractFromRequirement(apiKey, prompt, modelName);
      const strictness = getDefaultStrictness(result.risk);
      const clauses = (result.clauses || []).map((c, i) => ({
        ...c, id: c.id || `ai-${i}`, strictness: c.strictness || strictness, isActive: true,
        levels: CLAUSE_LIBRARY.find(lc => lc.id === c.id)?.levels || null
      }));
      setFormData(prev => ({
        ...prev,
        template: result.template || prev.template,
        type: result.template || prev.type,
        risk: result.risk || prev.risk,
        parties: { ...prev.parties, ...result.parties, firstParty: { ...prev.parties.firstParty, ...(result.parties?.firstParty || {}) }, secondParty: { ...prev.parties.secondParty, ...(result.parties?.secondParty || {}) } },
        details: { ...prev.details, ...(result.details || {}) },
        commercials: { ...prev.commercials, ...(result.commercials || {}) },
        clauses,
        revenueTerms: result.revenueTerms || prev.revenueTerms,
      }));
      return result;
    } catch (e) {
      const parsed = (() => { try { return JSON.parse(e.message); } catch { return { title: 'Error', message: e.message }; } })();
      setAiError(parsed);
      throw e;
    } finally { setAiLoading(false); }
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

  const handleClauseAction = useCallback(async (clauseId, action, content, apiKey, modelName) => {
    setClauseActionLoading(clauseId);
    try {
      const result = await generateClauseAction(apiKey, action, content, { type: formData.type }, modelName);
      updateClause(clauseId, { content: result });
    } catch (e) { console.error(e); } finally { setClauseActionLoading(null); }
  }, [formData.type, updateClause]);

  const runRiskAnalysis = useCallback(async (apiKey, modelName) => {
    setRiskLoading(true);
    try {
      const result = await analyzeContractRisk(apiKey, formData, modelName);
      setRiskData(result);
      if (result.riskLevel) updateField('risk', result.riskLevel);
    } catch (e) { console.error(e); } finally { setRiskLoading(false); }
  }, [formData, updateField]);

  const runRevenueGenerate = useCallback(async (revenueParams, apiKey, modelName) => {
    setRevenueLoading(true);
    try {
      const result = await generateRevenueContract(apiKey, revenueParams, { type: formData.type, parties: formData.parties }, modelName);
      const revClauses = Object.values(result).filter(v => v && typeof v === 'object' && v.title && v.content).map((c, i) => ({
        id: `rev-${i}`, title: c.title, content: c.content, isActive: true, category: 'financial', strictness: 'high', isCustom: false
      }));
      setFormData(prev => ({
        ...prev, revenueTerms: revenueParams,
        clauses: [...prev.clauses.filter(c => !c.id.startsWith('rev-')), ...revClauses]
      }));
      return result;
    } catch (e) { console.error(e); } finally { setRevenueLoading(false); }
  }, [formData]);

  const runNegotiate = useCallback(async (changes, apiKey, modelName) => {
    setNegotiateLoading(true);
    try {
      const result = await negotiateContract(apiKey, formData, changes, modelName);
      setNegotiateResult(result);
      return result;
    } catch (e) { console.error(e); } finally { setNegotiateLoading(false); }
  }, [formData]);

  const runCompare = useCallback(async (versionB, apiKey, modelName) => {
    setCompareLoading(true);
    try {
      const result = await compareContractVersions(apiKey, formData, versionB, modelName);
      setCompareResult(result);
      return result;
    } catch (e) { console.error(e); } finally { setCompareLoading(false); }
  }, [formData]);

  const paginatedPages = useMemo(() => {
    const pages = [];
    if (formData.details?.purpose) pages.push({ type: 'mission' });
    if (formData.commercials?.totalValue) pages.push({ type: 'commercials' });
    const active = formData.clauses.filter(c => c.isActive !== false);
    if (active.length > 0) {
      for (let i = 0; i < active.length; i += 3) {
        pages.push({ type: 'clauses', items: active.slice(i, i + 3), pageIndex: Math.floor(i / 3) + 1 });
      }
    }
    pages.push({ type: 'execution' });
    return pages;
  }, [formData]);

  return {
    formData, setFormData, updateField,
    aiLoading, aiError, handleAIGenerate,
    toggleClause, updateClause, removeClause, addCustomClause,
    clauseActionLoading, handleClauseAction,
    riskData, riskLoading, runRiskAnalysis,
    revenueLoading, runRevenueGenerate,
    negotiateLoading, negotiateResult, runNegotiate,
    compareLoading, compareResult, runCompare,
    paginatedPages,
  };
};

export default useContractGenerator;
