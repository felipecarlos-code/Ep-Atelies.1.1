const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(/model: "gemini-3\.5-flash-lite"/g, 'model: "gemini-2.5-flash"');

fs.writeFileSync('./api/app.ts', code);
console.log("Model patched to gemini-2.5-flash.");
