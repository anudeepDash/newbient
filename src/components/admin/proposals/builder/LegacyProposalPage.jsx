import React from 'react';
import { cn } from '../../../../lib/utils';
import DocumentSeal from '../../../ui/DocumentSeal';
import { renderContent } from './content';
import { isHtmlEmpty } from './text';
import { DEFAULT_COLUMNS } from './model';

/*
 * One page of a classic-format proposal (the format older proposals use).
 * This is the document paper the client receives as a PDF; its look is kept
 * as it was. Used for both the live preview and the PDF export.
 */
const defaultColumns = DEFAULT_COLUMNS;

const issueDate = (formData) => {
    const d = formData.createdAt ? new Date(formData.createdAt) : new Date();
    return (isNaN(d.getTime()) ? new Date() : d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const LegacyProposalPage = ({ page, idx, totalPages, formData, currentLogo, totals }) => {
    const isHidden = (f) => (formData.hiddenFields || []).includes(f);
    const { subtotal, gstAmount, totalAmount } = totals;
    return (
        <div className="proposal-page-render w-[794px] h-[1123px] bg-white text-black relative flex flex-col p-[15mm] shadow-2xl rounded-[2px] overflow-hidden">
        <div className={cn("flex justify-between items-end mb-8 pb-4 border-b-2 border-black", idx > 0 && "mb-4 pb-2 opacity-40 border-gray-200")}>
            <div className="flex flex-col gap-6 items-start">
                <img src={currentLogo.path} alt="Logo" className={cn("h-16 w-auto object-contain", idx > 0 && "h-8")} crossOrigin="anonymous" />
            </div>
            <div className="text-right space-y-3">
                <div><h4 className={cn("text-[10px] font-black uppercase text-black tracking-[0.4em] mb-0", idx > 0 && "text-[7px]")}>Quotation</h4><p className={cn("text-lg font-black text-black tracking-widest font-mono", idx > 0 && "text-sm")}>{formData.proposalNumber}</p></div>
                {idx === 0 && (
                    <div className="space-y-0.5"><p className="text-[8px] font-black text-gray-600 dark:text-gray-400 uppercase">Issue Date</p><p className="text-[10px] font-black text-black">{issueDate(formData)}</p></div>
                )}
            </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0 overflow-hidden flex flex-col px-1">
            {page.type === 'cover' && (
                <div className="h-full flex flex-col justify-start space-y-20 py-8">
                    <div className="grid grid-cols-2 gap-10">
                        <div className="space-y-6 min-w-0"><p className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 tracking-widest border-b border-gray-100 pb-2">Client Entity</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug break-words">{formData.clientName || 'Valued Partner'}</h2>{!isHidden('clientAddress') && <p className="text-[12px] font-medium text-gray-500 whitespace-pre-line leading-relaxed">{formData.clientAddress || 'Client Address'}</p>}</div></div>
                        <div className="space-y-6 text-right min-w-0"><p className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 tracking-widest border-b border-gray-100 pb-2">Project Specification</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug italic break-words">{formData.campaignName || 'Project Title'}</h2><p className="text-[12px] font-black text-neon-green bg-white dark:bg-black px-3 py-1 inline-block uppercase tracking-widest">Duration: {formData.campaignDuration || 'TBD'}</p></div></div>
                    </div>
                    <div className="pt-16 space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-1 bg-white dark:bg-black" />
                            <p className="text-[11px] font-black uppercase tracking-[0.6em]">Official Strategic Quotation</p>
                        </div>
                        {!isHidden('coverDescription') && (
                            <div className="text-lg font-medium text-gray-700 leading-relaxed max-w-2xl">
                                {renderContent(formData.coverDescription || 'Cover description pending...')}
                            </div>
                        )}
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-10 pt-10 border-t border-gray-100"><div><p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase mb-2">Quote Reference</p><p className="text-[11px] font-black text-black">{formData.proposalNumber}</p></div><div className="text-right"><p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase mb-2">Classification</p><p className="text-[11px] font-black text-black italic">Strategic Commercial</p></div></div>
                </div>
            )}
            {page.type === 'strategy' && (
                <div className="space-y-16 py-8">
                    <div className="mb-10 space-y-3">
                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                            {formData.strategyTitle ?? 'EXECUTIVE SUMMARY'}
                        </h3>
                        <div className="w-20 h-1.5 bg-neon-green" />
                        <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                            {formData.strategySub ?? 'STRATEGIC OUTLINE'}
                        </p>
                    </div>
                    {page.overviewText && (
                        <div className="text-lg font-medium leading-[1.7] text-gray-700 text-justify">
                            {renderContent(page.overviewText)}
                        </div>
                    )}
                    {page.primaryGoalText && !isHtmlEmpty(page.primaryGoalText) && (
                        <div className="pt-12">
                            <div className="p-12 border-2 border-black rounded-[2.5rem] space-y-6">
                                <p className="text-[11px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Primary Objective</p>
                                <div className="text-lg font-black text-black leading-relaxed">{renderContent(page.primaryGoalText)}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {page.type === 'scope' && (
                <div className="h-full flex flex-col py-8">
                    <div className="mb-10 space-y-3">
                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                            {formData.scopeTitle ?? 'SCOPE OF WORK'}
                        </h3>
                        <div className="w-20 h-1.5 bg-neon-green" />
                        <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                            {formData.scopeSub ?? 'RESOURCE DELIVERABLES'}
                        </p>
                    </div>
                    <div className="flex-1 flex flex-col">
                        {renderContent(page.scopeText || '', "text-[14px] leading-[1.8] text-gray-700 space-y-3")}
                    </div>
                </div>
            )}
            {page.type === 'proposal' && (
                <div className="space-y-16 py-8">
                    <div className="mb-10 space-y-3">
                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                            {formData.proposalTitle ?? 'DELIVERABLES'}
                        </h3>
                        <div className="w-20 h-1.5 bg-neon-green" />
                        <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                            {formData.proposalSub ?? 'PROJECT INVENTORY'}
                        </p>
                    </div>
                    {page.deliverables?.length > 0 && (
                        <div className="space-y-6">
                            <table className="w-full text-left border-collapse border border-black">
                                <thead>
                                    <tr className="bg-white dark:bg-black text-[9px] font-black uppercase text-gray-900 dark:text-white tracking-[0.3em]">
                                        <th className="p-4 w-12 text-center border-r border-black/20 dark:border-white/20">#</th>
                                        <th className="p-4 border-r border-black/20 dark:border-white/20">Deliverable</th>
                                        <th className="p-4 text-center w-28 border-r border-black/20 dark:border-white/20">Qty / Unit</th>
                                        <th className="p-4 text-right w-40">Timeline</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/10">
                                    {page.deliverables.map((d, i) => (
                                        <tr key={d.id || i} className="hover:bg-gray-50">
                                            <td className="p-4 text-center text-[11px] font-bold text-slate-500 border-r border-black/10">
                                                {String((page.startIndex || 0) + i + 1).padStart(2, '0')}
                                            </td>
                                            <td className="p-4 text-[12px] font-bold text-black border-r border-black/10">{d.item}</td>
                                            <td className="p-4 text-center text-[12px] font-medium text-gray-600 border-r border-black/10">{d.qty || '—'}</td>
                                            <td className="p-4 text-right text-[11px] font-black text-black uppercase tracking-wider">{d.timeline || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {page.clientRequirements?.length > 0 && (
                        <div className="pt-8 border-t border-gray-100">
                            <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mb-6">Requirements From Client</p>
                            <div className="p-8 border-2 border-gray-200 space-y-0">
                                {page.clientRequirements.map((r, i) => (
                                    <div key={r.id || i} className={cn("flex items-start gap-4 py-4", i > 0 && "border-t border-gray-100")}>
                                        <div className="w-8 h-8 bg-white dark:bg-black flex items-center justify-center shrink-0 mt-0.5"><span className="text-[9px] font-black text-gray-900 dark:text-white">{String(i + 1).padStart(2, '0')}</span></div>
                                        <p className="text-[12px] font-bold text-black leading-relaxed">{r.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            {page.type === 'table' && (
                <div className="space-y-12 py-8">
                    <div className="mb-10 space-y-3">
                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                            {formData.inventoryTitle ?? 'RESOURCE INVENTORY'}
                        </h3>
                        <div className="w-20 h-1.5 bg-neon-green" />
                        <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                            {page.tablePageIdx > 1 
                                ? `${formData.inventorySub ?? 'COMMERCIALS BREAKDOWN'} — Part ${page.tablePageIdx}` 
                                : (formData.inventorySub ?? 'COMMERCIALS BREAKDOWN')}
                        </p>
                    </div>
                    <table className="w-full text-left border-collapse border border-black">
                          <thead>
                              <tr className="bg-white dark:bg-black text-[9px] font-black uppercase text-gray-900 dark:text-white tracking-[0.3em]">
                                  {(formData.tableColumns || defaultColumns).map((col, cIdx, arr) => {
                                      const colType = col.type || (col.key === 'price' ? 'amount' : (col.key === 'qty' ? 'number' : 'text'));
                                      return (
                                          <th 
                                              key={col.key} 
                                              className={cn(
                                                  "p-4",
                                                  cIdx < arr.length - 1 && "border-r border-black/20 dark:border-white/20",
                                                  colType === 'number' && "text-center w-24",
                                                  colType === 'amount' && "text-right w-48"
                                              )}
                                          >
                                              {col.label}
                                          </th>
                                      );
                                  })}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-black/10">
                              {page.items.map((item, i) => {
                                  const cols = formData.tableColumns || defaultColumns;
                                  return (
                                      <tr key={i} className="hover:bg-gray-50">
                                          {cols.map((col, cIdx) => {
                                              const isLast = cIdx === cols.length - 1;
                                              const tdClass = cn(
                                                  "p-4",
                                                  !isLast && "border-r border-black/10"
                                              );
                                              const colType = col.type || (col.key === 'price' ? 'amount' : (col.key === 'qty' ? 'number' : 'text'));
                                              if (col.key === 'description') {
                                                  return <td key={col.key} className={cn(tdClass, "text-[12px] font-bold text-black")}>{item.description || 'Asset'}</td>;
                                              }
                                              if (colType === 'number') {
                                                  const val = col.key === 'qty' ? item.qty : item[col.key];
                                                  return <td key={col.key} className={cn(tdClass, "text-center text-[12px] font-medium text-gray-600")}>{val}</td>;
                                              }
                                              if (colType === 'amount') {
                                                  const val = Number((col.key === 'price' ? item.price : item[col.key]) || 0);
                                                  return <td key={col.key} className={cn(tdClass, "text-right text-[12px] font-black tracking-widest text-black font-mono")}>₹{val.toLocaleString()}</td>;
                                              }
                                              return <td key={col.key} className={cn(tdClass, "text-[12px] font-medium text-gray-600")}>{item[col.key] || ''}</td>;
                                          })}
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                </div>
            )}
            {page.type === 'custom' && (
                <div className="space-y-8 py-8 h-full flex flex-col justify-start">
                    <div className="mb-10 space-y-3">
                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                            {page.title ? page.title.toUpperCase() : "CUSTOM PAGE"}
                        </h3>
                        <div className="w-20 h-1.5 bg-neon-green" />
                        <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                            {(formData.customPages?.[page.pageIndex]?.subtitle || "Additional Specifications").toUpperCase()}
                        </p>
                    </div>
                    <div className="flex-1">
                        {renderContent(page.content || '', "text-[14px] leading-[1.8] text-gray-700 space-y-3")}
                    </div>
                </div>
            )}
            {page.type === 'terms_only' && (
                <div className="space-y-12 py-10 px-4">
                    <div className="mb-10 space-y-3">
                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                            GENERAL TERMS.
                        </h3>
                        <div className="w-20 h-1.5 bg-neon-green" />
                        <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">Part {page.termsPageIdx}</p>
                    </div>
                    <div className="text-[12px] font-semibold text-gray-600 leading-relaxed space-y-3">
                        {renderContent(page.termsText)}
                    </div>
                </div>
            )}
            {page.type === 'commercials' && (
                 <div className="space-y-10 py-6 h-full flex flex-col justify-between">
                     <div>
                         <div className="mb-10 space-y-3">
                             <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                 {formData.commercialsTitle ?? 'COMMERCIAL TERMS'}
                             </h3>
                             <div className="w-20 h-1.5 bg-neon-green" />
                             <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                 {formData.commercialsSub ?? 'SETTLEMENT & SIGN-OFF'}
                             </p>
                         </div>
                         <div className={cn(
                             "grid gap-12 items-start",
                             formData.hideTotalColumn ? "grid-cols-1" : "grid-cols-2"
                         )}>
                             <div className="space-y-8">
                                 {page.termsText && (
                                     <div className="space-y-3">
                                         <h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black pb-2">General Terms</h4>
                                         <div className="text-[11px] font-semibold text-gray-600 leading-relaxed space-y-2">{renderContent(page.termsText)}</div>
                                     </div>
                                 )}
                                 {page.paymentDetailsText && (
                                     <div className="p-6 bg-gray-50 border border-gray-150 rounded-2xl space-y-2">
                                         <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Settlement Details</p>
                                         <div className="text-[11px] font-mono font-bold text-black whitespace-pre-line leading-relaxed">{page.paymentDetailsText}</div>
                                     </div>
                                 )}
                             </div>
                             {!formData.hideTotalColumn && (
                             <div className="space-y-4">
                                 <div className="bg-gray-50/50 border border-gray-250/60 rounded-[2rem] p-8 space-y-6">
                                     <div className="flex justify-between items-center pb-4 border-b border-gray-200/60">
                                         <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Subtotal</span>
                                         <span className="text-base font-bold text-black font-mono">₹{subtotal.toLocaleString()}</span>
                                     </div>
                                     {formData.showGst && (
                                         <div className="flex justify-between items-center pb-4 border-b border-gray-200/60">
                                             <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">GST ({formData.gstRate}%)</span>
                                             <span className="text-base font-bold text-black font-mono">₹{gstAmount.toLocaleString()}</span>
                                         </div>
                                     )}
                                     <div className="p-8 bg-white dark:bg-black text-right relative overflow-hidden rounded-[1.5rem] shadow-xl">
                                         <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-3">Total Estimated Cost</p>
                                         <h2 className="text-3xl font-black tracking-widest text-gray-900 dark:text-white font-mono leading-none">₹{totalAmount.toLocaleString()}</h2>
                                         <div className="absolute top-0 right-0 w-1.5 h-full bg-neon-green" />
                                     </div>
                                     {formData.advanceRequested > 0 && (
                                         <div className="p-6 bg-neon-green/5 border border-neon-green/20 rounded-[1.5rem] flex justify-between items-center">
                                             <div>
                                                 <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Advance Fee ({formData.advanceRequested}%)</span>
                                                 <span className="text-[7px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">Due upon signature</span>
                                             </div>
                                             <span className="text-xl font-black text-black font-mono">₹{(totalAmount * formData.advanceRequested / 100).toLocaleString()}</span>
                                         </div>
                                     )}
                                 </div>
                             </div>
                             )}
                         </div>
                     </div>

                    {/* Authentication Layer (Export) */}
                    {!isHidden('signatures') && (formData.showSeal || formData.showSignatures) && (
                        <div className="mt-20 pt-12 border-t-2 border-black/5 relative">
                            {formData.showSignatures ? (
                                <>
                                    <div className="grid grid-cols-2 gap-20">
                                        {/* Provider Signature */}
                                        <div className="space-y-6">
                                            <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">For {currentLogo.label}</p>
                                            <div className="h-40 flex items-center justify-start relative">
                                                {formData.providerSignature ? (
                                                    <img src={formData.providerSignature} alt="Provider Signature" className="h-full object-contain grayscale mix-blend-multiply" crossOrigin="anonymous" />
                                                ) : (
                                                    <p className="text-[24px] font-formal italic text-black opacity-40">{formData.senderName || 'Authorized Signatory'}</p>
                                                )}
                                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white dark:bg-black" />
                                            </div>
                                            <p className="text-[11px] font-black text-black uppercase tracking-widest">{formData.senderName || 'Authorized Signatory'}</p>
                                            <p className="text-[8px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">{formData.senderDesignation || 'Director of Operations'}</p>
                                        </div>

                                        {/* Client Signature */}
                                        <div className="space-y-6 text-right">
                                            <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">For {formData.clientName || 'Valued Partner'}</p>
                                            <div className="h-40 flex items-center justify-end relative">
                                                {formData.clientSignature ? (
                                                    <img src={formData.clientSignature} alt="Client Signature" className="h-full object-contain grayscale mix-blend-multiply" crossOrigin="anonymous" />
                                                ) : (
                                                    <p className="text-[24px] font-formal italic text-black opacity-10">Type name to sign</p>
                                                )}
                                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white dark:bg-black" />
                                            </div>
                                            <p className="text-[11px] font-black text-black uppercase tracking-widest">Acknowledged & Accepted</p>
                                        </div>
                                    </div>
                                    {formData.showSeal && (
                                        <div className="flex justify-center mt-6 relative z-10">
                                            <DocumentSeal className="w-56 h-56" />
                                        </div>
                                    )}
                                </>
                            ) : (
                                formData.showSeal && (
                                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-[20px]">
                                        <DocumentSeal className="w-56 h-56" />
                                        <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest mt-4">Official Document Seal</p>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            )}
            {page.type === 'attachments' && (
                <div className="space-y-12 py-10 px-4 h-full flex flex-col justify-between">
                    <div>
                        <div className="mb-10 space-y-3">
                            <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                APPENDIX / ATTACHMENTS.
                            </h3>
                            <div className="w-20 h-1.5 bg-neon-green" />
                            <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                SUPPORTING INSTRUMENTS & DOCUMENTATION
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-10 mt-12 pb-10">
                            {(page.attachments || []).map((attachment, idx) => {
                                const isSpreadsheet = attachment.fileType === 'spreadsheet';
                                const isPdf = attachment.fileType === 'pdf';
                                const isImage = attachment.fileType === 'image';
                                const qrCodeUrl = `/api/qr?size=300&margin=1&text=${encodeURIComponent(attachment.url)}`;
                                
                                if (isImage) {
                                    return (
                                        <div key={idx} className="w-full relative rounded-2xl overflow-hidden border border-gray-200">
                                            <img src={attachment.url} alt={attachment.name} className="w-full h-auto object-contain" />
                                            <div className="absolute top-4 left-4 bg-white dark:bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-wider">
                                                {attachment.name}
                                            </div>
                                        </div>
                                    );
                                }
                                
                                if (isPdf) {
                                    return (
                                        <div key={idx} className="w-full h-[600px] relative rounded-2xl overflow-hidden border border-gray-200">
                                            <iframe src={attachment.url} title={attachment.name} className="w-full h-full border-none bg-gray-50" />
                                            <div className="absolute top-4 left-4 bg-white dark:bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-wider pointer-events-none">
                                                {attachment.name}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={idx} className="p-6 border border-gray-200 rounded-[2rem] flex flex-col justify-between h-44 relative bg-gray-50/50">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-black text-black uppercase tracking-wider truncate" title={attachment.name}>
                                                    {attachment.name}
                                                </h4>
                                                <p className="text-[8px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mt-1">
                                                    {attachment.type === 'file' ? 'Uploaded Storage File' : 'Linked URL'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-end justify-between mt-4">
                                            <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black uppercase tracking-widest text-neon-green bg-white dark:bg-black px-3 py-1.5 rounded-xl inline-block">
                                                View Document &rarr;
                                            </a>
                                            <div className="w-14 h-14 bg-white p-0.5 rounded-lg border border-gray-200 shadow-sm shrink-0">
                                                <img src={qrCodeUrl} alt="QR Access" className="w-full h-full object-contain" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
        <div className="mt-auto pt-8 pb-10 border-t border-gray-100 flex justify-between items-center text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.4em]">
            <p>© NEWBI ENTERTAINMENT & MARKETING LLP</p>
            <p className="text-black">Page {idx + 1} of {totalPages}</p>
        </div>
        </div>
    );
};

export default LegacyProposalPage;
