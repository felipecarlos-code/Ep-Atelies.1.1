const fs = require('fs');
let code = fs.readFileSync('./src/components/TurmaManager.tsx', 'utf8');

code = code.replace(
  /SIMD: 'Sistemas da Informação',/g,
  "SIMD: 'Sistemas de Informação',"
);

fs.writeFileSync('./src/components/TurmaManager.tsx', code);
