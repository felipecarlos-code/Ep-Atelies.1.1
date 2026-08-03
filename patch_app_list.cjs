const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

const target = `  app.post("/api/drive/list", async (req, res) => {
    const { accessToken, searchQuery, folderId } = req.body;`;

const newTarget = `  app.post("/api/drive/list", async (req, res) => {
    const { accessToken, searchQuery, folderId, isDrive } = req.body;`;

code = code.replace(target, newTarget);

const queryTarget = `      // Build Google Drive files.list query
      let query = "trashed = false";
      if (folderId) {
        query += \` and '\${folderId}' in parents\`;
      }`;

const newQueryTarget = `      // Build Google Drive files.list query
      let query = "trashed = false";
      let corporaParams = "&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true";
      
      if (folderId) {
        if (isDrive) {
          corporaParams = \`&corpora=drive&driveId=\${folderId}&supportsAllDrives=true&includeItemsFromAllDrives=true\`;
        } else {
          query += \` and '\${folderId}' in parents\`;
        }
      }`;

code = code.replace(queryTarget, newQueryTarget);

const urlTarget = `const listUrl = \`https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime,webViewLink,parents)&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=50\`;`;
const newUrlTarget = `const listUrl = \`https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime,webViewLink,parents)\${corporaParams}&pageSize=50\`;`;

code = code.replace(urlTarget, newUrlTarget);

fs.writeFileSync('./api/app.ts', code);
