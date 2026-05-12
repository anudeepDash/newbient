import fs from 'fs';
const content = fs.readFileSync('src/components/tickets/EventTicketingModal.jsx', 'utf8');
const lines = content.split('\n');
for (let i = 310; i <= 330; i++) {
    console.log(`${i}: ${lines[i-1]}`);
}
