const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

code = code.replace(
  /<h3 className="text-\[#2e2640\] text-\[19px\] font-bold leading-tight uppercase font-sans">/g,
  '<h3 className={`text-[#2e2640] font-bold leading-tight uppercase font-sans ${alloc.academicYear !== \'1\' ? \'text-[14px]\' : \'text-[19px]\'}`}>'
);

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
