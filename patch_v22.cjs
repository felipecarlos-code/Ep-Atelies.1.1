const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

const target = `          <div className="px-12 pt-8 pb-6 shrink-0">
            <h1 className="text-[#2e2640] font-serif text-[75px] leading-none mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              BOLETIM EP
            </h1>
            <h2 className="text-[#E24A4A] text-2xl font-bold uppercase tracking-wide mb-6">
              {getQuarterText(selectedQuarter)} TRIMESTRE - {selectedYear}
            </h2>
            <p className="text-slate-700 text-lg font-medium">Projetos de 1° e 3° ano - 09h às 11h</p>
            <p className="text-slate-700 text-lg font-medium">Projetos de 2° ano - 14h às 16h</p>
          </div>`;

const replacement = `          <div className="px-12 pt-10 pb-6 shrink-0 flex flex-col items-start">
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

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
    console.log('Patched header spacing in V3');
} else {
    console.log('Target not found in V3');
}

