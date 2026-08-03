const fs = require('fs');
let code = fs.readFileSync('./src/components/FolderBrowserModal.tsx', 'utf8');

code = code.replace(/\\\$\\{/g, '${');
code = code.replace(/\\`/g, '`');

fs.writeFileSync('./src/components/FolderBrowserModal.tsx', code);
