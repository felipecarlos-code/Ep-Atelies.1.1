const fs = require('fs');

// REVERT V3
let v3 = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

const badHeader = `<div className="px-12 pt-10 pb-6 shrink-0 flex flex-col items-start">
            <h1 className="text-[#2e2640] font-serif text-[80px] leading-none tracking-tight mb-3" style={{ fontFamily: 'Georgia, serif' }}>
              BOLETIM EP
            </h1>
            <h2 className="text-[#E24A4A] text-[22px] font-bold uppercase tracking-[0.2em] mb-8">
              {getQuarterText(selectedQuarter)} TRIMESTRE - {selectedYear}
            </h2>
            <div className="flex flex-col gap-2">
              <p className="text-slate-600 text-[18px] font-medium tracking-wide">Projetos de 1° e 3° ano <span className="text-slate-300 mx-2">|</span> 09h às 11h</p>
              <p className="text-slate-600 text-[18px] font-medium tracking-wide">Projetos de 2° ano <span className="text-slate-300 mx-2">|</span> 14h às 16h</p>
            </div>
          </div>`;

const goodHeader = `<div className="px-12 pt-8 pb-6 shrink-0">
            <h1 className="text-[#2e2640] font-serif text-[75px] leading-none mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              BOLETIM EP
            </h1>
            <h2 className="text-[#E24A4A] text-2xl font-bold uppercase tracking-wide mb-6">
              {getQuarterText(selectedQuarter)} TRIMESTRE - {selectedYear}
            </h2>
            <p className="text-slate-700 text-lg font-medium">Projetos de 1° e 3° ano - 09h às 11h</p>
            <p className="text-slate-700 text-lg font-medium">Projetos de 2° ano - 14h às 16h</p>
          </div>`;

v3 = v3.replace(badHeader, goodHeader);
v3 = v3.replace(/className="flex gap-8 items-stretch h-\[230px\]"/g, 'className="flex gap-8 items-stretch h-[185px]"');
v3 = v3.replace(/line-clamp-4/g, 'line-clamp-3');
v3 = v3.replace(/<div className="px-12 -mt-4 mb-8 shrink-0">/g, '<div className="px-12 mt-8 mb-12 shrink-0">');

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', v3);

// REVERT EP
let ep = fs.readFileSync('./src/components/BoletimEP.tsx', 'utf8');
ep = ep.replace(/min-h-\[200px\]/g, 'min-h-[170px]');
fs.writeFileSync('./src/components/BoletimEP.tsx', ep);

console.log('Reverted to original layout');
