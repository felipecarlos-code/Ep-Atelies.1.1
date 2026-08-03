const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentReport.tsx', 'utf8');

const target = `  // Map data
  const reportData = turmas.map(turma => {
    const partner = partners.find(p => p.id === turma.partnerId);`;

const replacement = `  const validStages = [
    'Concluídos', 
    'Envio de prototipos', 
    'projeto', 
    'pré Projeto', 
    'Pendencia de projeto'
  ];

  // Map data
  const reportData = turmas
    .filter(turma => validStages.includes(turma.dealstage || ''))
    .map(turma => {
      const partner = partners.find(p => p.id === turma.partnerId);`;

code = code.replace(target, replacement);

fs.writeFileSync('./src/components/DocumentReport.tsx', code);
