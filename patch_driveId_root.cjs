const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(
  `{ id: 'root', name: 'Meu Drive (Root)', isDrive: false },`,
  `{ id: 'root', name: 'Meu Drive (Root)', isDrive: false, driveId: null },`
);
code = code.replace(
  `...sharedDrives.map((d) => ({ id: d.id, name: d.name + ' (Drive Compartilhado)', isDrive: true }))`,
  `...sharedDrives.map((d) => ({ id: d.id, name: d.name + ' (Drive Compartilhado)', isDrive: true, driveId: d.id }))`
);

fs.writeFileSync('./api/app.ts', code);
