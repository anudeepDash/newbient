import React from 'react';
import { cn } from '../../lib/utils';
import DocumentSeal from '../ui/DocumentSeal';

const inlineFmt = (t) => t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');

const renderFormatted = (text, baseClass = 'text-[12px] font-serif text-black leading-relaxed text-justify') => {
  if (!text) return null;
  if (text.includes('<') && (text.includes('>') || text.includes('</'))) {
    return <div className={cn("article-content", baseClass)} dangerouslySetInnerHTML={{ __html: text }} />;
  }
  
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      elements.push(<p key={i} className="text-[13px] font-bold text-black uppercase tracking-widest mt-6 mb-3 border-b border-black pb-1">{line.slice(3)}</p>);
    } else if (line.match(/^[•\-\*]\s/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[•\-\*]\s/)) { items.push(lines[i].replace(/^[•\-\*]\s/, '')); i++; }
      elements.push(<ul key={`ul-${i}`} className="article-content pl-8 space-y-2 my-3">{items.map((item, j) => <li key={j} className={baseClass} dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} />)}</ul>);
      continue;
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-3" />);
    } else {
      elements.push(<p key={i} className={cn(baseClass, "mb-2")} dangerouslySetInnerHTML={{ __html: inlineFmt(line) }} />);
    }
    i++;
  }
  return <div>{elements}</div>;
};

