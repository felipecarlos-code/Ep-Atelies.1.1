const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

const classCodeLogic = `const rawSubtitle = alloc.subtitle || alloc.turma?.courseModule || alloc.turma?.course || '';
                          const classCodeMatch = rawSubtitle.match(/^(?:[1-4][a-zA-Z]{2,5}\\d+)\\s*(?:-\\s*(.*))?$/i);
                          let cleaned = (classCodeMatch && classCodeMatch[1]) ? classCodeMatch[1] : rawSubtitle;
                          cleaned = cleaned.replace(/\\s*-\\s*[1-4]º\\s*[a-zA-Z]*$/i, '').trim();
                          return cleaned;`;

// I will replace the inline function body in V3.

const cardRegex = /const rawSubtitle = alloc\.subtitle \|\| alloc\.turma\?\.courseModule \|\| alloc\.turma\?\.course \|\| '';[\s\S]*?return rawSubtitle;/;

code = code.replace(cardRegex, classCodeLogic);

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Replaced regex in V3');
