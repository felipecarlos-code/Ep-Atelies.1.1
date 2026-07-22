const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

// I will make it mt-0 just to be sure it goes up nicely without colliding.
code = code.replace(
  /<div className="px-12 mt-2 mb-12 shrink-0">/g,
  '<div className="px-12 mt-0 mb-8 shrink-0">'
);

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Moved schedule up in V3 even more');
