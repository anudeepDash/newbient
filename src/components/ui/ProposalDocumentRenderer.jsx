import React from 'react';
import { cn } from '../../lib/utils';
import DocumentSeal from './DocumentSeal'; // if needed, but not imported yet

export default function ProposalDocumentRenderer({ 
    page, 
    pageIdx, 
    totalPages, 
    formData, 
    currentLogo, 
    isHidden, 
    renderContent, 
    isExporting = false,
    signatureArea = null
}) {
    const isFirstPage = pageIdx === 0;

    // A4 layout container
    return (
        <div className="proposal-page-render w-[794px] h-[1123px] bg-white text-black relative flex flex-col p-[15mm] shadow-2xl rounded-[2px] overflow-hidden shrink-0" style={{ margin: isExporting ? '0' : undefined }}>
            
            {/* Standardized Header */}
            <div className="flex justify-between items-start mb-10 border-b border-black/10 pb-6 relative z-10">
                {isFirstPage && (
                    <div className="absolute top-0 left-0 bg-neon-green/10 text-neon-green px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-neon-green/20">
                        Official Strategic Quotation
                    </div>
                )}
                
                <div className={cn("flex flex-col gap-6 items-start", isFirstPage && "mt-10")}>
                    <img src={currentLogo.path} alt="Logo" className="h-10 w-auto object-contain" crossOrigin="anonymous" />
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
                        )}
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
                        )}
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
                        )}
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
                        )}
                    </div>
                )}

                        {/* Signatures or Next Steps block for the last page */}
                        {pageIdx === totalPages - 1 && signatureArea && (
                            <div className="mt-auto border-t border-gray-100 pt-8 mt-8">
                                {signatureArea}
                            </div>
                        )}
                        {pageIdx === totalPages - 1 && !signatureArea && (
                            <div className="mt-auto bg-gray-50/80 rounded-2xl p-8 border border-gray-100 mt-12">
                                <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.2em] mb-3">Next Steps</p>
                                <p className="text-[13px] font-medium text-gray-700 leading-relaxed mb-8">
                                    We'd welcome the opportunity to walk {formData.clientName || 'the client'} through this plan in detail and tailor scope, mix, and budget to the confirmed dates.
                                </p>
                                
                                <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Prepared By</p>
                                        <p className="text-[13px] font-bold text-black">NewBi Entertainment & Marketing LLP</p>
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
            
            {/* Styles for Scope list numbers (green circle) */}
            <style dangerouslySetInnerHTML={{ __html: `
                .proposal-html-content ol { list-style: none; counter-reset: scope-counter; padding-left: 0; }
                .proposal-html-content ol > li { position: relative; padding-left: 3rem; margin-bottom: 2rem; font-weight: 700; font-size: 16px; color: black; }
                .proposal-html-content ol > li::before { 
                    counter-increment: scope-counter; 
                    content: counter(scope-counter); 
                    position: absolute; left: 0; top: -2px; 
                    width: 24px; height: 24px; 
                    background-color: rgba(57, 255, 20, 0.15); 
                    color: #22c55e; 
                    border-radius: 50%; 
                    display: flex; align-items: center; justify-content: center; 
                    font-size: 11px; font-weight: 900; 
                }
                .proposal-html-content ul { list-style: none; padding-left: 3rem; margin-top: 1rem; margin-bottom: 1.5rem; }
                .proposal-html-content ul > li { position: relative; padding-left: 1.5rem; margin-bottom: 0.75rem; font-weight: 500; font-size: 14px; color: #374151; }
                .proposal-html-content ul > li::before { 
                    content: '•'; 
                    position: absolute; left: 0; 
                    color: #22c55e; font-size: 18px; font-weight: bold; 
                }
                .proposal-html-content h1, .proposal-html-content h2, .proposal-html-content h3 { display: none; } /* Hide raw headings if ai generated them */
            `}} />
        </div>
    );
}
