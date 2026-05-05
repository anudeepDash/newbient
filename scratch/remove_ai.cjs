const fs = require('fs');
const path = require('path');

const files = [
    'src/pages/Admin/ProposalGenerator.jsx',
    'src/pages/Admin/AgreementGenerator.jsx',
    'src/pages/Admin/InvoiceGenerator.jsx'
];

files.forEach(filePath => {
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) {
        console.log('File not found:', filePath);
        return;
    }

    let content = fs.readFileSync(absolutePath, 'utf8');

    // 1. Remove UI components (case insensitive and multi-line)
    content = content.replace(/<AIPromptBox[\s\S]*?\/>/gi, '');
    content = content.replace(/<AISectionButtons[\s\S]*?\/>/gi, '');
    content = content.replace(/<ToneSwitch[\s\S]*?\/>/gi, '');

    // 2. Remove specific AI triggers in AgreementGenerator
    content = content.replace(/await\s+handleAIGenerateFull\(prompt\);/g, '');

    // 3. Remove imports
    content = content.replace(/^import\s+AIPromptBox.*?\n/gm, '');
    content = content.replace(/^import\s+AISectionButtons.*?\n/gm, '');
    content = content.replace(/^import\s+ToneSwitch.*?\n/gm, '');
    content = content.replace(/^import\s+\{.*?\}\s+from\s+'.*?\/lib\/ai';\n/gm, '');

    // 4. Remove store destructuring
    content = content.replace(/,\s*aiConfig/g, '');

    // 5. Remove state
    content = content.replace(/\s*const\s+\[isAILoading.*?\n/g, '\n');
    content = content.replace(/\s*const\s+\[aiTone.*?\n/g, '\n');
    content = content.replace(/\s*const\s+\[lastAiPrompt.*?\n/g, '\n');

    fs.writeFileSync(absolutePath, content);
    console.log('Cleaned:', filePath);
});

// Clean SiteSettings
const settingsPath = path.resolve(process.cwd(), 'src/pages/Admin/SiteSettings.jsx');
if (fs.existsSync(settingsPath)) {
    let settingsContent = fs.readFileSync(settingsPath, 'utf8');
    settingsContent = settingsContent.replace(/,\s*aiConfig/g, '');
    settingsContent = settingsContent.replace(/,\s*updateAiConfig/g, '');
    settingsContent = settingsContent.replace(/const\s+\[aiFormData[\s\S]*?}\);\n/g, '');
    settingsContent = settingsContent.replace(/if\s*\(aiConfig\)\s*setAiFormData\(\{\s*\.\.\.aiConfig\s*\}\);\n/g, '');
    settingsContent = settingsContent.replace(/\[siteDetails,\s*aiConfig\]/g, '[siteDetails]');
    
    // Remove the AI settings section (assuming it's wrapped in a specific div or starts with specific text)
    // We'll manually clean the remainder of SiteSettings if needed.
    
    fs.writeFileSync(settingsPath, settingsContent);
    console.log('Cleaned: SiteSettings.jsx');
}
