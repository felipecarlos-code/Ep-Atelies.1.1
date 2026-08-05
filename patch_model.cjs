const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

// replace only in the document analysis route
code = code.replace(
  /model: "gemini-3\.6-flash",\n\s*contents: contents/g,
  'model: "gemini-1.5-flash-8b",\n        contents: contents'
);

fs.writeFileSync('./api/app.ts', code);
console.log("Model patched.");
