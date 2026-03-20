import fs from 'fs';
import path from 'path';

const dir = 'c:/Users/anude/OneDrive/Documents/codeBase/newbient/src/pages/Admin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Standardize the container wrapper
  const updatedContent = content.replace(
    /<div className="relative z-10 max-w-[a-zA-Z0-9\[\]\-]+ mx-auto [^"]+">/,
    '<div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-24 md:pt-32">'
  );

  if (updatedContent !== content) {
    fs.writeFileSync(filePath, updatedContent);
    console.log(`Updated layout wrapper in ${file}`);
  }
});

// Fix specific text color in InvoiceManagement
const invoiceMgmtPath = path.join(dir, 'InvoiceManagement.jsx');
if (fs.existsSync(invoiceMgmtPath)) {
  let invContent = fs.readFileSync(invoiceMgmtPath, 'utf8');
  invContent = invContent.replace(
    /INVOICE <span className="text-neon-blue px-4">MANAGER\.<\/span>/g,
    'INVOICE <span className="text-neon-green px-4">MANAGER.</span>'
  );
  fs.writeFileSync(invoiceMgmtPath, invContent);
  console.log('Fixed neon color in InvoiceManagement.jsx');
}

// Fix specific text color and title in InvoiceGenerator
const invoiceGenPath = path.join(dir, 'InvoiceGenerator.jsx');
if (fs.existsSync(invoiceGenPath)) {
  let invGenContent = fs.readFileSync(invoiceGenPath, 'utf8');
  invGenContent = invGenContent.replace(
    /INVOICE <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white">ENGINE\.<\/span>/g,
    'INVOICE <span className="text-neon-green px-4">ENGINE.</span>'
  );
  fs.writeFileSync(invoiceGenPath, invGenContent);
  console.log('Fixed neon color matching in InvoiceGenerator.jsx');
}

console.log('All admin page layouts standardized!');