const ContractPreview = ({ formData, paginatedPages, currentPage }) => {
  const page = paginatedPages[currentPage];
  if (!page) return null;

  return (
    <div
      className="agreement-page-render w-[794px] h-[1123px] bg-white text-black relative shadow-2xl flex flex-col p-[25mm] rounded-[1px] font-formal border-[0.5px] border-black/10 shrink-0"
    >
      {/* Formal Header */}
      <div className="flex justify-between items-start mb-12 pb-6 border-b border-black relative z-10">
        <div className="flex flex-col gap-3">
          <img 
            src={formData.selectedLogo === 'marketing' ? '/logo_marketing.png' : '/logo_document.png'} 
            alt="Logo" 
            className="h-10 w-auto object-contain grayscale opacity-80" 
            crossOrigin="anonymous" 
          />
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-black">
              {formData.selectedLogo === 'marketing' ? 'Newbi Marketing' : 'Newbi Entertainment'}
            </p>
            <p className="text-[7px] text-gray-500 uppercase tracking-widest">Strategic Services Division</p>
          </div>
        </div>
        <div className="text-right space-y-4">
          <div className="space-y-1">
            <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">Agreement ID</p>
            <p className="text-[12px] font-bold text-black tracking-widest">{formData.agreementNumber}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">Effective Date</p>
            <p className="text-[10px] font-bold text-black uppercase tracking-wider">{new Date(formData.effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Dynamic Content */}
      <div className="flex-1 relative z-10 flex flex-col px-2">
        {page.type === 'intro' && (
          <div className="space-y-8">
            <div className="text-center py-8">
              <h1 className="text-3xl font-bold uppercase tracking-widest text-black underline underline-offset-8">
                {(formData.template === 'MOU' ? 'Memorandum of Understanding' : (formData.template || 'Service Agreement')).toUpperCase()}
              </h1>
            </div>
            
            <div className="space-y-8 text-[12px] leading-relaxed text-justify">
                <p className="font-bold border-b border-black/5 pb-2">
                  This {(formData.template || 'SERVICE AGREEMENT').toUpperCase()} (the "Agreement") is entered into as of {new Date(formData.effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} (the "Effective Date").
                </p>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3 border-l border-black/10 pl-6">
                    <p className="font-bold uppercase tracking-widest text-[8px] text-gray-400">By and Between:</p>
                    <div className="space-y-1">
                      <p><span className="font-bold uppercase">{formData.parties.firstParty.name}</span>, a company incorporated under the laws of India, having its principal place of business at {formData.parties.firstParty.address || '[Address]'} (hereinafter referred to as the <span className="font-bold">"{formData.parties.firstParty.role || 'Provider'}"</span>);</p>
                    </div>
                    <p className="font-bold uppercase tracking-widest text-[8px] text-gray-400 mt-2">And:</p>
                    <div className="space-y-1">
                      <p><span className="font-bold uppercase">{formData.parties.secondParty.name || '[Client Name]'}</span>, {formData.parties.secondParty.address ? `located at ${formData.parties.secondParty.address}` : 'having its registered address as specified in the execution block'} (hereinafter referred to as the <span className="font-bold">"{formData.parties.secondParty.role || 'Client'}"</span>).</p>
                    </div>
                  </div>
                </div>

                <p className="italic text-gray-500 py-3 text-center border-y border-black/5">
                  (The {formData.parties.firstParty.role || 'Provider'} and the {formData.parties.secondParty.role || 'Client'} are referred to individually as a <span className="font-bold text-black">"Party"</span> and collectively as the <span className="font-bold text-black">"Parties"</span>).
                </p>

                <div className="space-y-5">
                  <p className="font-bold uppercase tracking-widest text-[10px]">RECITALS:</p>
                  <div className="space-y-3 text-[12px]">
                    <p className="flex gap-4"><span>(A)</span> <span className="flex-1">{formData.parties.firstParty.role || 'Provider'} is engaged in the business of providing <span className="font-bold italic">{formData.details.projectName || 'professional strategic services'}</span>.</span></p>
                    <p className="flex gap-4"><span>(B)</span> <span className="flex-1">{formData.parties.secondParty.role || 'Client'} desires to engage {formData.parties.firstParty.role || 'Provider'} to perform certain services for the Client.</span></p>
                    <p className="flex gap-4"><span>(C)</span> <span className="flex-1">The Parties wish to record the terms and conditions on which the Services will be provided.</span></p>
                  </div>
                  <p className="pt-6 font-bold uppercase tracking-widest text-center text-[10px]">NOW THEREFORE THE PARTIES AGREE AS FOLLOWS:</p>
                </div>
            </div>
          </div>
        )}

        {page.type === 'mission' && (
          <div className="space-y-8 py-4">
            <div className="space-y-2 border-b border-black pb-2">
              <h3 className="text-base font-bold uppercase tracking-widest text-black">1. Scope of Engagement</h3>
            </div>
            <div className="text-[12px] leading-relaxed text-black text-justify px-4">
              {renderFormatted(formData.details.purpose || 'Project objectives and purpose.')}
            </div>
          </div>
        )}

        {page.type === 'commercials' && (
          <div className="space-y-12 py-4">
            <div className="space-y-2 border-b border-black pb-2">
              <h3 className="text-base font-bold uppercase tracking-widest text-black">2. Consideration and Payment</h3>
            </div>
            <div className="space-y-10 mt-8 px-4">
              <div className="border border-black p-8 text-center bg-gray-50/50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2">Total Contract Value</p>
                <h2 className="text-4xl font-bold tracking-tight text-black">{formData.commercials.currency} {formData.commercials.totalValue || '0.00'}</h2>
              </div>
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-black uppercase tracking-widest border-l-4 border-black pl-4">Payment Schedule</p>
                <div className="pl-8">
                  {renderFormatted(formData.commercials.paymentSchedule, 'text-[12px] font-medium text-black leading-relaxed')}
                </div>
              </div>
            </div>
          </div>
        )}

        {page.type === 'clauses' && (
          <div className="space-y-8 py-4">
            <div className="space-y-2 border-b border-black pb-2">
              <h3 className="text-base font-bold uppercase tracking-widest text-black">
                3. Terms and Conditions {page.pageIndex > 1 && '(Continued)'}
              </h3>
            </div>
            <div className="space-y-8 mt-6 px-4">
              {(page.items || []).map((clause, idx) => (
                <div key={clause.id} className="space-y-3">
                  <p className="text-[11px] font-bold text-black uppercase tracking-widest">
                    3.{(idx + 1 + (page.pageIndex - 1) * 3).toString().padStart(2, '0')} {clause.title}
                  </p>
                  <div className="text-[12px] leading-relaxed text-black text-justify pl-8 border-l border-black/5">
                    {renderFormatted(clause.content)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {page.type === 'execution' && (
          <div className="h-full flex flex-col py-4">
            <div className="space-y-2 border-b border-black pb-2 mb-16">
              <h3 className="text-base font-bold uppercase tracking-widest text-black">Execution</h3>
            </div>
            <div className="flex-1 flex flex-col justify-start space-y-20">
              <p className="text-[12px] text-gray-700 text-center max-w-xl mx-auto leading-relaxed">
                IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first above written.
              </p>
              <div className="grid grid-cols-2 gap-20">
                <div className="space-y-8">
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest border-b border-black/10 pb-2">Signed for and on behalf of Provider:</p>
                  <div className="h-20 flex items-end">
                    {formData.showSignatures && (
                      formData.providerSignature ? (
                        <img src={formData.providerSignature} className="h-full w-auto object-contain grayscale brightness-0" alt="Provider Signature" crossOrigin="anonymous" />
                      ) : (
                        <p className="text-4xl font-signature text-black leading-none opacity-40">Authorized Signatory</p>
                      )
                    )}
                  </div>
                  <div className="pt-4">
                    <p className="text-[11px] font-bold uppercase">Authorized Signatory</p>
                    <p className="text-[8px] text-gray-500 uppercase tracking-widest">Director of Operations</p>
                  </div>
                </div>
                <div className="space-y-8 text-right">
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest border-b border-black/10 pb-2">Signed for and on behalf of Client:</p>
                  <div className="h-20 flex items-end justify-end">
                    {formData.showSignatures && (
                      formData.clientSignature ? (
                        <img src={formData.clientSignature} className="h-full w-auto object-contain grayscale brightness-0" alt="Client Signature" crossOrigin="anonymous" />
                      ) : (
                        <div className="w-full h-px bg-black/10 border-dashed border-t" />
                      )
                    )}
                  </div>
                  <div className="pt-4">
                    <p className="text-[11px] font-bold uppercase">{formData.parties.secondParty.name || '________________'}</p>
                    <p className="text-[8px] text-gray-500 uppercase tracking-widest">Authorized Signatory</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center pt-20 relative">
                {formData.showSeal && (
                  <div className="absolute left-1/2 top-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-80 mix-blend-multiply">
                    <DocumentSeal className="w-48 h-48 grayscale brightness-0" />
                  </div>
                )}
                
                {/* Repositioned Forensic Watermark */}
                <div className="absolute bottom-12 right-12 text-right space-y-1 opacity-40">
                  <p className="text-[9px] font-black text-black uppercase tracking-[0.2em]">Digital Authentication</p>
                  <div className="text-[7px] font-bold text-gray-500 uppercase tracking-widest leading-tight">
                    <p>Reference: {formData.agreementNumber}</p>
                    <p>Timestamp: {new Date().toISOString()}</p>
                    <p>Origin: Forensic Node/NB-102</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 pb-2 border-t border-black flex justify-between items-center text-[9px] font-bold text-black uppercase tracking-widest relative z-10">
        <p className="opacity-60">{formData.template || 'Service Agreement'}</p>
        <p className="opacity-60">Page {currentPage + 1} of {paginatedPages.length}</p>
      </div>
    </div>
  );
};

export default ContractPreview;
