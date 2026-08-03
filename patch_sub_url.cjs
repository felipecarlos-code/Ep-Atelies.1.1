const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(
  /const subUrl = \`https:\/\/www\.googleapis\.com\/drive\/v3\/files\?q=\$\{encodeURIComponent\(subQuery\)\}&fields=files\(id\)&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000\`;/g,
  "const subUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(subQuery)}&fields=files(id)${corporaParams}&pageSize=1000`;"
);

fs.writeFileSync('./api/app.ts', code);
