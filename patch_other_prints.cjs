const fs = require('fs');

const files = [
  './src/components/BoletimPrintAlt.tsx',
  './src/components/BoletimPrintV3.tsx'
];

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');

  code = code.replace(
    /cleanOrDetectCourse\(alloc\.turma(\?)?\.course, alloc\.turma(\?)?\.courseModule, alloc\.turma(\?)?\.name\)/g,
    `cleanOrDetectCourse(alloc.turma$1.course, alloc.turma$2.courseModule, alloc.turma$3.name, alloc.turma$1.classCode)`
  );

  fs.writeFileSync(file, code);
});
