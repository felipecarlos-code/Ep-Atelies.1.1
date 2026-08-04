const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  `              const matchTurma = turmas.find(t => {
                return (partnerName && t.name.toLowerCase().includes(partnerName.toLowerCase())) || 
                       (t.projectTitle && subfolder.name.toLowerCase().includes(t.projectTitle.toLowerCase())) ||
                       subfolder.name.toLowerCase().includes(t.name.toLowerCase());
              });`,
  `              const matchTurma = turmas.find(t => {
                const sName = (subfolder.name || '').toLowerCase();
                const pName = partnerName.toLowerCase();
                return (partnerName && t.name.toLowerCase().includes(pName)) || 
                       (t.projectTitle && sName.includes(t.projectTitle.toLowerCase())) ||
                       sName.includes(t.name.toLowerCase());
              });`
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
