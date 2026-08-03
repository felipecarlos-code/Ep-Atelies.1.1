const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(
  `const parentConditions = folderIdsToSearch.map(id => \`'\${id}' in parents\`).join(' or ');`,
  `console.log("Subfolders found:", folderIdsToSearch.length);\n          const parentConditions = folderIdsToSearch.map(id => \`'\${id}' in parents\`).join(' or ');`
);

fs.writeFileSync('./api/app.ts', code);
