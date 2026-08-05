const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentReport.tsx', 'utf8');

code = code.replace(
  /const years = Array\.from\(new Set\(reportData\.map\(r => r\.ano\)\.filter\(a => a !== 'N\/C'\)\)\)\.sort\(\);/g,
  `const years = Array.from(new Set([
    ...Array.from({ length: new Date().getFullYear() - 2014 + 2 }, (_, i) => (2014 + i).toString()),
    ...reportData.map(r => r.ano).filter(a => a !== 'N/C')
  ])).sort((a, b) => b.localeCompare(a));`
);

fs.writeFileSync('./src/components/DocumentReport.tsx', code);
