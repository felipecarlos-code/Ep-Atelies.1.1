const fs = require('fs');
let code = fs.readFileSync('./src/types.ts', 'utf8');

code = code.replace(
  /  tapiSummary\?: string;/g,
  "  tapiSummary?: string;\n  // Termo de Parceria tracking fields (linked to Negócio)\n  partnershipTermLink?: string;\n  partnershipTermValidity?: string;\n  partnershipTermStatus?: string;\n  partnershipTermSummary?: string;"
);

fs.writeFileSync('./src/types.ts', code);
