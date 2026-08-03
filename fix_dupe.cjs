const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentReport.tsx', 'utf8');

code = code.replace(/      const partner = partners.find\(p => p.id === turma.partnerId\);\n      const partner = partners.find\(p => p.id === turma.partnerId\);/g, 
`      const partner = partners.find(p => p.id === turma.partnerId);`);

fs.writeFileSync('./src/components/DocumentReport.tsx', code);
