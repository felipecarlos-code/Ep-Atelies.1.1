const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

code = code.replace(/h-\[190px\]/g, 'min-h-[190px] h-auto');
code = code.replace(/text-\[15px\] leading-relaxed line-clamp-4/g, 'text-[14px] leading-snug line-clamp-5');

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Fixed height and text size');
