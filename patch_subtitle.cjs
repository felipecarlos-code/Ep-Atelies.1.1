const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimEP.tsx', 'utf8');

code = code.replace(
  /subtitle = \`\$\{subtitle\} - \$\{detectedCourse\.toUpperCase\(\)\}\`;/g,
  `subtitle = \`\$\{detectedCourse.toUpperCase()\} - \$\{subtitle\}\`;`
);

fs.writeFileSync('./src/components/BoletimEP.tsx', code);
