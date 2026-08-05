const fs = require('fs');
let code = fs.readFileSync('./src/components/TurmaManager.tsx', 'utf8');

code = code.replace(
  /if \(\/\\bCC\\b\/\.test\(upper\) \|\| \/\\[CC\\]\/\.test\(upper\)\) return 'Ciência da Computação';/g,
  `if (/\\bCC\\b/.test(upper) || /\\[CC\\]/.test(upper)) return 'Ciência da Computação';
  
  if (/[0-9]?EC[0-9]?/.test(upper)) return 'Engenharia de Computação';
  if (/[0-9]?ES[0-9]?/.test(upper)) return 'Engenharia de Software';
  if (/[0-9]?SI[0-9]?/.test(upper)) return 'Sistemas de Informação';
  if (/[0-9]?CC[0-9]?/.test(upper)) return 'Ciência da Computação';`
);

fs.writeFileSync('./src/components/TurmaManager.tsx', code);
