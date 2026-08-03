const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentReport.tsx', 'utf8');

const replacement = `  const validStagesClean = [
    'concluidos', 
    'envio de prototipos', 
    'projeto', 
    'pre projeto', 
    'pendencia de projeto'
  ];

  // Map data
  const reportData = turmas
    .filter(turma => {
      const ds = (turma.dealstage || '').normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().trim();
      return validStagesClean.includes(ds);
    })
    .map(turma => {
      const partner = partners.find(p => p.id === turma.partnerId);`;

code = code.replace(/  const validStages = \[[^\]]+\];\n\n  \/\/ Map data\n  const reportData = turmas\n    \.filter\(turma => validStages\.includes\(turma\.dealstage \|\| ''\)\)\n    \.map\(turma => \{/s, replacement);

fs.writeFileSync('./src/components/DocumentReport.tsx', code);
