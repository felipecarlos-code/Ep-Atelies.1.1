const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

// The 4th occurrence is the one inside the document analysis route
let count = 0;
code = code.replace(/model: "gemini-3\.6-flash"/g, (match) => {
    count++;
    if (count === 4) {
        return 'model: "gemini-3.5-flash-lite"';
    }
    return match;
});

fs.writeFileSync('./api/app.ts', code);
console.log("Patched 4th model to lite.");
