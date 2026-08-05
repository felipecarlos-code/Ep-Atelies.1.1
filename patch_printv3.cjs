const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

code = code.replace(
  /\{alloc\.academicYear\}° ANO - MÓDULO \{\(\(\) => \{([\s\S]*?)return modNum\.toString\(\)\.padStart\(2, '0'\);\n\s*\}\)\(\)\} - \{\(\(\) => \{([\s\S]*?)return cleaned;\n\s*\}\)\(\)\}/g,
  `{alloc.academicYear}° ANO - {(() => {
                          if (alloc.academicYear !== '1' && courseStr) {
                            return \`\${courseStr.toUpperCase()} - \`;
                          }
                          return '';
                        })()}MÓDULO {(() => {$1return modNum.toString().padStart(2, '0');
                        })()} - {(() => {$2
                          // Clean up if it was previously duplicated in subtitle
                          if (alloc.academicYear !== '1' && courseStr) {
                            const prefix = \`\${courseStr.toUpperCase()} - \`;
                            const suffix = \` - \${courseStr.toUpperCase()}\`;
                            if (cleaned.toUpperCase().startsWith(prefix.toUpperCase())) {
                              cleaned = cleaned.substring(prefix.length).trim();
                            }
                            if (cleaned.toUpperCase().endsWith(suffix.toUpperCase())) {
                              cleaned = cleaned.substring(0, cleaned.length - suffix.length).trim();
                            }
                          }

                          return cleaned;
                        })()}`
);

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
