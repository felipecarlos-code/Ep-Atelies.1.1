const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

code = code.replace(
  /\` - \$\{alloc\.atelieBlocks\.join\('\/'\)\}\`/,
  `\` - \${alloc.atelieBlocks.map((b: any) => String(b).toUpperCase().replace('BLOCO', 'BL.').trim()).join('/')}\``
);

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Replaced block format in V3');
