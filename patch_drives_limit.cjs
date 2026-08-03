const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(
  /"https:\/\/www.googleapis.com\/drive\/v3\/drives\?pageSize=1000"/g,
  '"https://www.googleapis.com/drive/v3/drives?pageSize=100"'
);

fs.writeFileSync('./api/app.ts', code);
