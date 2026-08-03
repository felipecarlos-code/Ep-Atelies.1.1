const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(
  `const { accessToken, searchQuery, folderId, isDrive } = req.body;`,
  `const { accessToken, searchQuery, folderId, isDrive, driveId } = req.body;`
);

const oldIf = `      if (folderId) {
        if (isDrive) {
          corporaParams = \`&corpora=drive&driveId=\${folderId}&supportsAllDrives=true&includeItemsFromAllDrives=true\`;
        } else {
          // Fetch subfolders to allow searching inside them`;

const newIf = `      if (folderId) {
        if (isDrive) {
          corporaParams = \`&corpora=drive&driveId=\${folderId}&supportsAllDrives=true&includeItemsFromAllDrives=true\`;
        } else if (driveId) {
          corporaParams = \`&corpora=drive&driveId=\${driveId}&supportsAllDrives=true&includeItemsFromAllDrives=true\`;
        }

        if (!isDrive) {
          // Fetch subfolders to allow searching inside them`;

code = code.replace(oldIf, newIf);
fs.writeFileSync('./api/app.ts', code);
