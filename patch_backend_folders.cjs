const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

const target = `  app.post("/api/drive/folders", async (req, res) => {
    const { accessToken, parentId } = req.body;
    if (!accessToken) return res.status(400).json({ success: false, error: "Access token required" });

    try {
      if (!parentId || parentId === 'root_drives') {
        // Fetch Shared Drives
        const drivesResponse = await fetch("https://www.googleapis.com/drive/v3/drives?pageSize=100", {
          headers: { Authorization: \`Bearer \${accessToken}\` }
        });
        const drivesData = await drivesResponse.json();
        const sharedDrives = drivesData.drives || [];
        
        const folders = [
          { id: 'root', name: 'Meu Drive (Root)', isDrive: false },
          ...sharedDrives.map((d) => ({ id: d.id, name: d.name + ' (Drive Compartilhado)', isDrive: true }))
        ];
        
        return res.json({ success: true, folders });
      } else {
        const query = \`trashed = false and mimeType = 'application/vnd.google-apps.folder' and '\${parentId}' in parents\`;
        const listUrl = \`https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(query)}&fields=files(id,name)&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000\`;
        
        const response = await fetch(listUrl, {
          headers: { Authorization: \`Bearer \${accessToken}\` }
        });
        const data = await response.json();
        return res.json({ success: true, folders: data.files || [] });
      }
    } catch (err) {
      console.error("[Drive Folders Error]", err);
      return res.status(500).json({ success: false, error: err.message || "Erro desconhecido." });
    }
  });`;

const newTarget = `  app.post("/api/drive/folders", async (req, res) => {
    const { accessToken, parentId, isDrive } = req.body;
    if (!accessToken) return res.status(400).json({ success: false, error: "Access token required" });

    try {
      if (!parentId || parentId === 'root_drives') {
        // Fetch Shared Drives
        const drivesResponse = await fetch("https://www.googleapis.com/drive/v3/drives?pageSize=100", {
          headers: { Authorization: \`Bearer \${accessToken}\` }
        });
        const drivesData = await drivesResponse.json();
        const sharedDrives = drivesData.drives || [];
        
        const folders = [
          { id: 'root', name: 'Meu Drive (Root)', isDrive: false },
          ...sharedDrives.map((d) => ({ id: d.id, name: d.name + ' (Drive Compartilhado)', isDrive: true }))
        ];
        
        return res.json({ success: true, folders });
      } else {
        let query = \`trashed = false and mimeType = 'application/vnd.google-apps.folder'\`;
        let listUrl = "";
        if (isDrive) {
          listUrl = \`https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(query)}&fields=files(id,name)&corpora=drive&driveId=\${parentId}&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000\`;
        } else {
          query += \` and '\${parentId}' in parents\`;
          listUrl = \`https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(query)}&fields=files(id,name)&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000\`;
        }
        
        const response = await fetch(listUrl, {
          headers: { Authorization: \`Bearer \${accessToken}\` }
        });
        const data = await response.json();
        
        // Pass the isDrive flag down to children so that if they open a subfolder of a drive, we know. Wait, if it's a subfolder, it's not a root drive anymore, so we can use 'in parents' and it will work with corpora=allDrives! So we can just map and not set isDrive=true for children.
        const returnedFolders = (data.files || []).map((f) => ({ ...f, isDrive: false }));
        
        return res.json({ success: true, folders: returnedFolders });
      }
    } catch (err) {
      console.error("[Drive Folders Error]", err);
      return res.status(500).json({ success: false, error: err.message || "Erro desconhecido." });
    }
  });`;

code = code.replace(target, newTarget);
fs.writeFileSync('./api/app.ts', code);
