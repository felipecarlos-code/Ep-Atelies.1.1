const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

// Replace the page chunking logic
const chunkRegex = /const MAX_PER_PAGE = 6;[\s\S]*?const getQuarterText/m;

const chunkLogic = `const MAX_PER_PAGE = 6;
  
  const ano1 = activeAllocations.filter((a: any) => String(a.academicYear) === '1');
  const ano3 = activeAllocations.filter((a: any) => String(a.academicYear) === '3');
  const ano2 = activeAllocations.filter((a: any) => String(a.academicYear) === '2');

  const chunkArray = (arr: any[]) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += MAX_PER_PAGE) {
      chunks.push(arr.slice(i, i + MAX_PER_PAGE));
    }
    return chunks.length > 0 ? chunks : [[]];
  };

  const pages = [
    ...chunkArray(ano1),
    ...chunkArray(ano3),
    ...chunkArray(ano2)
  ];

  const getQuarterText`;

code = code.replace(chunkRegex, chunkLogic);

// Replace block header text logic and card body ordering
const cardRegex = /\{\/\* Right: Info Block \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}\)\}/m;

const newCard = `{\/\* Right: Info Block \*\/}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {\/\* Block Header \*\/}
                    <div className="bg-[#99cdb0] text-white px-5 py-2 flex justify-between items-center shrink-0">
                      <span className="font-medium text-[16px] uppercase tracking-wider font-sans">
                        {headerText} {alloc.atelieBlocks && alloc.atelieBlocks.length > 0 && !headerText.includes('PARCEIRO') ? \` - \${alloc.atelieBlocks.join('/')}\` : ''}
                      </span>
                      {isEnglish && (
                        <span className="font-bold text-[12px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">MÓDULO EM INGLÊS</span>
                      )}
                    </div>
                    {\/\* Block Body \*\/}
                    <div className="bg-slate-100 flex-1 p-5 flex flex-col justify-center gap-1.5">
                      <h3 className="text-[#2e2640] text-[20px] font-medium leading-tight">
                        {alloc.academicYear}° ANO - MÓD. {alloc.turma?.courseModule?.toString().padStart(2, '0') || '00'} {courseStr ? \`- \${courseStr}\` : ''}
                      </h3>
                      <p className="text-[#2e2640] text-[16px] leading-relaxed line-clamp-2 font-sans font-medium">
                        {alloc.turma?.epDescricaoCurta || 'Sem descrição.'}
                      </p>
                      <p className="text-slate-500 text-[14px] leading-snug line-clamp-1 font-sans font-bold uppercase mt-1">
                        Orientador(a): {alloc.turma?.epOrientador || alloc.turma?.orientador || 'Não Cadastrado'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}`;

code = code.replace(cardRegex, newCard);

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Replaced chunk logic and card layout');
