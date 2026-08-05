const fs = require('fs');
let code = fs.readFileSync('./src/components/TurmaManager.tsx', 'utf8');

code = code.replace(
  /setCourse\(cleanOrDetectCourse\(turma\.course, turma\.courseModule, turma\.name\)\);/g,
  `setCourse(cleanOrDetectCourse(turma.course, turma.courseModule, turma.name, turma.classCode));`
);

code = code.replace(
  /course: cleanOrDetectCourse\(course, courseModule, name\),/g,
  `course: cleanOrDetectCourse(course, courseModule, name, classCode),`
);

fs.writeFileSync('./src/components/TurmaManager.tsx', code);
