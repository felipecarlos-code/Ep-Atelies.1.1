const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimEP.tsx', 'utf8');

// 1. Remove the subtitle mutation
code = code.replace(
  /if \(academicYear !== '1'\) \{\n\s*const detectedCourse = cleanOrDetectCourse\(turma\.course, turma\.courseModule, turma\.name, turma\.classCode\);\n\s*if \(detectedCourse && !subtitle\.toUpperCase\(\)\.includes\(detectedCourse\.toUpperCase\(\)\)\) \{\n\s*subtitle = `\$\{detectedCourse\.toUpperCase\(\)\} - \$\{subtitle\}`;\n\s*\}\n\s*\}/g,
  ''
);

// 2. Add back the Curso badges
// Find the first occurrence (which had animate-pulse-subtle and py-0.5)
let matchCount = 0;
code = code.replace(
  /\{seg\.name\}\n\s*<\/span>\n\s*<\/div>/g,
  (match) => {
    matchCount++;
    const badge = `
                          {alloc.turma && alloc.academicYear !== '1' && (
                            <span className="inline-block bg-[#90a5e5]/10 border border-[#90a5e5]/20 text-[#2e2640] text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">
                              Curso: {cleanOrDetectCourse(alloc.turma.course, alloc.turma.courseModule, alloc.turma.name, alloc.turma.classCode)}
                            </span>
                          )}`;
    return match.replace(/<\/span>/, `</span>${badge}`);
  }
);

// 3. Revert subtitle text size
code = code.replace(
  /className=\{`font-mono text-\[#2e2640\] font-bold mt-0\.5 uppercase tracking-wide truncate \$\{alloc\.academicYear !== '1' \? 'text-\[7\.5px\]' : 'text-\[9px\]'\}`\}/g,
  'className="font-mono text-[9px] text-[#2e2640] font-bold mt-0.5 uppercase tracking-wide truncate"'
);
code = code.replace(
  /className=\{`font-mono text-\[#2e2640\] font-bold uppercase tracking-wider truncate mt-0\.5 print:mt-1 \$\{alloc\.academicYear !== '1' \? 'text-\[8\.5px\] print:text-\[8px\]' : 'text-\[9\.5px\] print:text-\[9px\]'\}`\}/g,
  'className="font-mono text-[9.5px] print:text-[9px] text-[#2e2640] font-bold uppercase tracking-wider truncate mt-0.5 print:mt-1"'
);

fs.writeFileSync('./src/components/BoletimEP.tsx', code);
console.log(`Reverted BoletimEP.tsx, matches replaced: ${matchCount}`);
