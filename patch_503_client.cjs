const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  /if \(analyzeRes\.status === 429 \|\| \(\!analyzeData\.success && \(analyzeData\.error\?\.includes\('cota'\) \|\| analyzeData\.error\?\.includes\('quota'\)\)\)\) \{/g,
  `if (analyzeRes.status === 429 || analyzeRes.status === 503 || (!analyzeData.success && (analyzeData.error?.includes('cota') || analyzeData.error?.includes('quota') || analyzeData.error?.includes('indisponível') || analyzeData.error?.includes('alta demanda')))) {`
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
