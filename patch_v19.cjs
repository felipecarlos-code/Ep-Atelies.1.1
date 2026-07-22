const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

code = code.replace(
  /<div className="px-12 mt-8 mb-12 shrink-0">/g,
  '<div className="px-12 mt-2 mb-12 shrink-0">'
);

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Moved schedule up in V3');
