const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(/model: "gemini-[^"]+"/g, 'model: "gemini-3.6-flash"');

fs.writeFileSync('./api/app.ts', code);
console.log("Model patched back to gemini-3.6-flash.");
