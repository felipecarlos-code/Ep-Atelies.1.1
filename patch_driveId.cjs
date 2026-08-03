const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

const targetFolders = `        if (isDrive) {
          listUrl = \`https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(query)}&fields=files(id,name)&corpora=drive&driveId=\${parentId}&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000\`;
        } else {
          query += \` and '\${parentId}' in parents\`;
          listUrl = \`https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(query)}&fields=files(id,name)&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000\`;
        }`;

const newTargetFolders = `        if (isDrive) {
          listUrl = \`https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(query)}&fields=files(id,name,driveId)&corpora=drive&driveId=\${parentId}&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000\`;
        } else {
          query += \` and '\${parentId}' in parents\`;
          listUrl = \`https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(query)}&fields=files(id,name,driveId)&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000\`;
        }`;

code = code.replace(targetFolders, newTargetFolders);

const targetReturn = `        const returnedFolders = (data.files || []).map((f) => ({ ...f, isDrive: false }));`;
const newTargetReturn = `        const returnedFolders = (data.files || []).map((f) => ({ ...f, isDrive: false, driveId: f.driveId || (isDrive ? parentId : null) }));`;
code = code.replace(targetReturn, newTargetReturn);

fs.writeFileSync('./api/app.ts', code);
