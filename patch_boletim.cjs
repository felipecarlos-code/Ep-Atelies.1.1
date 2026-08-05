const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimEP.tsx', 'utf8');

// Replace the return of getEpMeta
code = code.replace(
  /subtitle = cleaned \|\| subtitle;\n\s*\}\n\n\s*return \{ title, subtitle, academicYear \};/g,
  `subtitle = cleaned || subtitle;
    }

    if (academicYear !== '1') {
      const detectedCourse = cleanOrDetectCourse(turma.course, turma.courseModule, turma.name);
      if (detectedCourse && !subtitle.toUpperCase().includes(detectedCourse.toUpperCase())) {
        subtitle = \`\${subtitle} - \${detectedCourse.toUpperCase()}\`;
      }
    }

    return { title, subtitle, academicYear };`
);

// Remove the badges
code = code.replace(
  /\{alloc\.turma && alloc\.academicYear !== '1' && \([\s\S]*?Curso: \{cleanOrDetectCourse[\s\S]*?<\/span>\n\s*\)\}/g,
  ''
);

// Adjust subtitle font sizes to prevent breaking layout for longer names
code = code.replace(
  /className="font-mono text-\[9px\] text-\[#2e2640\] font-bold mt-0\.5 uppercase tracking-wide truncate"/g,
  'className={`font-mono text-[#2e2640] font-bold mt-0.5 uppercase tracking-wide truncate ${alloc.academicYear !== \'1\' ? \'text-[7.5px]\' : \'text-[9px]\'}`}'
);

code = code.replace(
  /className="font-mono text-\[9\.5px\] print:text-\[9px\] text-\[#2e2640\] font-bold uppercase tracking-wider truncate mt-0\.5 print:mt-1"/g,
  'className={`font-mono text-[#2e2640] font-bold uppercase tracking-wider truncate mt-0.5 print:mt-1 ${alloc.academicYear !== \'1\' ? \'text-[8.5px] print:text-[8px]\' : \'text-[9.5px] print:text-[9px]\'}`}'
);

fs.writeFileSync('./src/components/BoletimEP.tsx', code);
