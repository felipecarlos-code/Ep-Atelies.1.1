const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentReport.tsx', 'utf8');

code = code.replace(
  /\.filter\(turma => \{\n\s*const ds = \(turma\.dealstage \|\| ''\)\.normalize\("NFD"\)\.replace\(\/\[\\u0300-\\u036f\]\/g, ""\)\.toLowerCase\(\)\.trim\(\);\n\s*return validStagesClean\.includes\(ds\);\n\s*\}\)/g,
  ''
);

fs.writeFileSync('./src/components/DocumentReport.tsx', code);
