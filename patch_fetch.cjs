const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  `      const response = await fetch('/api/drive/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token, folderId })
      });`,
  `      const response = await fetch(\`https://www.googleapis.com/drive/v3/files?q='\${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,modifiedTime,webViewLink)&pageSize=1000\`, { headers: { Authorization: \`Bearer \${token}\` } });`
);

code = code.replace(
  `          const folderRes = await fetch('/api/drive/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: token, folderId: subfolder.id })
          });`,
  `          const folderRes = await fetch(\`https://www.googleapis.com/drive/v3/files?q='\${subfolder.id}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,modifiedTime,webViewLink)&pageSize=1000\`, { headers: { Authorization: \`Bearer \${token}\` } });`
);

code = code.replace(
  `            const ssfRes = await fetch('/api/drive/list', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken: token, folderId: ssf.id })
            });`,
  `            const ssfRes = await fetch(\`https://www.googleapis.com/drive/v3/files?q='\${ssf.id}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,modifiedTime,webViewLink)&pageSize=1000\`, { headers: { Authorization: \`Bearer \${token}\` } });`
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
