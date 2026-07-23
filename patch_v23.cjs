const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

code = code.replace(/min-h-\[230px\]/g, 'h-[230px]');

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Patched V3 cards to have fixed height');
