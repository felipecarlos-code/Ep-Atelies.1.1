const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  `                                  onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent input blur
                                    setAssociationId(t.id);
                                    setTurmaSearchTerm(\`\${t.name} \${t.projectTitle ? \`- \${t.projectTitle}\` : ''}\`);
                                    setIsTurmaDropdownOpen(false);
                                  }}`,
  `                                  onMouseDown={(e) => { e.preventDefault(); }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setAssociationId(t.id);
                                    setTurmaSearchTerm(\`\${t.name} \${t.projectTitle ? \`- \${t.projectTitle}\` : ''}\`);
                                    setIsTurmaDropdownOpen(false);
                                  }}`
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
