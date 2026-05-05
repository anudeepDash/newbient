import { generateFullDocument } from './src/lib/ai.js';

generateFullDocument('invoice', 'make me an invoice for a website worth 5000')
    .then(r => console.log(JSON.stringify(r, null, 2)))
    .catch(console.error);
