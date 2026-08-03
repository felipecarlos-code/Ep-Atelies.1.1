const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentReport.tsx', 'utf8');

code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');
code = code.replace(/\\}/g, '}');
code = code.replace(/\\{/g, '{');

fs.writeFileSync('./src/components/DocumentReport.tsx', code);
