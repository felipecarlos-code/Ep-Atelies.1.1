const fs = require('fs');
let code = fs.readFileSync('./src/components/TurmaManager.tsx', 'utf8');

code = code.replace(
  /if \(\/\[0-9\]\?EC\[0-9\]\?\/\.test\(upper\)\) return 'Engenharia de Computação';\n\s*if \(\/\[0-9\]\?ES\[0-9\]\?\/\.test\(upper\)\) return 'Engenharia de Software';\n\s*if \(\/\[0-9\]\?SI\[0-9\]\?\/\.test\(upper\)\) return 'Sistemas de Informação';\n\s*if \(\/\[0-9\]\?CC\[0-9\]\?\/\.test\(upper\)\) return 'Ciência da Computação';/g,
  `if (/(^|[^a-zA-Z])[0-9]*EC[0-9]*([^a-zA-Z]|$)/.test(upper)) return 'Engenharia de Computação';
  if (/(^|[^a-zA-Z])[0-9]*ES[0-9]*([^a-zA-Z]|$)/.test(upper)) return 'Engenharia de Software';
  if (/(^|[^a-zA-Z])[0-9]*SI[0-9]*([^a-zA-Z]|$)/.test(upper)) return 'Sistemas de Informação';
  if (/(^|[^a-zA-Z])[0-9]*CC[0-9]*([^a-zA-Z]|$)/.test(upper)) return 'Ciência da Computação';`
);

fs.writeFileSync('./src/components/TurmaManager.tsx', code);
