const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

const cardRegex = /<div key=\{alloc\.rowId \|\| idx\} className="flex gap-8 items-stretch h-\[185px\]">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}\)\}/m;

const newCard = `<div key={alloc.rowId || idx} className="flex gap-8 items-stretch h-[185px]">
                  {/* Left: Logo */}
                  <div className="w-[180px] flex items-center justify-center shrink-0">
                    {isPartner ? (
                        <img 
                        src={alloc.partner.logoUrl} 
                        alt={alloc.partner.name}
                        className="max-w-[150px] max-h-[120px] object-contain mix-blend-multiply"
                        referrerPolicy="no-referrer"
                        onError={(e) => handleLogoError && handleLogoError(e, alloc.partner.name)}
                      />
                    ) : (
                      <div className="text-slate-300 flex flex-col items-center">
                        <HelpCircle size={48} />
                      </div>
                    )}
                  </div>

                  {/* Right: Info Block */}
                  <div className="flex-1 flex flex-col overflow-hidden rounded-2xl shadow-sm border border-slate-200">
                    {/* Block Header */}
                    <div className="bg-[#99cdb0] text-[#1c3829] px-5 py-2.5 flex justify-between items-center shrink-0 border-b border-[#82b89a]">
                      <span className="font-bold text-[14px] uppercase tracking-wider font-sans">
                        {headerText} {alloc.atelieBlocks && alloc.atelieBlocks.length > 0 && !headerText.includes('PARCEIRO') ? \` - \${alloc.atelieBlocks.map((b: any) => String(b).toUpperCase().replace('BLOCO', 'BL.').trim()).join('/')}\` : ''}
                        <span className="font-semibold capitalize ml-2 text-[#2a4d3a]">
                          - Orientador(a): {alloc.turma?.epOrientador || alloc.turma?.orientador || 'N/C'}
                        </span>
                      </span>
                      {isEnglish && (
                        <span className="font-bold text-[11px] uppercase tracking-wider bg-[#1c3829] text-white px-2 py-0.5 rounded-md">MÓDULO EM INGLÊS</span>
                      )}
                    </div>
                    {/* Block Body */}
                    <div className="bg-slate-50 flex-1 px-6 py-4 flex flex-col justify-center gap-1.5">
                      <h3 className="text-[#2e2640] text-[19px] font-bold leading-tight uppercase font-sans">
                        {alloc.academicYear}° ANO - {String(alloc.turma?.courseModule || '00').toUpperCase().includes('MÓD') ? '' : 'MÓDULO '}{String(alloc.turma?.courseModule || '00').split('-')[0].trim()}
                      </h3>
                      <p className="text-[#2e2640] text-[16px] leading-relaxed line-clamp-3 font-sans font-medium mt-1">
                        {alloc.turma?.epDescricaoCurta || 'Sem descrição.'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}`;

code = code.replace(cardRegex, newCard);

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Replaced card layout v9');
