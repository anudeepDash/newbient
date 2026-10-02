import React from 'react';
import { cn } from '../../lib/utils';
import DocumentSeal from './DocumentSeal';

export default function ProposalDocumentRenderer({ 
    page, 
    pageIdx, 
    totalPages, 
    formData = {}, 
    currentLogo = { path: '/logo_document.png' }, 
    isHidden = () => false, 
    renderContent = (t) => t, 
    isExporting = false,
    signatureArea = null
}) {
    const isV2 = formData.templateVersion === 'v2' || String(page.type).startsWith('v2-');

    const renderSafeText = (content, className = '') => {
        if (!content) return null;
        if (renderContent && renderContent !== ((t) => t)) {
            const res = renderContent(content, className);
            if (res) return res;
        }
        if (typeof content !== 'string') return content;
        
        const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(content);
        if (hasHtmlTags && typeof window !== 'undefined' && window.DOMParser) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, 'text/html');
                doc.querySelectorAll('script, iframe, object, embed, form').forEach(el => el.remove());
                return (
                    <div 
                        className={cn("leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4", className)}
                        dangerouslySetInnerHTML={{ __html: doc.body.innerHTML }} 
                    />
                );
            } catch (e) {
                // fallback to decoded string
            }
        }
        
        const decoded = content
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .trim();
        return <p className={className}>{decoded}</p>;
    };

    // ═════════════════════════════════════════════════════════════════════════
    // NEW v2 DESIGN SYSTEM (8-PAGE MASTER SPECIFICATION)
    // ═════════════════════════════════════════════════════════════════════════
    if (isV2) {
        return (
            <div 
                className="proposal-page-render w-[794px] h-[1123px] bg-white text-black relative flex flex-col p-[16mm] shadow-2xl rounded-[2px] overflow-hidden shrink-0 font-['Outfit']"
                style={{ margin: isExporting ? '0' : undefined }}
            >
                {/* Standard Top Header across ALL pages */}
                <div className="flex justify-between items-start mb-6 border-b border-black/10 pb-4 relative z-10 shrink-0">
                    <div className="flex flex-col items-start">
                        <img 
                            src={currentLogo?.path || '/logo_document.png'} 
                            alt="Newbi Entertainment" 
                            className="h-10 w-auto object-contain" 
                            crossOrigin="anonymous" 
                        />
                    </div>
                    
                    <div className="text-right space-y-0.5">
                        <h4 className="text-[9px] font-bold uppercase text-gray-500 tracking-[0.25em]">QUOTATION</h4>
                        <p className="text-sm font-black text-black tracking-wider font-mono">
                            {formData.proposalNumber || 'NBQ-XXXX'}
                        </p>
                    </div>
                </div>

                {/* Page Body Content */}
                <div className="flex-1 overflow-hidden relative z-10 flex flex-col justify-start">
                    
                    {/* ── PAGE 1: COVER PAGE ────────────────────────────────────────── */}
                    {page.type === 'v2-cover' && (
                        <div className="h-full flex flex-col justify-start">
                            {/* Official Strategic Quotation Pill */}
                            {formData.showCoverPill !== false && (
                                <div className="mb-6 inline-flex items-center px-4 py-1.5 rounded-full bg-[#E8FAF0] border border-[#B8F2D1] text-[#15803D] text-[10px] font-black uppercase tracking-widest shadow-sm self-start">
                                    {formData.coverPillText || 'OFFICIAL STRATEGIC QUOTATION'}
                                </div>
                            )}

                            {/* 2-Column Metadata Grid */}
                            <div className="grid grid-cols-2 gap-8 mb-6 pb-6 border-b border-gray-100">
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-1.5">CLIENT ENTITY</p>
                                    <h2 className="text-2xl font-black text-black tracking-tight leading-tight">
                                        {formData.clientName || 'Client Entity'}
                                    </h2>
                                    {formData.clientSubtitle && (
                                        <p className="text-xs text-gray-500 font-medium italic mt-1">
                                            {formData.clientSubtitle}
                                        </p>
                                    )}
                                    {formData.clientAddress && (
                                        <p className="text-[11px] text-gray-500 font-normal mt-1 leading-snug">
                                            {formData.clientAddress}
                                        </p>
                                    )}
                                </div>

                                <div className="text-right flex flex-col items-end">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-1.5">PROJECT SPECIFICATION</p>
                                    <h2 className="text-2xl font-black text-black tracking-tight leading-tight">
                                        {formData.campaignName || 'Project Specification'}
                                    </h2>
                                    {formData.campaignSubtitle && (
                                        <p className="text-base font-black text-black tracking-tight mt-0.5">
                                            {formData.campaignSubtitle}
                                        </p>
                                    )}
                                    {formData.showDuration !== false && formData.campaignDuration && (
                                        <div className="mt-2.5 inline-flex items-center px-3 py-1 rounded-full bg-[#E8FAF0] border border-[#B8F2D1] text-[#15803D] text-[9px] font-black uppercase tracking-wider">
                                            DURATION: {formData.campaignDuration}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Introduction Narrative */}
                            <div className="text-[12.5px] text-gray-800 leading-relaxed font-normal mb-6">
                                {renderSafeText(formData.introParagraph || formData.coverDescription)}
                            </div>

                            {/* WHAT'S INSIDE Grid */}
                            {formData.showWhatsInside !== false && (
                                <div className="mb-6">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-2.5">WHAT'S INSIDE</p>
                                    <div className="grid grid-cols-3 gap-2.5">
                                        {(formData.whatsInside || []).map((card, idx) => (
                                            <div key={idx} className="border border-gray-200 rounded-xl p-3 bg-white flex flex-col justify-start">
                                                <span className="text-sm font-black text-[#16A34A] mb-1">
                                                    {card.num || String(idx + 1).padStart(2, '0')}
                                                </span>
                                                <span className="text-[11px] font-bold text-gray-900 leading-snug">
                                                    {card.title}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* PREPARED FOR Callout Box */}
                            {formData.showPreparedFor !== false && (
                                <div className="bg-[#F9FAFB] border-l-4 border-[#16A34A] p-3.5 rounded-r-xl mb-4">
                                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#16A34A] mb-1">PREPARED FOR</p>
                                    <div className="text-[11.5px] text-gray-700 leading-relaxed font-medium">
                                        {renderSafeText(formData.preparedForText || `This quotation has been prepared exclusively for ${formData.clientName || 'the client'}, in connection with ${formData.campaignName || 'the campaign'}. All figures and scope items are indicative and open to discussion ahead of final sign-off.`)}
                                    </div>
                                </div>
                            )}

                            {/* Bottom Metadata Row */}
                            <div className="mt-auto grid grid-cols-2 pt-3 border-t border-gray-100 text-[9px]">
                                <div>
                                    <span className="font-bold uppercase tracking-widest text-gray-400 block mb-0.5">QUOTE REFERENCE</span>
                                    <span className="font-black text-black">{formData.proposalNumber || 'NBQ-XXXX'}</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold uppercase tracking-widest text-gray-400 block mb-0.5">CLASSIFICATION</span>
                                    <span className="font-black text-black">{formData.classification || 'Strategic Commercial'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── PAGE 2: STRATEGIC OUTLINE / EXECUTIVE SUMMARY ───────────── */}
                    {page.type === 'v2-executive' && (
                        <div className="h-full flex flex-col justify-start space-y-5">
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-1">
                                    {formData.strategySub || 'STRATEGIC OUTLINE'}
                                </p>
                                <h2 className="text-2xl font-black text-black tracking-tight">
                                    {formData.strategyTitle || 'Executive Summary'}
                                </h2>
                            </div>

                            {/* Paragraphs */}
                            <div className="space-y-2.5 text-[12px] text-gray-800 leading-relaxed">
                                {(formData.executiveParagraphs || [formData.overview]).map((p, idx) => (
                                    <p key={idx}>{p}</p>
                                ))}
                            </div>

                            {/* PRIMARY OBJECTIVE Box */}
                            {formData.showPrimaryObjective !== false && (
                                <div className="bg-[#F9FAFB] border-l-4 border-[#16A34A] p-3.5 rounded-r-xl">
                                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#16A34A] mb-1">
                                        {formData.primaryObjectiveTitle || 'PRIMARY OBJECTIVE'}
                                    </p>
                                    <p className="text-[11.5px] text-gray-700 leading-relaxed font-medium">
                                        {formData.primaryObjectiveText || formData.primaryGoal}
                                    </p>
                                </div>
                            )}

                            {/* KEY ANCHOR MARKETS Matrix */}
                            {formData.showAnchorMarkets !== false && (
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-2">
                                        {formData.anchorMarketsTitle || 'KEY ANCHOR MARKETS'}
                                    </p>
                                    <div className="grid grid-cols-3 gap-2 mb-1.5">
                                        {(formData.anchorMarkets || []).map((m, idx) => (
                                            <div key={idx} className="border border-gray-200 rounded-lg py-2 px-3 text-center text-xs font-bold text-gray-900 bg-white">
                                                {m}
                                            </div>
                                        ))}
                                    </div>
                                    {formData.anchorMarketsCaption && (
                                        <p className="text-[9.5px] text-gray-500 italic">
                                            {formData.anchorMarketsCaption}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* WHY THIS APPROACH Box */}
                            {formData.showWhyThisApproach !== false && (
                                <div className="bg-[#F9FAFB] border-l-4 border-[#16A34A] p-3.5 rounded-r-xl">
                                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#16A34A] mb-1">
                                        {formData.whyThisApproachTitle || 'WHY THIS APPROACH'}
                                    </p>
                                    <p className="text-[11.5px] text-gray-700 leading-relaxed font-medium">
                                        {formData.whyThisApproachText}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── PAGES 3 & 4: PROCESS & EXECUTION BLUEPRINT ──────────────── */}
                    {(page.type === 'v2-blueprint-1' || page.type === 'v2-blueprint-2') && (
                        <div className="h-full flex flex-col justify-start">
                            <div className="mb-6">
                                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-1">
                                    {formData.blueprintSub || "HOW WE'LL EXECUTE"}
                                </p>
                                <h2 className="text-2xl font-black text-black tracking-tight">
                                    {page.title || (formData.blueprintTitle || 'Process & Execution Blueprint')}
                                </h2>
                            </div>

                            <div className="space-y-6 flex-1">
                                {(page.steps || []).map((step, sIdx) => (
                                    <div key={sIdx} className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 bg-[#E8FAF0] text-[#15803D] font-black text-xs rounded-md flex items-center justify-center shrink-0">
                                                {step.stepNumber || sIdx + 1}
                                            </div>
                                            <h3 className="text-sm font-bold text-black">{step.title}</h3>
                                        </div>
                                        <ul className="pl-10 space-y-1.5">
                                            {(step.bullets || []).map((b, bIdx) => (
                                                <li key={bIdx} className="text-[11.5px] text-gray-700 leading-relaxed flex items-start gap-2">
                                                    <span className="text-[#16A34A] font-bold mt-0.5">•</span>
                                                    <span>{b}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── PAGE 5: DELIVERABLES & SCOPE SUMMARY ────────────────────── */}
                    {page.type === 'v2-deliverables' && (
                        <div className="h-full flex flex-col justify-start">
                            <div className="mb-5">
                                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-1">
                                    {formData.deliverablesSub || 'SCOPE SUMMARY'}
                                </p>
                                <h2 className="text-2xl font-black text-black tracking-tight">
                                    {formData.deliverablesTitle || 'Per City Deliverables'}
                                </h2>
                            </div>

                            {/* Table */}
                            <table className="w-full text-left border-collapse rounded-xl overflow-hidden mb-2.5 border border-gray-100">
                                <thead className="bg-gray-50/80 border-b border-gray-200">
                                    <tr>
                                        <th className="py-2.5 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider w-10 text-center">#</th>
                                        <th className="py-2.5 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider">DELIVERABLE</th>
                                        <th className="py-2.5 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider w-36">QTY / UNIT</th>
                                        <th className="py-2.5 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider w-36">TIMELINE</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-[11.5px]">
                                    {(formData.deliverablesTable || formData.deliverables || []).map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-gray-50/50">
                                            <td className="py-2.5 px-3 font-mono font-medium text-gray-400 text-center">
                                                {row.id || String(rIdx + 1).padStart(2, '0')}
                                            </td>
                                            <td className="py-2.5 px-3 font-bold text-gray-900">{row.deliverable || row.item}</td>
                                            <td className="py-2.5 px-3 text-gray-600 font-medium">{row.qty || '—'}</td>
                                            <td className="py-2.5 px-3 text-gray-600 font-medium">{row.timeline || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {formData.deliverablesTableNote && (
                                <p className="text-[8.5px] font-bold uppercase tracking-wider text-gray-400 mb-6">
                                    {formData.deliverablesTableNote}
                                </p>
                            )}

                            {/* Note on Primary Market Box */}
                            {formData.showCityNote !== false && (
                                <div className="bg-[#F9FAFB] border-l-4 border-[#16A34A] p-3.5 rounded-r-xl mt-auto">
                                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#16A34A] mb-1">
                                        {formData.cityNoteTitle || 'NOTE ON BENGALURU'}
                                    </p>
                                    <p className="text-[11.5px] text-gray-700 leading-relaxed font-medium">
                                        {formData.cityNoteText}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── PAGE 6: COMMERCIALS & PRICING STRUCTURE ─────────────────── */}
                    {page.type === 'v2-commercials' && (
                        <div className="h-full flex flex-col justify-start">
                            <div className="mb-4">
                                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-1">
                                    {formData.commercialsSub || 'COMMERCIALS'}
                                </p>
                                <h2 className="text-2xl font-black text-black tracking-tight mb-1">
                                    {formData.commercialsTitle || '04 · Pricing Structure'}
                                </h2>
                                {formData.commercialsSubtitle && (
                                    <p className="text-xs text-gray-700 leading-relaxed">
                                        {formData.commercialsSubtitle}
                                    </p>
                                )}
                            </div>

                            {/* Pricing Table */}
                            <table className="w-full text-left border-collapse rounded-xl overflow-hidden mb-2 border border-gray-100">
                                <thead className="bg-gray-50/80 border-b border-gray-200">
                                    <tr>
                                        <th className="py-2.5 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider w-10 text-center">#</th>
                                        <th className="py-2.5 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider">DELIVERABLE</th>
                                        <th className="py-2.5 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider w-36">QTY / UNIT</th>
                                        <th className="py-2.5 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider w-36">TIMELINE</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-[11.5px]">
                                    {(formData.pricingTable || []).map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-gray-50/50">
                                            <td className="py-3 px-3 font-mono font-medium text-gray-400 text-center">
                                                {row.id || String(rIdx + 1).padStart(2, '0')}
                                            </td>
                                            <td className="py-3 px-3">
                                                <p className="font-bold text-gray-900">{row.deliverable}</p>
                                                {row.description && (
                                                    <p className="text-[10px] text-gray-500 mt-0.5">{row.description}</p>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 font-bold text-black">{row.qtyPrice || '—'}</td>
                                            <td className="py-3 px-3 text-gray-600 font-medium">{row.timeline || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {formData.pricingTableNote && (
                                <p className="text-[8.5px] font-bold uppercase tracking-wider text-gray-400 mb-5">
                                    {formData.pricingTableNote}
                                </p>
                            )}

                            {/* WHAT'S INCLUDED Box */}
                            {formData.showWhatsIncluded !== false && (
                                <div className="bg-[#F9FAFB] border-l-4 border-[#16A34A] p-3.5 rounded-r-xl mb-4">
                                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#16A34A] mb-1">
                                        {formData.whatsIncludedTitle || "WHAT'S INCLUDED"}
                                    </p>
                                    <p className="text-[11.5px] text-gray-700 leading-relaxed font-medium">
                                        {formData.whatsIncludedText}
                                    </p>
                                </div>
                            )}

                            {/* PAYMENT & SCALING Box */}
                            {formData.showPaymentScaling !== false && (
                                <div className="bg-[#F9FAFB] border-l-4 border-[#16A34A] p-3.5 rounded-r-xl">
                                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#16A34A] mb-1">
                                        {formData.paymentScalingTitle || 'PAYMENT & SCALING'}
                                    </p>
                                    <p className="text-[11.5px] text-gray-700 leading-relaxed font-medium">
                                        {formData.paymentScalingText}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── PAGE 7: CITY DEEP-DIVE / BENGALURU MANAGEMENT ───────────── */}
                    {page.type === 'v2-deepdive' && (
                        <div className="h-full flex flex-col justify-start">
                            <div className="mb-4">
                                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-1">
                                    {formData.deepDiveSub || 'CITY DEEP-DIVE · BENGALURU'}
                                </p>
                                <h2 className="text-2xl font-black text-black tracking-tight mb-2">
                                    {formData.deepDiveTitle || '05 · Bengaluru Management'}
                                </h2>
                                {formData.deepDiveIntro && (
                                    <p className="text-xs text-gray-800 leading-relaxed mb-6">
                                        {formData.deepDiveIntro}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-6 flex-1">
                                {(formData.deepDiveSubsections || []).map((sec, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex items-center gap-2.5">
                                            <span className="px-2 py-0.5 bg-[#E8FAF0] text-[#15803D] font-bold text-xs rounded-md">
                                                {sec.badge || `5.${idx + 1}`}
                                            </span>
                                            <h3 className="text-sm font-bold text-black">{sec.title}</h3>
                                        </div>
                                        <ul className="pl-8 space-y-1.5">
                                            {(sec.bullets || []).map((b, bIdx) => (
                                                <li key={bIdx} className="text-[11.5px] text-gray-700 leading-relaxed flex items-start gap-2">
                                                    <span className="text-[#16A34A] font-bold mt-0.5">•</span>
                                                    <span>{b}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── PAGE 8: CLOSING, NEXT STEPS & EXECUTION ─────────────────── */}
                    {page.type === 'v2-closing' && (
                        <div className="h-full flex flex-col justify-start">
                            <div className="mb-4">
                                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-1">
                                    {formData.closingSub || 'CLOSING'}
                                </p>
                                <h2 className="text-2xl font-black text-black tracking-tight mb-3">
                                    {formData.closingTitle || '06 · Next Steps'}
                                </h2>
                                <div className="text-xs text-gray-800 leading-relaxed">
                                    {renderSafeText(formData.closingText)}
                                </div>
                            </div>

                            {/* Sign-Off Metadata Block */}
                            <div className="grid grid-cols-2 pt-6 border-t border-gray-200 mt-6 mb-8">
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">PREPARED BY</p>
                                    <p className="text-xs font-bold text-black">{formData.preparedBy || 'NewBi Entertainment & Marketing LLP'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">QUOTE REFERENCE</p>
                                    <p className="text-xs font-mono font-bold text-black">{formData.proposalNumber || 'NBQ-XXXX'}</p>
                                </div>
                            </div>

                            {/* Digital Signatures & Seal if signatureArea is supplied or enabled */}
                            {signatureArea ? (
                                <div className="mt-auto border-t border-gray-100 pt-6">
                                    {signatureArea}
                                </div>
                            ) : (formData.showSignatures || formData.status === 'Accepted') && (
                                <div className="mt-auto bg-[#F9FAFB] p-5 rounded-2xl border border-gray-200 space-y-4">
                                    <div className="grid grid-cols-2 gap-8 items-end">
                                        <div>
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">PROVIDER AUTHORIZATION</p>
                                            <div className="h-16 flex items-end">
                                                {formData.ourSignature ? (
                                                    <img src={formData.ourSignature} alt="Provider Signature" className="max-h-full object-contain mix-blend-multiply" />
                                                ) : (
                                                    <p className="text-xl font-signature text-black opacity-80">Authorized Signatory</p>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold uppercase text-gray-700 pt-2 border-t border-gray-200 mt-2">NewBi Entertainment & Marketing LLP</p>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">COUNTERPARTY ACCEPTANCE</p>
                                            <div className="h-16 flex items-end justify-end">
                                                {formData.approvalMetadata?.clientSignature || formData.clientSignature ? (
                                                    <img src={formData.approvalMetadata?.clientSignature || formData.clientSignature} alt="Client Signature" className="max-h-full object-contain mix-blend-multiply" />
                                                ) : (formData.status === 'Accepted' || formData.approvalMetadata?.signedBy) ? (
                                                    <p className="text-2xl sm:text-3xl font-signature text-black leading-none select-none">
                                                        {formData.approvalMetadata?.signedBy || formData.clientName || 'Authorized Signatory'}
                                                    </p>
                                                ) : (
                                                    <p className="text-xs font-mono text-gray-400 italic">Awaiting Digital Signature</p>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold uppercase text-gray-700 pt-2 border-t border-gray-200 mt-2">
                                                {formData.approvalMetadata?.signedBy || formData.clientName || 'Authorized Signatory'}
                                            </p>
                                            {formData.status === 'Accepted' && formData.approvalMetadata?.signedAt && (
                                                <p className="text-[8px] font-mono text-gray-500 mt-1">
                                                    SIGNED: {new Date(formData.approvalMetadata.signedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    {formData.approvalMetadata.ip ? ` · IP: ${formData.approvalMetadata.ip}` : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {(formData.showSeal || formData.status === 'Accepted') && (
                                        <div className="pt-2 flex justify-end">
                                            <DocumentSeal type="proposal" date={formData.approvalMetadata?.signedAt} className="w-24 h-24" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── CUSTOM PAGES ────────────────────────────────────────────── */}
                    {page.type === 'v2-custom' && (
                        <div className="h-full flex flex-col justify-start">
                            {page.subtitle && (
                                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-1">{page.subtitle}</p>
                            )}
                            <h2 className="text-2xl font-black text-black tracking-tight mb-6">{page.title}</h2>
                            <div className="flex-1 text-[13px] leading-relaxed text-gray-800 whitespace-pre-line">
                                {renderContent(page.content || '')}
                            </div>
                        </div>
                    )}

                </div>

                {/* Running Footer across ALL v2 pages */}
                <div className="flex items-center justify-between pt-4 border-t border-black/10 mt-auto relative z-10 shrink-0">
                    <p className="text-[8px] font-black uppercase text-gray-400 tracking-[0.2em]">
                        © NEWBI ENTERTAINMENT & MARKETING LLP
                    </p>
                    <p className="text-[8px] font-black uppercase text-gray-400 tracking-[0.2em]">
                        PAGE {pageIdx + 1} OF {totalPages}
                    </p>
                </div>
            </div>
        );
    }

    // ═════════════════════════════════════════════════════════════════════════
    // LEGACY v1 DESIGN (FOR EXISTING PROPOSALS TO PREVENT BREAKING CHANGES)
    // ═════════════════════════════════════════════════════════════════════════
    const isFirstPage = pageIdx === 0;

    return (
        <div 
            className="proposal-page-render w-[794px] h-[1123px] bg-white text-black relative flex flex-col p-[15mm] shadow-2xl rounded-[2px] overflow-hidden shrink-0 font-['Outfit']" 
            style={{ margin: isExporting ? '0' : undefined }}
        >
            {/* Standardized Header */}
            <div className="flex justify-between items-start mb-10 border-b border-black/10 pb-6 relative z-10">
                {isFirstPage && (
                    <div className="absolute top-0 left-0 bg-neon-green/10 text-neon-green px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-neon-green/20">
                        Official Strategic Quotation
                    </div>
                )}
                
                <div className={cn("flex flex-col gap-6 items-start", isFirstPage && "mt-10")}>
                    <img src={currentLogo?.path || '/logo_document.png'} alt="Logo" className="h-10 w-auto object-contain" crossOrigin="anonymous" />
                </div>
                
                <div className={cn("text-right space-y-1", isFirstPage && "mt-10")}>
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mb-0">Quotation</h4>
                    <p className="text-sm font-black text-black tracking-widest font-mono">{formData.proposalNumber}</p>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative z-10 flex flex-col">
                {page.type === 'cover' && (
                    <div className="h-full flex flex-col justify-start space-y-16 py-4">
                        <div className="grid grid-cols-2 gap-12">
                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Client Entity</p>
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black text-black leading-tight tracking-tight break-words">{formData.clientName || 'Valued Partner'}</h2>
                                    {!isHidden('clientAddress') && <p className="text-[12px] font-medium text-gray-500 whitespace-pre-line">{formData.clientAddress || 'Client Address'}</p>}
                                </div>
                            </div>
                            <div className="space-y-4 text-right">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Project Specification</p>
                                <div className="space-y-3 flex flex-col items-end">
                                    <h2 className="text-3xl font-black text-black leading-tight tracking-tight break-words">{formData.campaignName || 'Project Title'}</h2>
                                    <div className="text-[11px] font-black text-neon-green border border-neon-green px-4 py-1.5 rounded-full uppercase tracking-widest inline-block">
                                        Duration: {formData.campaignDuration || 'TBD'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!isHidden('coverDescription') && (
                            <div className="text-[15px] font-medium text-gray-800 leading-[1.8] text-justify">
                                {renderContent(formData.coverDescription || 'Cover description pending...')}
                            </div>
                        )}

                        <div className="pt-8">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">What's Inside</p>
                            <div className="grid grid-cols-3 gap-6">
                                {[
                                    { num: '01', title: formData.strategyTitle || 'Executive Summary & Objective' },
                                    { num: '02', title: formData.scopeTitle || 'Process & Execution Blueprint' },
                                    { num: '03', title: formData.proposalTitle || 'Per-City Deliverables' }
                                ].map((box, i) => (
                                    <div key={i} className="border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all bg-white">
                                        <p className="text-[12px] font-black text-neon-green mb-3">{box.num}</p>
                                        <p className="text-[14px] font-black text-black leading-snug pr-4">{box.title}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-auto bg-gray-50/80 rounded-2xl p-8 border border-gray-100">
                            <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.2em] mb-3">Prepared For</p>
                            <p className="text-[13px] font-medium text-gray-700 leading-relaxed">
                                This quotation has been prepared exclusively for {formData.clientName || 'our client'}, in connection with {formData.campaignName || 'the upcoming project'}. All figures and scope items are indicative and open to discussion ahead of final sign-off.
                            </p>
                        </div>
                    </div>
                )}

                {page.type === 'strategy' && (
                    <div className="flex flex-col h-full py-4 space-y-12">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.2em]">
                                {formData.strategySub || 'STRATEGIC OUTLINE'}
                            </p>
                            <h3 className="text-4xl font-black text-black tracking-tight leading-none">
                                {formData.strategyTitle || 'Executive Summary'}
                            </h3>
                        </div>
                        
                        {page.overviewText && (
                            <div className="text-[15px] font-medium leading-[1.8] text-gray-800">
                                {renderContent(page.overviewText)}
                            </div>
                        )}
                        
                        {page.primaryGoalText && (
                            <div className="bg-gray-50/80 border-l-4 border-neon-green p-8 rounded-r-2xl mt-8">
                                <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.2em] mb-4">Primary Objective</p>
                                <div className="text-[15px] font-medium text-gray-800 leading-relaxed">
                                    {renderContent(page.primaryGoalText)}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {page.type === 'scope' && (
                    <div className="flex flex-col h-full py-4">
                        <div className="space-y-2 mb-12">
                            <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.2em]">
                                {formData.scopeSub || 'HOW WE\'LL EXECUTE'}
                            </p>
                            <h3 className="text-4xl font-black text-black tracking-tight leading-none">
                                {formData.scopeTitle || 'Process & Execution Blueprint'}
                            </h3>
                        </div>
                        <div className="flex-1 flex flex-col text-[14px] leading-[1.8] text-gray-800 proposal-html-content">
                            {renderContent(page.scopeText || '')}
                        </div>
                    </div>
                )}

                {page.type === 'proposal' && (
                    <div className="flex flex-col h-full py-4">
                        <div className="space-y-2 mb-12">
                            <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.2em]">
                                {formData.proposalSub || 'SCOPE SUMMARY'}
                            </p>
                            <h3 className="text-4xl font-black text-black tracking-tight leading-none">
                                {formData.proposalTitle || 'Per City Deliverables'}
                            </h3>
                        </div>
                        
                        {page.deliverables?.length > 0 && (
                            <div className="flex-1">
                                <table className="w-full text-left border-collapse bg-gray-50/30 rounded-xl overflow-hidden">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="p-4 w-12 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">#</th>
                                            <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Deliverable</th>
                                            <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Qty / Unit</th>
                                            <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-40 text-right">Timeline</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {page.deliverables.map((d, i) => (
                                            <tr key={d.id || i}>
                                                <td className="p-5 text-center text-[12px] font-bold text-gray-400">
                                                    {String((page.startIndex || 0) + i + 1).padStart(2, '0')}
                                                </td>
                                                <td className="p-5 text-[14px] font-bold text-black">{d.item}</td>
                                                <td className="p-5 text-[13px] font-medium text-gray-600">{d.qty || '—'}</td>
                                                <td className="p-5 text-right text-[13px] font-medium text-gray-600">{d.timeline || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-6">
                                    INDICATIVE — SCALABLE BASED ON CREATORS ENGAGED AND BUDGET
                                </p>
                            </div>
                        )}

                        {pageIdx === totalPages - 1 && signatureArea && (
                            <div className="mt-auto border-t border-gray-100 pt-8 mt-8">
                                {signatureArea}
                            </div>
                        )}
                        {pageIdx === totalPages - 1 && !signatureArea && (
                            <div className="mt-auto bg-gray-50/80 rounded-2xl p-8 border border-gray-100 mt-12 space-y-6">
                                <div>
                                    <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.2em] mb-3">Next Steps</p>
                                    <p className="text-[13px] font-medium text-gray-700 leading-relaxed">
                                        We'd welcome the opportunity to walk {formData.clientName || 'the client'} through this plan in detail and tailor scope, mix, and budget to the confirmed dates.
                                    </p>
                                </div>

                                {(formData.status === 'Accepted' || formData.showSignatures) && (
                                    <div className="grid grid-cols-2 gap-8 items-end pt-6 border-t border-gray-200">
                                        <div>
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">PROVIDER AUTHORIZATION</p>
                                            <div className="h-14 flex items-end">
                                                {formData.ourSignature ? (
                                                    <img src={formData.ourSignature} alt="Provider Signature" className="max-h-full object-contain mix-blend-multiply" />
                                                ) : (
                                                    <p className="text-xl font-signature text-black opacity-80">Authorized Signatory</p>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold uppercase text-gray-700 pt-1 border-t border-gray-200 mt-2">NewBi Entertainment & Marketing LLP</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">COUNTERPARTY ACCEPTANCE</p>
                                            <div className="h-14 flex items-end justify-end">
                                                {formData.approvalMetadata?.clientSignature || formData.clientSignature ? (
                                                    <img src={formData.approvalMetadata?.clientSignature || formData.clientSignature} alt="Client Signature" className="max-h-full object-contain mix-blend-multiply" />
                                                ) : (formData.status === 'Accepted' || formData.approvalMetadata?.signedBy) ? (
                                                    <p className="text-2xl font-signature text-black leading-none">{formData.approvalMetadata?.signedBy || formData.clientName || 'Authorized Signatory'}</p>
                                                ) : (
                                                    <p className="text-xs font-mono text-gray-400 italic">Awaiting Digital Signature</p>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold uppercase text-gray-700 pt-1 border-t border-gray-200 mt-2">{formData.approvalMetadata?.signedBy || formData.clientName || 'Authorized Signatory'}</p>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Prepared By</p>
                                        <p className="text-[13px] font-bold text-black">{formData.preparedBy || 'NewBi Entertainment & Marketing LLP'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Quote Reference</p>
                                        <p className="text-[13px] font-bold text-black">{formData.proposalNumber}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {page.type === 'table' && (
                    <div className="flex flex-col h-full py-4">
                        <div className="space-y-2 mb-12">
                            <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.2em]">
                                {formData.inventorySub || 'RESOURCE INVENTORY'}
                            </p>
                            <h3 className="text-4xl font-black text-black tracking-tight leading-none">
                                {formData.inventoryTitle || 'Resource Details'}
                            </h3>
                        </div>
                        <div className="flex-1 flex flex-col text-[14px] leading-[1.8] text-gray-800 proposal-html-content">
                            {renderContent(page.inventoryText || '')}
                        </div>
                    </div>
                )}

                {page.type === 'commercials' && (
                    <div className="flex flex-col h-full py-4">
                        <div className="space-y-2 mb-12">
                            <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.2em]">
                                COMMERCIALS
                            </p>
                            <h3 className="text-4xl font-black text-black tracking-tight leading-none">
                                Investment & Terms
                            </h3>
                        </div>
                        <div className="flex-1 flex flex-col text-[14px] leading-[1.8] text-gray-800 proposal-html-content">
                            {renderContent(page.commercialsText || '')}
                        </div>
                    </div>
                )}
            </div>

            {/* Standard Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-black/10 mt-10 relative z-10">
                <p className="text-[8px] font-black uppercase text-gray-400 tracking-[0.2em]">
                    © NEWBI ENTERTAINMENT & MARKETING LLP
                </p>
                <p className="text-[8px] font-black uppercase text-gray-400 tracking-[0.2em]">
                    PAGE {pageIdx + 1} OF {totalPages}
                </p>
            </div>
        </div>
    );
}
