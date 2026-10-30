import { describe, it, expect } from 'vitest';
import { parseBankDetails, composeBankDetails, sameBankDetails, bankAccountLabel } from '../src/components/admin/invoices/builder/gst.js';

const HDFC = 'Account name: Newbi Entertainment & Marketing LLP\nBank: HDFC Bank\nAccount no.: 50200012345678\nIFSC: HDFC0001234';

describe('invoice bank details', () => {
    it('round-trips the fields through the printed text', () => {
        const fields = parseBankDetails(HDFC);
        expect(fields.bankName).toBe('HDFC Bank');
        expect(fields.ifsc).toBe('HDFC0001234');
        expect(composeBankDetails(fields)).toBe(HDFC);
    });

    it('keeps free text it cannot read as fields as text', () => {
        expect(parseBankDetails('Pay to our HDFC current account')).toBeNull();
    });

    it('matches a saved account regardless of spacing and case', () => {
        expect(sameBankDetails(HDFC, `  ${HDFC.replace('HDFC Bank', 'hdfc  bank')}\n`)).toBe(true);
        expect(sameBankDetails(HDFC, HDFC.replace('1234', '9999'))).toBe(false);
        expect(sameBankDetails('', '')).toBe(false);
    });

    it('names an account by bank and the last four digits', () => {
        expect(bankAccountLabel(HDFC)).toBe('HDFC Bank ··5678');
        expect(bankAccountLabel('Account name: Newbi')).toBe('Newbi');
        expect(bankAccountLabel('free text')).toBe('Bank account');
    });
});
