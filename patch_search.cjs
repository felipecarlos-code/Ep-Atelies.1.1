const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(
  /const MAX_SUBFOLDERS = 40;/g,
  "const MAX_SUBFOLDERS = 500;"
);

code = code.replace(
  /pageSize=50/g,
  "pageSize=1000"
);

fs.writeFileSync('./api/app.ts', code);
