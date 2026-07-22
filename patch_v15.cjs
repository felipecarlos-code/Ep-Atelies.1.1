const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimEP.tsx', 'utf8');

const replacement = `
    // Clean up class code prefix from subtitle (e.g., "1AMD3 - ") and year suffix (e.g. "- 1º Ano")
    if (subtitle) {
      const classCodeMatch = subtitle.match(/^(?:[1-4][a-zA-Z]{2,5}\\d+)\\s*(?:-\\s*(.*))?$/i);
      let cleaned = (classCodeMatch && classCodeMatch[1]) ? classCodeMatch[1] : subtitle;
      cleaned = cleaned.replace(/\\s*-\\s*[1-4]º\\s*[a-zA-Z]*$/i, '').trim();
      subtitle = cleaned || subtitle;
    }

    return { title, subtitle, academicYear };
`;

code = code.replace(/return \{ title, subtitle, academicYear \};/, replacement);

fs.writeFileSync('./src/components/BoletimEP.tsx', code);
console.log('Patched BoletimEP subtitle');
