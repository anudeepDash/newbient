import React from 'react';
import { cn } from '../../lib/utils';
import DocumentSeal from '../ui/DocumentSeal';

const inlineFmt = (t) => t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');

const renderFormatted = (text, baseClass = 'text-[12px] font-medium text-black leading-relaxed text-justify') => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      elements.push(<p key={i} className="text-[13px] font-black text-black uppercase tracking-widest mt-6 mb-2 border-b border-black/10 pb-1">{line.slice(3)}</p>);
    } else if (line.match(/^[•\-\*]\s/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[•\-\*]\s/)) { items.push(lines[i].replace(/^[•\-\*]\s/, '')); i++; }
      elements.push(<div key={`ul-${i}`} className="pl-6 space-y-2 my-3">{items.map((item, j) => <div key={j} className="flex items-start gap-3"><span className="text-black mt-1.5 text-[6px]">■</span><span className={baseClass} dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} /></div>)}</div>);
      continue;
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-3" />);
    } else {
      elements.push(<p key={i} className={cn(baseClass, "indent-8")} dangerouslySetInnerHTML={{ __html: inlineFmt(line) }} />);
    }
    i++;
  }
  return <div>{elements}</div>;
};

const ContractPreview = ({ formData, paginatedPages, currentPage, previewScale }) => {
  const page = paginatedPages[currentPage];
  if (!page) return null;

  return (
    <div
      className="agreement-page-render w-[794px] h-[1123px] bg-white text-black relative shadow-2xl origin-top transition-transform duration-300 overflow-hidden flex flex-col p-[25mm] rounded-[2px] font-formal border-[1px] border-black/10"
      style={{ transform: `scale(${previewScale})`, height: `${1123 * previewScale}px` }}
    >
      <div className="absolute inset-[5mm] border border-black/5 pointer-events-none" />

    <div className="flex justify-between items-start mb-8 pb-6 border-b-[2px] border-black relative z-10">
        <div className="flex flex-col gap-4 items-start">
          <img 
            src={formData.selectedLogo === 'media' ? '/logo_media.png' : formData.selectedLogo === 'marketing' ? '/logo_marketing.png' : '/logo_document.png'} 
            alt="Logo" 
            className="h-12 w-auto object-contain grayscale" 
            crossOrigin="anonymous" 
          />
          <div className="space-y-0.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-black">
              {formData.selectedLogo === 'media' ? 'Newbi Media' : formData.selectedLogo === 'marketing' ? 'Newbi Marketing' : 'Newbi Entertainment'}
            </p>
            <p className="text-[7px] font-bold text-gray-500 uppercase">Strategic Legal Division</p>
          </div>
        </div>
        <div className="text-right space-y-2">
          <div className="space-y-0.5">
            <h4 className="text-[8px] font-black uppercase text-black tracking-[0.3em]">Instrument No.</h4>
            <p className="text-lg font-black text-black tracking-widest">{formData.agreementNumber}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Effective Date</p>
            <p className="text-[10px] font-black text-black uppercase">{new Date(formData.effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Dynamic Content */}
      <div className="flex-1 relative z-10 flex flex-col">
        {currentPage === 0 && (
          <div className="space-y-10 mb-12">
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-black uppercase tracking-[0.2em] border-y-2 border-black py-4">
                {(formData.type || 'STRATEGIC SERVICE AGREEMENT').toUpperCase()}
              </h1>
            </div>
            <div className="space-y-6 text-[12px] leading-relaxed text-justify">
              <p className="font-bold italic">
                THIS AGREEMENT is made on this {new Date(formData.effectiveDate).getDate()} day of {new Date(formData.effectiveDate).toLocaleString('default', { month: 'long' })}, {new Date(formData.effectiveDate).getFullYear()} ("Effective Date").
              </p>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <p className="font-bold uppercase tracking-widest text-[10px]">Between:</p>
                  <p><span className="font-bold">{formData.parties.firstParty.name}</span>, a registered entity with its principal office at {formData.parties.firstParty.address || '[Address pending]'} (hereinafter referred to as the <span className="font-bold uppercase">"Provider"</span>);</p>
                </div>
                <div className="flex justify-center py-2 font-bold italic text-gray-400">AND</div>
                <div className="space-y-1">
                  <p className="font-bold uppercase tracking-widest text-[10px]">And:</p>
                  <p><span className="font-bold">{formData.parties.secondParty.name || 'Contracting Entity'}</span>, a registered entity with its principal office at {formData.parties.secondParty.address || '[Address pending]'} (hereinafter referred to as the <span className="font-bold uppercase">"Client"</span>).</p>
                </div>
              </div>
              <div className="pt-8 space-y-4">
                <p className="font-bold uppercase tracking-[0.2em] text-[10px] text-center">RECITALS (WHEREAS):</p>
                <div className="space-y-3 italic text-gray-600">
                  <p>A. The Provider is engaged in the business of providing professional {formData.details.projectName || 'strategic'} services and possesses the requisite expertise;</p>
                  <p>B. The Client desires to engage the Provider for the execution of certain strategic objectives;</p>
                  <p>C. The Parties have agreed to enter into this Agreement to define their respective rights and obligations.</p>
                </div>
                <p className="pt-4 font-bold italic">NOW, THEREFORE, in consideration of the mutual covenants contained herein, the Parties agree as follows:</p>
              </div>
            </div>
          </div>
        )}

        {page.type === 'mission' && (
          <div className="space-y-8 py-4">
            <h3 className="text-lg font-black uppercase tracking-widest text-black border-b border-black pb-1 inline-block">Section 01. Purpose of Engagement.</h3>
            <div className="text-[12px] font-medium leading-relaxed text-black text-justify mt-4">
              {renderFormatted(formData.details.purpose || 'Objectives pending AI orchestration...')}
            </div>
          </div>
        )}

        {page.type === 'commercials' && (
          <div className="space-y-8 py-4">
            <h3 className="text-lg font-black uppercase tracking-widest text-black border-b border-black pb-1 inline-block">Section 02. Financial Considerations.</h3>
            <div className="grid grid-cols-1 gap-8 mt-4">
              <div className="space-y-8">
                <div className="space-y-2 text-center py-8 border-y border-black/5 bg-gray-50/50">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Valuation of Mandate</p>
                  <h2 className="text-5xl font-black tracking-tighter text-black">{formData.commercials.currency} {formData.commercials.totalValue || '0.00'}</h2>
                </div>
                <div className="space-y-4">
                  <p className="text-[9px] font-black text-black uppercase tracking-widest border-b border-black pb-1 inline-block">Payment Structure & Schedule</p>
                  {renderFormatted(formData.commercials.paymentSchedule, 'text-[11px] font-bold text-black leading-relaxed')}
                </div>
              </div>
            </div>
          </div>
        )}

        {page.type === 'clauses' && (
          <div className="space-y-8 py-4">
            <h3 className="text-lg font-black uppercase tracking-widest text-black border-b border-black pb-1 inline-block">
              Section 03. Terms & Covenants {page.pageIndex > 1 && '(Cont.)'}
            </h3>
            <div className="space-y-6 mt-4">
              {(page.items || []).map((clause, idx) => (
                <div key={clause.id} className="space-y-2">
                  <p className="text-[11px] font-black text-black uppercase tracking-widest">
                    Article {idx + 1 + (page.pageIndex - 1) * 3}. {clause.title}
                  </p>
                  <div className="text-[12px] font-medium text-black leading-relaxed text-justify">
                    {renderFormatted(clause.content)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {page.type === 'execution' && (
          <div className="h-full flex flex-col py-4">
            <h3 className="text-lg font-black uppercase tracking-widest text-black border-b border-black pb-1 inline-block mb-12">Execution & Authorization.</h3>
            <div className="flex-1 flex flex-col justify-start space-y-20">
              <p className="text-[12px] italic text-gray-500 mb-8">IN WITNESS WHEREOF, the Parties hereto have executed this Agreement as of the Effective Date first above written.</p>
              <div className="grid grid-cols-2 gap-20">
                <div className="space-y-6">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-black pb-1">Signed for and on behalf of the Provider</p>
                  <div className="h-20 flex items-end">
                    {formData.showSignature && <p className="text-5xl font-signature text-black leading-none opacity-90">Abhinav Anand</p>}
                  </div>
                  <div className="pt-2 border-t border-black/5">
                    <p className="text-[10px] font-bold uppercase">Name: Abhinav Anand</p>
                    <p className="text-[9px] text-gray-500 uppercase">Title: Director of Operations</p>
                  </div>
                </div>
                <div className="space-y-6 text-right">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-black pb-1">Signed for and on behalf of the Client</p>
                  <div className="h-20 flex items-end justify-end">
                    <div className="w-full h-px bg-black opacity-20 border-dashed border-t" />
                  </div>
                  <div className="pt-2 border-t border-black/5">
                    <p className="text-[10px] font-bold uppercase">Name: ________________</p>
                    <p className="text-[9px] text-gray-500 uppercase">Title: Authorized Signatory</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center text-center space-y-8 pt-12">
                <div className="relative">
                  {formData.showSeal && <DocumentSeal type="agreement" date={formData.effectiveDate} className="w-40 h-40 opacity-90" />}
                </div>
                <div className="max-w-lg space-y-2">
                  <p className="text-[9px] font-black text-black uppercase tracking-[0.4em] mb-1">Electronic Execution Metadata</p>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest space-y-1">
                    <p>IP Address: 000.000.00.00</p>
                    <p>Handshake Time: PENDING EXECUTION</p>
                    <p>Security Hash: SESSION_TOKEN_ID</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 pb-0 border-t-[1px] border-black/10 flex justify-between items-center text-[8px] font-black text-black uppercase tracking-[0.2em] relative z-10">
        <div className="flex items-center gap-4">
          <p>© NEWBI ENTERTAINMENT 2024</p>
          <div className="w-[1px] h-3 bg-black/10" />
          <p className="italic text-gray-400">{formData.agreementNumber}</p>
        </div>
        <p>Page {currentPage + 1} OF {paginatedPages.length}</p>
      </div>
    </div>
  );
};

export default ContractPreview;
