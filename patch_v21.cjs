const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

// increase card height
code = code.replace(/min-h-\[210px\]/g, 'min-h-[230px]');

// increase line clamp from 3 to 4
code = code.replace(/line-clamp-3/g, 'line-clamp-4');

// move cronograma up further
code = code.replace(/<div className="px-12 mt-0 mb-8 shrink-0">/g, '<div className="px-12 -mt-4 mb-8 shrink-0">');

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Patched V3 cards and layout');
