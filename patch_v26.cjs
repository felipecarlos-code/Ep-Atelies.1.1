const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

// I will make the description slightly smaller to fit more text without growing the card.
code = code.replace(/text-\[16px\] leading-relaxed line-clamp-3/g, 'text-[15px] leading-relaxed line-clamp-4');

// I will also make the header of the card slightly tighter
code = code.replace(/px-5 py-2.5/g, 'px-5 py-2');

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Patched V3 inner text sizes');
