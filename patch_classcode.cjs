const fs = require('fs');
let code = fs.readFileSync('./src/components/TurmaManager.tsx', 'utf8');

code = code.replace(
  /export function cleanOrDetectCourse\(courseRaw\?: string, courseModuleRaw\?: string, nameRaw\?: string\): string \{/g,
  `export function cleanOrDetectCourse(courseRaw?: string, courseModuleRaw?: string, nameRaw?: string, classCodeRaw?: string): string {`
);

code = code.replace(
  /const detFromName = autoDetectCourse\(n\);\n\s*if \(detFromName\) return detFromName;/g,
  `const detFromName = autoDetectCourse(n);
  if (detFromName) return detFromName;

  const cc = String(classCodeRaw || '').trim();
  const detFromClassCode = autoDetectCourse(cc);
  if (detFromClassCode) return detFromClassCode;`
);

fs.writeFileSync('./src/components/TurmaManager.tsx', code);
