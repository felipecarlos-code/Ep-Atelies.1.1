const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

const target = `      if (folderId) {
        if (isDrive) {
          corporaParams = \`&corpora=drive&driveId=\${folderId}&supportsAllDrives=true&includeItemsFromAllDrives=true\`;
        } else {
          query += \` and '\${folderId}' in parents\`;
        }
      }`;

const newTarget = `      if (folderId) {
        if (isDrive) {
          corporaParams = \`&corpora=drive&driveId=\${folderId}&supportsAllDrives=true&includeItemsFromAllDrives=true\`;
        } else {
          // Fetch subfolders to allow searching inside them
          let folderIdsToSearch = [folderId];
          let queue = [folderId];
          let fetchedCount = 0;
          const MAX_SUBFOLDERS = 40; // Prevent infinite/too long loops
          
          while (queue.length > 0 && fetchedCount < MAX_SUBFOLDERS) {
            const currentId = queue.shift();
            const subQuery = \`trashed = false and mimeType = 'application/vnd.google-apps.folder' and '\${currentId}' in parents\`;
            const subUrl = \`https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(subQuery)}&fields=files(id)&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=50\`;
            
            try {
              const subRes = await fetch(subUrl, {
                headers: { Authorization: \`Bearer \${accessToken}\` }
              });
              const subData = await subRes.json();
              if (subData.files && subData.files.length > 0) {
                for (const f of subData.files) {
                  if (fetchedCount < MAX_SUBFOLDERS) {
                    folderIdsToSearch.push(f.id);
                    queue.push(f.id);
                    fetchedCount++;
                  }
                }
              }
            } catch (e) {
              console.error("[Drive Subfolder fetch error]", e);
              break;
            }
          }
          
          const parentConditions = folderIdsToSearch.map(id => \`'\${id}' in parents\`).join(' or ');
          query += \` and (\${parentConditions})\`;
        }
      }`;

if (code.includes(target)) {
  code = code.replace(target, newTarget);
  fs.writeFileSync('./api/app.ts', code);
  console.log("Patched api/app.ts successfully.");
} else {
  console.log("Could not find target to replace.");
}
