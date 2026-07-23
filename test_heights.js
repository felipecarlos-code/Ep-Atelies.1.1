const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

code = code.replace(/h-\[185px\]/g, 'h-[190px]');
code = code.replace(/text-\[16px\]/g, 'text-[15px]');
code = code.replace(/line-clamp-3/g, 'line-clamp-4');

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Modified heights');
