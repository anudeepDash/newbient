const splitTextIntoPages = (text, maxChars = 800) => {
    if (!text) return [];
    const pages = [];
    let currentText = '';
    const paragraphs = text.split('\n');
    for (const p of paragraphs) {
        if (currentText.length + p.length > maxChars) {
            if (currentText) pages.push(currentText.trim());
            currentText = p;
        } else {
            currentText += (currentText ? '\n' : '') + p;
        }
    }
    if (currentText) pages.push(currentText.trim());
    return pages;
};

const estimateBlockHeight = (text) => {
    if (!text) return 0;
    const charCount = text.length;
    const lineCount = (text.match(/\n/g) || []).length + 1;
    return Math.max(lineCount * 18, Math.ceil(charCount / 65) * 18);
};

const runTest = (formData) => {
    const pages = [];
    const isHidden = (f) => (formData.hiddenFields || []).includes(f);

    if (!isHidden('cover')) {
        pages.push({ type: 'cover', items: [] });
    }

    if (!isHidden('commercials')) {
        const termsHtml = formData.terms || '';
        const paymentDetailsHtml = formData.showPaymentDetails !== false ? (formData.paymentDetails || '') : '';
        
        if (termsHtml) {
            const termsPages = splitTextIntoPages(termsHtml, 800);
            const lastTermsPageText = termsPages[termsPages.length - 1];
            const finalPageStaticHeight = 550;
            const lastTermsHeight = estimateBlockHeight(lastTermsPageText) + (paymentDetailsHtml ? 100 : 0);
            
            if (lastTermsHeight + finalPageStaticHeight <= 800) {
                for (let i = 0; i < termsPages.length - 1; i++) {
                    pages.push({
                        type: 'terms_only',
                        termsText: termsPages[i],
                        termsPageIdx: i + 1
                    });
                }
                pages.push({
                    type: 'commercials',
                    termsText: lastTermsPageText,
                    paymentDetailsText: paymentDetailsHtml,
                    items: []
                });
            } else {
                for (let i = 0; i < termsPages.length; i++) {
                    pages.push({
                        type: 'terms_only',
                        termsText: termsPages[i],
                        termsPageIdx: i + 1
                    });
                }
                pages.push({
                    type: 'commercials',
                    termsText: '',
                    paymentDetailsText: paymentDetailsHtml,
                    items: []
                });
            }
        } else {
            pages.push({
                type: 'commercials',
                termsText: '',
                paymentDetailsText: paymentDetailsHtml,
                items: []
            });
        }
    }
    return pages;
};

console.log("TEST 1: showPaymentDetails = true, terms = ''");
console.log(runTest({ showPaymentDetails: true, terms: '', paymentDetails: 'Bank Details info' }));

console.log("\nTEST 2: showPaymentDetails = false, terms = ''");
console.log(runTest({ showPaymentDetails: false, terms: '', paymentDetails: 'Bank Details info' }));

console.log("\nTEST 3: showPaymentDetails = false, terms = 'Some terms text'");
console.log(runTest({ showPaymentDetails: false, terms: 'Some terms text', paymentDetails: 'Bank Details info' }));
