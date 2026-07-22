const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');
code = code.replace(
  'className="flex flex-col items-center gap-8 bg-slate-100 py-8 print:py-0 print:bg-white"', 
  'className="flex flex-col items-center gap-8 bg-slate-100 py-8 print:py-0 print:bg-white print:gap-0"'
);
code = code.replace(
  'className="boletim-v3-page relative bg-white mx-auto shadow-xl overflow-hidden flex flex-col"',
  'className="boletim-v3-page relative bg-white mx-auto shadow-xl overflow-hidden flex flex-col print:shadow-none print:my-0 print:break-after-page"'
);
fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
