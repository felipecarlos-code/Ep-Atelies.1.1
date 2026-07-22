const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');
const replacement = `    <div id="boletim-v3-container" className="flex flex-col items-center gap-8 bg-slate-100 py-8 print:py-0 print:bg-white print:gap-0">`;
const match = code.replace(/<style>[\s\S]*?<\/style>/, '');
fs.writeFileSync('./src/components/BoletimPrintV3.tsx', match);
console.log('Replaced in V3');
