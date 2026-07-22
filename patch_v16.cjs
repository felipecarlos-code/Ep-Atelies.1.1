const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

// Replace height from h-[185px] to min-h-[210px]
code = code.replace(/className="flex gap-8 items-stretch h-\[185px\]"/g, 'className="flex gap-8 items-stretch min-h-[210px]"');

// Fix the subtitle regex parsing again
const targetRegex = /const classCodeMatch = rawSubtitle\.match\(\/\^\(\?:\[1-4\]\[a-zA-Z\]\{2,5\}\\d\+\)\\s\*\(\?:-\\s\*\(\.\*\)\)\?\$\/i\);/;
const replacementRegex = "const classCodeMatch = rawSubtitle.match(/^(?:[1-4]?[a-zA-Z]{2,5}\\d+)\\s*(?:-\\s*(.*))?$/i);";

code = code.replace(targetRegex, replacementRegex);

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Patched height and regex in V3');
