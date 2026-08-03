const fs = require('fs');
let code = fs.readFileSync('./src/components/FolderBrowserModal.tsx', 'utf8');

code = code.replace(
  `  isDrive?: boolean;`,
  `  isDrive?: boolean;\n  driveId?: string;`
);

code = code.replace(
  /onSelect: \(id: string, name: string, isDrive\?: boolean\) => void;/,
  `onSelect: (id: string, name: string, isDrive?: boolean, driveId?: string) => void;`
);

code = code.replace(
  /onSelect\(currentFolder.id, currentFolder.name, currentFolder.isDrive\);/,
  `onSelect(currentFolder.id, currentFolder.name, currentFolder.isDrive, currentFolder.driveId);`
);

fs.writeFileSync('./src/components/FolderBrowserModal.tsx', code);
