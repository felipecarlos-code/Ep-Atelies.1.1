const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(
  /&supportsAllDrives=true&includeItemsFromAllDrives=true/g,
  "&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true"
);

fs.writeFileSync('./api/app.ts', code);
