const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimEP.tsx', 'utf8');

const targetRegex = /const classCodeMatch = subtitle\.match\(\/\^\(\?:\[1-4\]\[a-zA-Z\]\{2,5\}\\d\+\)\\s\*\(\?:-\\s\*\(\.\*\)\)\?\$\/i\);/;
const replacementRegex = "const classCodeMatch = subtitle.match(/^(?:[1-4]?[a-zA-Z]{2,5}\\d+)\\s*(?:-\\s*(.*))?$/i);";

code = code.replace(targetRegex, replacementRegex);

fs.writeFileSync('./src/components/BoletimEP.tsx', code);
console.log('Patched regex in EP');
