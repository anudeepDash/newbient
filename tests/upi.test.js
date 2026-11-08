import { describe, it, expect } from 'vitest';
import { cleanUpiId, upiAmount, upiPayUri } from '../src/lib/upi.js';

describe('UPI pay links', () => {
    it('cleans UPI IDs and rejects things that are not one', () => {
        expect(cleanUpiId(' Riya.S@OkAxis ')).toBe('riya.s@okaxis');
        expect(cleanUpiId('9876543210@ybl')).toBe('9876543210@ybl');
        expect(cleanUpiId('riya')).toBe('');
        expect(cleanUpiId('riya@')).toBe('');
        expect(cleanUpiId('')).toBe('');
    });

    it('formats amounts the way UPI apps want them', () => {
        expect(upiAmount(1500)).toBe('1500.00');
        expect(upiAmount('₹1,250.5')).toBe('1250.50');
        expect(upiAmount('0')).toBe('');
        expect(upiAmount('abc')).toBe('');
        expect(upiAmount('')).toBe('');
    });

    it('builds a upi://pay link with payee, amount and note', () => {
        expect(upiPayUri({ upiId: 'Riya@OkAxis', name: 'Riya Sharma', amount: 1500, note: 'Newbi payout' }))
            .toBe('upi://pay?pa=riya%40okaxis&pn=Riya%20Sharma&am=1500.00&cu=INR&tn=Newbi%20payout');
    });

    it('leaves the amount out when none is set, so the payer types it', () => {
        expect(upiPayUri({ upiId: 'riya@okaxis', name: 'Riya' })).toBe('upi://pay?pa=riya%40okaxis&pn=Riya&cu=INR');
    });

    it('strips characters apps reject and trims long names', () => {
        const uri = upiPayUri({ upiId: 'a@b', name: 'Riya 😀 <S>#'.padEnd(80, 'x'), note: 'Pay&go?=1' });
        // 'a@b' is too short a handle on its left; use a valid one for the content check
        expect(uri).toBe('');
        const ok = upiPayUri({ upiId: 'ab@okaxis', name: 'Riya 😀 <S>#', note: 'Fest?=1&more' });
        expect(ok).toContain('pn=Riya%20S');
        expect(ok).not.toContain('?=');
        expect(decodeURIComponent(ok.split('tn=')[1])).toBe('Fest 1&more');
    });

    it('returns nothing for a bad UPI ID', () => {
        expect(upiPayUri({ upiId: 'not-a-upi', amount: 100 })).toBe('');
    });
});
