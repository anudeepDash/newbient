const fs = require('fs');
const path = require('path');

const files = [
    {
        name: 'src/components/home/Hero.jsx',
        replacements: [
            // Remove ambient spotlights
            [/\s*<div className="absolute top-\[-10%\] left-\[-10%\].*?\/>/g, ''],
            [/\s*<div className="absolute bottom-\[-10%\] right-\[-10%\].*?\/>/g, ''],
            // Remove glass card drop shadows
            [/filter drop-shadow-\[0_0_15px_rgba\(57,255,20,0.4\)\]/g, ''],
            // Remove logo glow
            [/\s*<div className="absolute w-64 h-64 bg-gradient-to-tr from-neon-green\/15 to-white\/5 blur-\[80px\] rounded-full scale-75 pointer-events-none animate-pulse" \/>/g, ''],
            // Make icons grey
            [/text-neon-green w-16 h-16/g, 'text-white/20 w-16 h-16'],
            [/text-neon-green w-14 h-14/g, 'text-white/20 w-14 h-14']
        ]
    },
    {
        name: 'src/components/home/UpcomingEvents.jsx',
        replacements: [
            [/\s*<div className="absolute top-1\/2 left-0 w-\[400px\] h-\[400px\] bg-neon-green\/\[0.02\].*?\/>/g, '']
        ]
    },
    {
        name: 'src/components/home/WhyChooseUs.jsx',
        replacements: [
            [/\s*<div className="absolute -left-20 top-1\/2 -translate-y-1\/2 w-64 h-64 bg-neon-green\/5.*?\/>/g, ''],
            [/\s*<div className="absolute -right-20 bottom-0 w-96 h-96 bg-zinc-800\/10.*?\/>/g, '']
        ]
    },
    {
        name: 'src/components/home/Services.jsx',
        replacements: [
            [/\s*<div className="absolute top-1\/2 left-0 -translate-y-1\/2 w-96 h-96 bg-neon-green\/5.*?\/>/g, ''],
            [/\s*<div className="absolute bottom-0 right-0 w-96 h-96 bg-zinc-800\/10.*?\/>/g, '']
        ]
    },
    {
        name: 'src/components/home/CreatorsSection.jsx',
        replacements: [
            [/\s*<div className="absolute top-1\/4 right-0 w-96 h-96 bg-neon-green\/5.*?\/>/g, ''],
            [/\s*<div className="absolute bottom-1\/4 left-0 w-96 h-96 bg-white\/3.*?\/>/g, '']
        ]
    },
    {
        name: 'src/components/home/FeaturedBlog.jsx',
        replacements: [
            [/\s*<div className="absolute top-1\/2 right-0 w-\[400px\] h-\[400px\] bg-neon-green\/\[0.02\].*?\/>/g, ''],
            [/\s*<div className="absolute bottom-0 left-0 w-\[300px\] h-\[300px\] bg-zinc-800\/10.*?\/>/g, '']
        ]
    },
    {
        name: 'src/components/home/About.jsx',
        replacements: [
            [/\s*<div className="absolute top-1\/4 left-1\/4 w-\[40%\] h-\[40%\] bg-neon-green\/5.*?\/>/g, ''],
            [/\s*<div className="absolute bottom-1\/4 right-1\/4 w-\[40%\] h-\[40%\] bg-zinc-800\/10.*?\/>/g, '']
        ]
    },
    {
        name: 'src/components/home/CallToAction.jsx',
        replacements: [
            [/\s*<div className="absolute top-1\/2 left-1\/2 -translate-x-1\/2 -translate-y-1\/2 w-full h-full bg-gradient-radial from-neon-green\/10 via-transparent to-transparent opacity-50 animate-pulse" \/>/g, '']
        ]
    },
    {
        name: 'src/components/Navbar.jsx',
        replacements: [
            [/\s*<motion.div\s*initial=\{\{\s*x:\s*'-100%'\s*\}\}\s*animate=\{\{\s*x:\s*'100%'\s*\}\}\s*transition=\{\{\s*duration:\s*3,\s*repeat:\s*Infinity,\s*ease:\s*"linear"\s*\}\}\s*className="absolute bottom-0 left-0 w-full h-\[1px\] bg-gradient-to-r from-transparent via-neon-green to-transparent opacity-50"\s*\/>/g, ''],
            [/shadow-\[0_0_8px_rgba\(239,68,68,0.5\)\]/g, ''],
            [/animate-pulse/g, ''],
            [/shadow-\[0_0_8px_#00E6A8\]/g, '']
        ]
    },
    {
        name: 'src/pages/CreatorLanding.jsx',
        replacements: [
            // Background glows
            [/\s*<div className="absolute top-\[-10%\] left-\[-10%\] w-\[60%\] h-\[60%\] bg-neon-green\/10 rounded-full blur-\[160px\] animate-pulse" \/>/g, ''],
            [/\s*<div className="absolute bottom-\[-10%\] right-\[-10%\] w-\[60%\] h-\[60%\] bg-zinc-800\/10 rounded-full blur-\[160px\] animate-pulse delay-700" \/>/g, ''],
            [/\s*<div className="absolute w-80 h-80 bg-neon-green\/20 rounded-full blur-\[140px\] pointer-events-none animate-pulse" \/>/g, ''],
            [/\s*<div className="absolute -top-40 -right-40 w-96 h-96 bg-neon-green\/30 rounded-full blur-\[150px\] pointer-events-none animate-pulse" \/>/g, ''],
            [/\s*<div className="absolute -bottom-40 -left-40 w-96 h-96 bg-neon-green\/30 rounded-full blur-\[150px\] pointer-events-none animate-pulse delay-700" \/>/g, ''],
            [/\s*<div className="absolute top-0 right-0 w-32 h-32 bg-neon-green\/5 blur-\[50px\] pointer-events-none group-hover:bg-neon-green\/10 transition-colors" \/>/g, ''],
            // shadow glows
            [/shadow-\[0_0_20px_rgba\(255,255,255,0.3\)\]/g, 'shadow-lg'],
            [/shadow-\[0_0_20px_rgba\(255,255,255,0.15\)\]/g, 'shadow-md'],
            [/shadow-\[0_0_50px_rgba\(255,255,255,0.2\)\]/g, 'shadow-lg'],
            [/hover:shadow-\[0_0_50px_rgba\(57,255,20,0.4\)\]/g, 'hover:shadow-xl'],
            [/shadow-\[0_0_100px_rgba\(57,255,20,0.2\)\]/g, ''],
            [/shadow-\[0_0_30px_rgba\(57,255,20,0.3\)\]/g, 'shadow-xl'],
            [/shadow-\[0_0_10px_#39ff14\]/g, ''],
            [/animate-pulse/g, ''],
            [/bg-gradient-to-r from-neon-green\/20 via-neon-green\/20 to-purple-500\/20/g, 'bg-zinc-950/65']
        ]
    },
    {
        name: 'src/pages/CreatorDashboard.jsx',
        replacements: [
            // Background glows
            [/\s*<div className="absolute top-\[-10%\] left-\[-10%\] w-\[60%\] h-\[60%\] bg-neon-green\/\[0.02\] rounded-full blur-\[150px\] animate-pulse" \/>/g, ''],
            [/\s*<div className="absolute bottom-\[-10%\] right-\[-5%\] w-\[50%\] h-\[50%\] bg-zinc-800\/10 rounded-full blur-\[150px\] animate-pulse delay-700" \/>/g, ''],
            [/\s*<div className="absolute top-0 left-0 w-80 h-80 bg-neon-green\/\[0.02\] blur-\[120px\] pointer-events-none" \/>/g, ''],
            [/\s*<div className="absolute bottom-0 right-0 w-64 h-64 bg-zinc-800\/10 blur-\[100px\] pointer-events-none" \/>/g, ''],
            [/\s*<div className="absolute top-0 right-0 w-32 h-32 bg-neon-green\/\[0.01\] blur-3xl pointer-events-none" \/>/g, ''],
            [/\s*<div className="absolute top-0 right-0 w-64 h-64 bg-neon-green\/5 blur-\[100px\] -mr-32 -mt-32 pointer-events-none" \/>/g, ''],
            [/\s*<div className="absolute top-0 right-0 w-64 h-64 bg-neon-green\/5 blur-\[100px\] pointer-events-none" \/>/g, ''],
            [/\s*<div className="absolute bottom-0 right-0 w-48 h-48 bg-neon-green\/5 blur-\[100px\] pointer-events-none" \/>/g, ''],
            // shadow glows
            [/shadow-\[0_0_20px_rgba\(255,255,255,0.3\)\]/g, 'shadow-lg'],
            [/shadow-\[0_0_15px_rgba\(57,255,20,0.4\)\]/g, ''],
            [/shadow-\[0_0_15px_rgba\(234,179,8,0.4\)\]/g, ''],
            [/shadow-\[0_0_20px_rgba\(57,255,20,0.15\)\]/g, 'shadow-md'],
            [/shadow-\[0_0_40px_rgba\(57,255,20,0.1\)\]/g, ''],
            [/shadow-\[0_4px_20px_rgba\(57,255,20,0.4\)\]/g, ''],
            [/shadow-\[0_0_10px_#39ff14\]/g, ''],
            [/shadow-\[0_0_10px_rgba\(57,255,20,0.3\)\]/g, ''],
            [/animate-pulse/g, ''],
            [/animate-ping/g, ''],
            [/blur opacity-25/g, '']
        ]
    }
];

files.forEach(f => {
    const filePath = path.resolve(f.name);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        f.replacements.forEach(r => {
            content = content.replace(r[0], r[1]);
        });
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Removed glows from ${f.name}`);
    } else {
        console.log(`File not found: ${f.name}`);
    }
});
