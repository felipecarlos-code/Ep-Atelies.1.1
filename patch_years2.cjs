const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentReport.tsx', 'utf8');

code = code.replace(
  /new Date\(\)\.getFullYear\(\) - 2014 \+ 2/g,
  `new Date().getFullYear() - 2024 + 2`
);

code = code.replace(
  /\(2014 \+ i\)/g,
  `(2024 + i)`
);

fs.writeFileSync('./src/components/DocumentReport.tsx', code);
