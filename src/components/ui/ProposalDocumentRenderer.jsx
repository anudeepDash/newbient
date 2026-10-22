import React from 'react';
import { cn } from '../../lib/utils';
import {
    Paper, SectionTitle, Label, Callout, Table, Steps, Bullets, Note, Chips, Blocks, Rich,
    bodyText, HEADING_FONT, GREEN, NEON, INK,
} from './proposalDesign';

export default function ProposalDocumentRenderer({ 
    page, 
    pageIdx, 
    totalPages, 
    formData = {}, 
    currentLogo = { path: '/brand/newbi-logo-entertainment-800w.png' }, 
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

    if (isV2) {
        return (
            <V2Page
                page={page}
                pageIdx={pageIdx}
                totalPages={totalPages}
                formData={formData}
                brand={formData.selectedLogo}
                renderSafeText={renderSafeText}
                renderContent={renderContent}
                isExporting={isExporting}
                signatureArea={signatureArea}
            />
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
                    <img src={currentLogo?.path || '/brand/newbi-logo-entertainment-800w.png'} alt="Logo" className="h-14 w-auto object-contain" crossOrigin="anonymous" />
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
                                
                                <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Prepared By</p>
                                        <p className="text-[13px] font-bold text-black">{formData.preparedBy || 'Newbi Entertainment & Marketing LLP'}</p>
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

/* The old cover pill said "quotation"; the paper now calls itself a proposal. */
const pillText = (t) => (!t || /^official strategic quotation$/i.test(String(t).trim()) ? 'Official Strategic Proposal' : t);

/* The intro opens with our name in bold, as on the reference design. */
const COMPANY = 'Newbi Entertainment & Marketing LLP';
const boldCompany = (text) => {
    const t = String(text || '');
    if (!t || t.includes('**')) return t;
    const re = /^(Newbi Entertainment & Marketing LLP)/i;
    return t.replace(re, '**$1**');
};

const isHtml = (t) => typeof t === 'string' && /<\/?[a-z][\s\S]*>/i.test(t);

/** Plain text gets the paper's formatting; HTML from older editors goes through the caller's renderer. */
const Body = ({ text, renderSafeText, className = bodyText }) => {
    if (!text) return null;
    if (isHtml(text)) return <div className={className}>{renderSafeText(text)}</div>;
    return <Rich text={text} paragraphClassName={className} />;
};

const deliverableRows = (rows = []) => rows.map(r => [
    [r.deliverable || r.item || '', r.description || r.note || ''].filter(Boolean).join('\n'),
    r.qty || r.qtyPrice || '—',
    r.timeline || '—',
]);

/** One page of the built-in proposal, in the Pinnaca design. */
function V2Page({ page, pageIdx, totalPages, formData, brand, renderSafeText, renderContent, isExporting, signatureArea }) {
    const f = formData;
    const number = f.proposalNumber || 'NBQ-XXXX';
    const headers = Array.isArray(f.deliverablesTableHeaders) && f.deliverablesTableHeaders.length >= 4
        ? f.deliverablesTableHeaders.slice(1, 4)
        : ['Deliverable', 'Qty / Unit', 'Timeline'];

    let content = null;
    switch (page.type) {
        case 'v2-cover': {
            const inside = (f.whatsInside || []).filter(c => c && c.title);
            content = (
                <div className="-mt-[8px] flex flex-col">
                    {f.showCoverPill !== false && (
                        <span className="self-start rounded-full px-[22px] py-[11px] text-[8.5px] font-bold uppercase tracking-[0.3em]" style={{ background: '#E8F7EE', color: GREEN }}>
                            {pillText(f.coverPillText)}
                        </span>
                    )}
                    <div className="mt-[38px] grid grid-cols-2 gap-[32px] border-b pb-[26px]" style={{ borderColor: '#E8EAE8' }}>
                        <div>
                            <Label className="mb-[16px]">Client entity</Label>
                            <h1 className="text-[20px] font-bold leading-[1.25] tracking-[-0.01em]" style={HEADING_FONT}>{f.clientName || 'Client name'}</h1>
                            {f.clientSubtitle && <p className="mt-[8px] text-[10.7px] leading-[1.5] text-gray-500">{f.clientSubtitle}</p>}
                            {f.clientAddress && <p className="mt-[4px] text-[10px] leading-[1.5] text-gray-400">{f.clientAddress}</p>}
                        </div>
                        <div className="flex flex-col items-end text-right">
                            <Label className="mb-[16px]">Project specification</Label>
                            <h1 className="text-[20px] font-bold leading-[1.25] tracking-[-0.01em]" style={HEADING_FONT}>{f.campaignName || 'Project name'}</h1>
                            {f.campaignSubtitle && <p className="mt-[6px] text-[10.7px] leading-[1.5] text-gray-500">{f.campaignSubtitle}</p>}
                            {f.showDuration !== false && f.campaignDuration && (
                                <span className="mt-[14px] rounded-full border px-[20px] py-[7px] text-[8.5px] font-bold uppercase tracking-[0.2em]" style={{ background: NEON, borderColor: INK, color: INK }}>
                                    Duration: {f.campaignDuration}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="mt-[26px]">
                        <Body text={isHtml(f.introParagraph || f.coverDescription) ? (f.introParagraph || f.coverDescription) : boldCompany(f.introParagraph || f.coverDescription)} renderSafeText={renderSafeText} className="text-[13px] leading-[24px] text-[#2B2D31]" />
                    </div>
                    {f.showWhatsInside !== false && inside.length > 0 && (
                        <div className="mt-[30px]">
                            <Label>What&apos;s inside</Label>
                            <div className="grid gap-[12px]" style={{ gridTemplateColumns: `repeat(${inside.length > 6 ? 5 : 3}, minmax(0, 1fr))` }}>
                                {inside.map((c, i) => (
                                    <div key={i} className="min-h-[80px] rounded-[10px] border bg-white px-[12px] py-[14px]" style={{ borderColor: '#E8EAE8' }}>
                                        <p className="text-[9.3px] font-bold" style={{ color: GREEN, ...HEADING_FONT }}>{c.num || String(i + 1).padStart(2, '0')}</p>
                                        <p className="mt-[10px] text-[10px] font-bold leading-[1.4]" style={HEADING_FONT}>{c.title}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {f.showPreparedFor !== false && (
                        <Callout className="mt-[24px]" label="Prepared for">
                            <Body
                                text={f.preparedForText || `This proposal has been prepared exclusively for ${f.clientName || 'the client'}, in connection with ${f.campaignName || 'the campaign'}. All figures and scope items are indicative and open to discussion ahead of final sign-off.`}
                                renderSafeText={renderSafeText}
                                className="text-[11.7px] leading-[20px] text-[#2B2D31]"
                            />
                        </Callout>
                    )}
                </div>
            );
            break;
        }

        case 'v2-executive':
            content = (
                <>
                    <SectionTitle eyebrow={f.strategySub || 'Strategic outline'} title={f.strategyTitle || 'Executive Summary'} />
                    <div className="space-y-[26px]">
                        <div className="space-y-[12px]">
                            {(f.executiveParagraphs || [f.overview]).filter(Boolean).map((p, i) => <Body key={i} text={p} renderSafeText={renderSafeText} />)}
                        </div>
                        {f.showPrimaryObjective !== false && (
                            <Callout accent label={f.primaryObjectiveTitle || 'Primary objective'} text={isHtml(f.primaryObjectiveText || f.primaryGoal) ? null : (f.primaryObjectiveText || f.primaryGoal)}>
                                {isHtml(f.primaryObjectiveText || f.primaryGoal) && <Body text={f.primaryObjectiveText || f.primaryGoal} renderSafeText={renderSafeText} />}
                            </Callout>
                        )}
                        {f.showAnchorMarkets !== false && (f.anchorMarkets || []).length > 0 && (
                            <div>
                                <Label>{f.anchorMarketsTitle || 'Key anchor markets'}</Label>
                                <Chips items={f.anchorMarkets} />
                                {f.anchorMarketsCaption && <p className="mt-[8px] text-[9.5px] italic text-gray-500">{f.anchorMarketsCaption}</p>}
                            </div>
                        )}
                        {f.showWhyThisApproach !== false && <Callout label={f.whyThisApproachTitle || 'Why this approach'} text={f.whyThisApproachText} />}
                        <Blocks blocks={f.executiveBlocks} />
                    </div>
                </>
            );
            break;

        case 'v2-blueprint-1':
        case 'v2-blueprint-2':
            content = (
                <>
                    <SectionTitle
                        eyebrow={f.blueprintSub || "How we'll execute"}
                        title={f.blueprintTitle || 'Process & Execution Blueprint'}
                        aside={page.continued || page.type === 'v2-blueprint-2' ? '(continued)' : null}
                    />
                    <Steps items={page.steps || []} start={(page.startIndex || 0) + 1} />
                </>
            );
            break;

        case 'v2-deliverables':
            content = (
                <>
                    <SectionTitle eyebrow={f.deliverablesSub || 'Scope summary'} title={f.deliverablesTitle || 'Deliverables'} />
                    <Table numbered columns={headers} rows={deliverableRows(f.deliverablesTable || f.deliverables || [])} />
                    <Note className="mt-[12px]">{f.deliverablesTableNote}</Note>
                    {f.showCityNote !== false && <Callout className="mt-[26px]" label={f.cityNoteTitle} text={f.cityNoteText} />}
                    <Blocks blocks={f.deliverablesBlocks} className="mt-[26px]" />
                </>
            );
            break;

        case 'v2-commercials':
            content = (
                <>
                    <SectionTitle eyebrow={f.commercialsSub || 'Commercials'} title={f.commercialsTitle || 'Pricing Structure'} />
                    <div className="space-y-[26px]">
                        {f.commercialsSubtitle && <Rich text={f.commercialsSubtitle} paragraphClassName={bodyText} />}
                        <div>
                            <Table
                                numbered
                                columns={headers}
                                rows={(f.pricingTable || []).map(r => [
                                    [r.deliverable || '', r.description || ''].filter(Boolean).join('\n'),
                                    r.qtyPrice || '—',
                                    r.timeline || '—',
                                ])}
                            />
                            <Note className="mt-[12px]">{f.pricingTableNote}</Note>
                        </div>
                        {f.showWhatsIncluded !== false && <Callout label={f.whatsIncludedTitle || "What's included"} text={f.whatsIncludedText} />}
                        {f.showPaymentScaling !== false && <Callout label={f.paymentScalingTitle || 'Payment & scaling'} text={f.paymentScalingText} />}
                    </div>
                </>
            );
            break;

        case 'v2-deepdive':
            content = (
                <>
                    <SectionTitle eyebrow={f.deepDiveSub} title={f.deepDiveTitle} />
                    {f.deepDiveIntro && <Rich text={f.deepDiveIntro} className="mb-[22px]" paragraphClassName={bodyText} />}
                    <div>
                        {(f.deepDiveSubsections || []).map((sec, i) => (
                            <div key={i} className="border-b py-[16px] first:pt-0" style={{ borderColor: '#E8EAE8' }}>
                                <div className="flex items-center gap-[10px]">
                                    <span className="rounded-full border px-[8px] py-[2px] text-[8.5px] font-bold" style={{ background: NEON, borderColor: INK }}>{sec.badge || i + 1}</span>
                                    <h3 className="text-[12.4px] font-bold" style={HEADING_FONT}>{sec.title}</h3>
                                </div>
                                <Bullets items={sec.bullets} className="mt-[10px] pl-[4px]" />
                            </div>
                        ))}
                    </div>
                </>
            );
            break;

        case 'v2-closing':
            content = (
                <>
                    <SectionTitle eyebrow={f.closingSub || 'Closing'} title={f.closingTitle || 'Next Steps'} />
                    <Body text={f.closingText} renderSafeText={renderSafeText} />
                    <div className="mt-[30px] grid grid-cols-2 border-t pt-[20px]" style={{ borderColor: '#E8EAE8' }}>
                        <div>
                            <Label className="mb-[8px]">Prepared by</Label>
                            <p className="text-[12px] font-bold">{f.preparedBy || COMPANY}</p>
                        </div>
                        <div className="text-right">
                            <Label className="mb-[8px]">Proposal reference</Label>
                            <p className="text-[12px] font-bold tracking-[0.08em]">{number}</p>
                        </div>
                    </div>
                    {signatureArea ? <div className="mt-auto border-t pt-6" style={{ borderColor: '#E8EAE8' }}>{signatureArea}</div> : null}
                </>
            );
            break;

        case 'v2-custom':
            content = (
                <>
                    <SectionTitle eyebrow={page.subtitle} title={page.title} aside={page.aside} />
                    {page.content && (
                        <div className="mb-[26px] text-[12px] leading-[20.4px] text-[#2B2D31]">
                            {isHtml(page.content) ? renderContent(page.content) : <Rich text={page.content} paragraphClassName={bodyText} />}
                        </div>
                    )}
                    <Blocks blocks={page.blocks} />
                </>
            );
            break;

        default:
            content = null;
    }

    return (
        <Paper number={number} pageIdx={pageIdx} totalPages={totalPages} brand={brand} isExporting={isExporting}>
            {content}
        </Paper>
    );
}
