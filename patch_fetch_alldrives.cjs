const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  /\`https:\/\/www\.googleapis\.com\/drive\/v3\/files\?q='\$\{([^}]+)\}'\+in\+parents\+and\+trashed=false&fields=files\(id,name,mimeType,modifiedTime,webViewLink\)&pageSize=1000\`/g,
  "\`https://www.googleapis.com/drive/v3/files?q='\${$1}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,modifiedTime,webViewLink)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives\`"
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
