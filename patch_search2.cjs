const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(
  /'Convenio' or name contains 'Abertura'\)"/g,
  "'Convenio' or name contains 'Abertura' or name contains 'Aditivo')\""
);

fs.writeFileSync('./api/app.ts', code);
