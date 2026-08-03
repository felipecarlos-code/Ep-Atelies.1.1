const fs = require('fs');
let code = fs.readFileSync('./src/components/FolderBrowserModal.tsx', 'utf8');

code = code.replace(
  /fetchFolders\(currentFolder\.id\);/,
  "fetchFolders(currentFolder.id, currentFolder.isDrive);"
);
code = code.replace(
  /const fetchFolders = async \(parentId: string\) => {/,
  "const fetchFolders = async (parentId: string, isDrive?: boolean) => {"
);
code = code.replace(
  /body: JSON\.stringify\({ accessToken: token, parentId }\)/,
  "body: JSON.stringify({ accessToken: token, parentId, isDrive })"
);

fs.writeFileSync('./src/components/FolderBrowserModal.tsx', code);
