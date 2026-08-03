const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

const targetFolders = `        let query = \`trashed = false and mimeType = 'application/vnd.google-apps.folder'\`;
        let listUrl = "";
        if (isDrive) {
          listUrl = \`https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(query)}&fields=files(id,name,driveId)&corpora=drive&driveId=\${parentId}&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000\`;
        } else {
          query += \` and '\${parentId}' in parents\`;
          listUrl = \`https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(query)}&fields=files(id,name,driveId)&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000\`;
        }`;

const newTargetFolders = `        let query = \`trashed = false and mimeType = 'application/vnd.google-apps.folder'\`;
        query += \` and '\${parentId}' in parents\`;
        let listUrl = "";
        if (isDrive) {
          listUrl = \`https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(query)}&fields=files(id,name,driveId)&corpora=drive&driveId=\${parentId}&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000\`;
        } else {
          listUrl = \`https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(query)}&fields=files(id,name,driveId)&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000\`;
        }`;

code = code.replace(targetFolders, newTargetFolders);
fs.writeFileSync('./api/app.ts', code);
