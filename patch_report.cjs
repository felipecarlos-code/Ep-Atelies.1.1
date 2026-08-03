const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentReport.tsx', 'utf8');

code = code.replace(
  `      termoStatus: partner?.partnershipTermStatus || 'Pendente',
      termoValidade: partner?.partnershipTermValidity || 'N/C',
      termoLink: partner?.partnershipTermLink || '',`,
  `      termoStatus: turma.partnershipTermStatus || partner?.partnershipTermStatus || 'Pendente',
      termoValidade: turma.partnershipTermValidity || partner?.partnershipTermValidity || 'N/C',
      termoLink: turma.partnershipTermLink || partner?.partnershipTermLink || '',`
);

fs.writeFileSync('./src/components/DocumentReport.tsx', code);
