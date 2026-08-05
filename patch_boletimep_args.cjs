const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimEP.tsx', 'utf8');

code = code.replace(
  /cleanOrDetectCourse\(turma\.course, turma\.courseModule, turma\.name\)/g,
  `cleanOrDetectCourse(turma.course, turma.courseModule, turma.name, turma.classCode)`
);

code = code.replace(
  /cleanOrDetectCourse\(alloc\.turma\.course, alloc\.turma\.courseModule, alloc\.turma\.name\)/g,
  `cleanOrDetectCourse(alloc.turma.course, alloc.turma.courseModule, alloc.turma.name, alloc.turma.classCode)`
);

fs.writeFileSync('./src/components/BoletimEP.tsx', code);
