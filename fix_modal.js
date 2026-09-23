const fs = require('fs');
let content = fs.readFileSync('src/components/creator/CampaignDetailModal.jsx', 'utf8');

// The duplicate block starts somewhere around line 1170.
// Let's find "Main Two-Column Layout"
const searchStr = "{/* Main Two-Column Layout */}";
const idx = content.indexOf(searchStr);
console.log("Found Main Two-Column Layout at index:", idx);

// The old block continues until the end of the modal, right before:
/*
            {/* Deliverable Proof Submission Sub-Modal *\/}
            <AnimatePresence>
*/

const endSearchStr = "{/* Deliverable Proof Submission Sub-Modal */}";
const endIdx = content.indexOf(endSearchStr);
console.log("Found Deliverable Proof Submission Sub-Modal at index:", endIdx);

// Let's print the lines around the boundaries to be sure
const lines = content.split('\n');
const lineNum = content.substring(0, idx).split('\n').length;
console.log("Line number of Main Two-Column Layout:", lineNum);

const endLineNum = content.substring(0, endIdx).split('\n').length;
console.log("Line number of Deliverable Proof Submission Sub-Modal:", endLineNum);

// The code to remove should be from the leftover of "Quick Stats Grid" block until the Deliverable Proof Submission Sub-Modal
