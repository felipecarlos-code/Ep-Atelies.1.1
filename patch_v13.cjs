const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

code = code.replace(
  /const classCodeMatch = rawSubtitle\.match\(\/\^\(\?:\[1-4\]\[a-z\]\{2,5\}d\+\)s\*\(\?:-s\*\(\.\*\)\)\?\$\/i\);/,
  "const classCodeMatch = rawSubtitle.match(/^(?:[1-4][a-zA-Z]{2,5}\\d+)\\s*(?:-\\s*(.*))?$/i);"
);

// We should also replace the earlier BoletimEP issue if it's there? Wait, the user shared a print screen which says "1º ANO - MÓD. 1AMD3 - Lógica para predição com Inteligência Artificial - 1º Ano"
// That implies the BoletimEP (web view) is also rendering this incorrectly. Or it's BoletimPrintV3 rendering it.
// The image shows the Web View of BoletimEP.tsx because it has the green boxes for "ATELIÊ 09/11", and "1º ANO - MÓD. 1AMD3 - Lógica..."

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Replaced regex in V3');
