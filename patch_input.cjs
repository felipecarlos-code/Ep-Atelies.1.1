const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  `                            onChange={(e) => {
                              setTurmaSearchTerm(e.target.value);
                              setAssociationId(''); setTurmaSearchTerm('');
                              setIsTurmaDropdownOpen(true);
                            }}`,
  `                            onChange={(e) => {
                              setTurmaSearchTerm(e.target.value);
                              setAssociationId('');
                              setIsTurmaDropdownOpen(true);
                            }}`
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
