const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimEP.tsx', 'utf8');

code = code.replace(/min-h-\[170px\]/g, 'min-h-[200px]');

fs.writeFileSync('./src/components/BoletimEP.tsx', code);
console.log('Patched height in EP');
