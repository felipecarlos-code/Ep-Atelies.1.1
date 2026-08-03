const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(/gemini-2\.5-flash/g, 'gemini-1.5-flash');

fs.writeFileSync('./api/app.ts', code);
