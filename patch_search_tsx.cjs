const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  `  const [isDriveSelected, setIsDriveSelected] = useState(false);`,
  `  const [isDriveSelected, setIsDriveSelected] = useState(false);\n  const [driveIdSelected, setDriveIdSelected] = useState<string | null>(null);`
);

code = code.replace(
  `isDrive: isDriveSelected`,
  `isDrive: isDriveSelected,\n          driveId: driveIdSelected`
);

code = code.replace(
  `onClick={() => { setFolderId(''); setFolderName(''); setIsDriveSelected(false); }}`,
  `onClick={() => { setFolderId(''); setFolderName(''); setIsDriveSelected(false); setDriveIdSelected(null); }}`
);

code = code.replace(
  `onSelect={(id, name, isDrive) => {`,
  `onSelect={(id, name, isDrive, driveId) => {`
);

code = code.replace(
  `setIsDriveSelected(isDrive || false);`,
  `setIsDriveSelected(isDrive || false);\n            setDriveIdSelected(driveId || null);`
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
