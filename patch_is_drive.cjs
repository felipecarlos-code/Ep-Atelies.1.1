const fs = require('fs');
let code = fs.readFileSync('./src/components/FolderBrowserModal.tsx', 'utf8');

code = code.replace(
  `onSelect: (folderId: string, folderName: string) => void;`,
  `onSelect: (folderId: string, folderName: string, isDrive?: boolean) => void;`
);

code = code.replace(
  `onSelect(currentFolder.id, currentFolder.name);`,
  `onSelect(currentFolder.id, currentFolder.name, currentFolder.isDrive);`
);

fs.writeFileSync('./src/components/FolderBrowserModal.tsx', code);

let code2 = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code2 = code2.replace(
  `const [folderName, setFolderName] = useState('');`,
  `const [folderName, setFolderName] = useState('');\n  const [isDriveSelected, setIsDriveSelected] = useState(false);`
);

code2 = code2.replace(
  `folderId: folderId.trim()`,
  `folderId: folderId.trim(),\n          isDrive: isDriveSelected`
);

code2 = code2.replace(
  `onSelect={(id, name) => {`,
  `onSelect={(id, name, isDrive) => {`
);

code2 = code2.replace(
  `setFolderName(name);`,
  `setFolderName(name);\n            setIsDriveSelected(isDrive || false);`
);

code2 = code2.replace(
  `onClick={() => { setFolderId(''); setFolderName(''); }}`,
  `onClick={() => { setFolderId(''); setFolderName(''); setIsDriveSelected(false); }}`
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code2);
