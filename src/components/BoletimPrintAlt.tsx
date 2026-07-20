import React from 'react';
import { Atelie, Turma, Partner, AllocationRow, PHASES, PhaseKey } from '../types';
import { HelpCircle } from 'lucide-react';
import { cleanOrDetectCourse } from './TurmaManager';

export function BoletimPrintAlt({ 
  activeAllocations, 
  selectedQuarter, 
  selectedYear, 
  activePhaseLabel, 
  sprintDates, 
  selectedPhase,
  renderInteliLogo,
  handleLogoError,
  formatDate,
  getSegmentStyle
}: any) {

  const page1Allocations = activeAllocations.filter((alloc: any) => alloc.academicYear === '1');
  const page2Ano3Allocations = activeAllocations.filter((alloc: any) => alloc.academicYear === '3');
  const page2Ano2Allocations = activeAllocations.filter((alloc: any) => alloc.academicYear === '2');

  return (
    <div id="printable-sheet-canvas" className="max-w-4xl mx-auto bg-transparent rounded-lg print:border-none print:shadow-none print:p-0 flex flex-col justify-start">
      {/* PAGE 1 */}
      <div className="boletim-print-page bg-white rounded-lg border border-slate-200 shadow-2xs print:border-none print:shadow-none flex flex-col justify-start overflow-hidden">
        
        {/* Modern Inteli Header */}
        <div className="bg-[#2e2640] text-white p-6 md:p-8 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff4545] rounded-full opacity-10 transform translate-x-1/3 -translate-y-1/3"></div>
          
          <div className="relative z-10">
            <h1 className="font-sans font-black text-4xl tracking-tight leading-none text-white print:text-white">
              BOLETIM EP
            </h1>
            <h2 className="font-sans text-xs font-bold text-[#ff4545] mt-1 uppercase tracking-widest print:text-[#ff4545]">
              {selectedQuarter === 'Q1' ? 'PRIMEIRO' : selectedQuarter === 'Q2' ? 'SEGUNDO' : selectedQuarter === 'Q3' ? 'TERCEIRO' : 'QUARTO'} TRIMESTRE - {selectedYear}
            </h2>
            <div className="flex items-center gap-3 mt-3">
              <span className="font-sans text-[10px] font-bold text-white/80 uppercase tracking-wide bg-white/10 px-2 py-0.5 rounded">
                {activePhaseLabel}
              </span>
              <span className="font-sans text-[10px] text-white/60">
                {sprintDates[selectedPhase] ? formatDate(sprintDates[selectedPhase]) : ''}
              </span>
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-end">
             {/* Inteli white logo equivalent or rendering colored one on dark bg might be hard if it's the default logo, we might need a white version. For now, we can render inside a white pill if it's dark */}
             <div className="bg-white p-2 rounded flex items-center justify-center shadow-lg">
                {renderInteliLogo(false)}
             </div>
          </div>
        </div>

        <div className="p-6 md:p-8 flex-1 flex flex-col">
          {/* PERÍODO DA MANHÃ (1º ANO) */}
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <div className="w-1.5 h-4 bg-[#ff4545] rounded-full"></div>
            <h3 className="font-sans font-black text-[#2e2640] text-lg uppercase tracking-tight">1º Ano</h3>
            <span className="font-sans text-[9px] text-slate-400 font-bold uppercase ml-auto bg-slate-100 px-2 py-1 rounded">09h às 11h</span>
          </div>

          {page1Allocations.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 print:gap-3 flex-1 content-start">
              {page1Allocations.map((alloc: any) => {
                const seg = getSegmentStyle(alloc.academicYear);
                return (
                  <div key={alloc.rowId} className="border border-slate-200 rounded-lg overflow-hidden flex flex-col h-full break-inside-avoid">
                    <div className="flex items-center p-3 border-b border-slate-100 bg-slate-50/50 h-16 shrink-0">
                      {alloc.partner ? (
                        <div className="flex items-center gap-3 w-full">
                          <img
                            src={alloc.partner.logoUrl}
                            alt={alloc.partner.name}
                            className="h-8 w-16 object-contain mix-blend-multiply shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => handleLogoError(e, alloc.partner!.name)}
                          />
                          <span className="text-[10px] text-[#2e2640] font-bold line-clamp-2 leading-tight">
                            {alloc.partner.name}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400 w-full">
                          <HelpCircle size={14} />
                          <span className="text-[9px] font-bold uppercase">Sem Parceiro</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <span className={`text-[8px] font-sans font-bold px-1.5 py-0.5 rounded ${seg.bg} ${seg.text}`}>
                            {alloc.atelieNames.join(' & ') || 'Ateliê Pendente'}
                          </span>
                          <span className="text-[8px] font-sans font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                             {alloc.atelieBlocks.map((b: any) => String(b).toUpperCase().replace('BLOCO', '').trim()).join('/') || 'N/A'}
                          </span>
                        </div>
                        
                        <p className="font-sans text-[10px] text-[#2e2640] font-black uppercase tracking-wide leading-tight mb-1.5">
                          {alloc.subtitle}
                        </p>
                        <p className="font-sans text-[10px] text-slate-500 leading-snug line-clamp-3 mb-3">
                          {alloc.turma?.epDescricaoCurta || 'Sem descrição.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase tracking-wide mt-auto">
                        <span>Orientador (a):</span>
                        <span className="text-[#2e2640] font-black truncate max-w-[70%]" title={alloc.turma?.epOrientador || alloc.turma?.orientador}>
                          {alloc.turma?.epOrientador || alloc.turma?.orientador || 'Não Cadastrado'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-lg">
              <span className="text-[10px] font-sans uppercase font-bold text-slate-300">Nenhum projeto de 1º Ano</span>
            </div>
          )}
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="boletim-print-page bg-white rounded-lg border border-slate-200 shadow-2xs print:border-none print:shadow-none flex flex-col justify-start overflow-hidden mt-6 print:mt-0 print:break-before-page">
        <div className="p-6 md:p-8 flex-1 flex flex-col">
          
          {/* 3º ANO */}
          {page2Ano3Allocations.length > 0 && (
            <div className="mb-6 shrink-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-4 bg-[#2e2640] rounded-full"></div>
                <h3 className="font-sans font-black text-[#2e2640] text-lg uppercase tracking-tight">3º Ano</h3>
                <span className="font-sans text-[9px] text-slate-400 font-bold uppercase ml-auto bg-slate-100 px-2 py-1 rounded">09h às 11h</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 print:gap-3">
                {page2Ano3Allocations.map((alloc: any) => {
                  const seg = getSegmentStyle(alloc.academicYear);
                  return (
                    <div key={alloc.rowId} className="border border-slate-200 rounded-lg overflow-hidden flex flex-col h-full break-inside-avoid">
                      <div className="flex items-center p-2.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
                        {alloc.partner ? (
                          <div className="flex items-center gap-2.5 w-full">
                            <img
                              src={alloc.partner.logoUrl}
                              alt={alloc.partner.name}
                              className="h-6 w-12 object-contain mix-blend-multiply shrink-0"
                              referrerPolicy="no-referrer"
                              onError={(e) => handleLogoError(e, alloc.partner!.name)}
                            />
                            <span className="text-[9px] text-[#2e2640] font-bold line-clamp-1">
                              {alloc.partner.name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 w-full h-6">
                            <HelpCircle size={12} />
                            <span className="text-[8px] font-bold uppercase">Sem Parceiro</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-2.5 flex-1 flex flex-col justify-between min-h-[90px]">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            <span className={`text-[7.5px] font-sans font-bold px-1.5 py-0.5 rounded ${seg.bg} ${seg.text}`}>
                              {alloc.atelieNames.join(' & ') || 'Ateliê Pendente'}
                            </span>
                            {alloc.turma && (
                              <span className="text-[7.5px] font-sans font-bold px-1.5 py-0.5 rounded bg-[#90a5e5]/10 text-[#2e2640] max-w-full truncate">
                                {cleanOrDetectCourse(alloc.turma.course, alloc.turma.courseModule, alloc.turma.name)}
                              </span>
                            )}
                          </div>
                          <p className="font-sans text-[9px] text-[#2e2640] font-bold uppercase tracking-wide leading-tight line-clamp-2 mb-2">
                            {alloc.subtitle}
                          </p>
                        </div>

                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[7.5px] text-slate-400 font-bold uppercase tracking-wide mt-auto">
                          <span>Orientador (a):</span>
                          <span className="text-[#2e2640] font-black truncate max-w-[70%]" title={alloc.turma?.epOrientador || alloc.turma?.orientador}>
                            {alloc.turma?.epOrientador || alloc.turma?.orientador || 'Não Cadastrado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2º ANO */}
          {page2Ano2Allocations.length > 0 && (
            <div className="shrink-0 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-4 bg-[#90a5e5] rounded-full"></div>
                <h3 className="font-sans font-black text-[#2e2640] text-lg uppercase tracking-tight">2º Ano</h3>
                <span className="font-sans text-[9px] text-slate-400 font-bold uppercase ml-auto bg-slate-100 px-2 py-1 rounded">14h às 16h</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 print:gap-3">
                {page2Ano2Allocations.map((alloc: any) => {
                  const seg = getSegmentStyle(alloc.academicYear);
                  return (
                    <div key={alloc.rowId} className="border border-slate-200 rounded-lg overflow-hidden flex flex-col h-full break-inside-avoid">
                      <div className="flex items-center p-2.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
                        {alloc.partner ? (
                          <div className="flex items-center gap-2.5 w-full">
                            <img
                              src={alloc.partner.logoUrl}
                              alt={alloc.partner.name}
                              className="h-6 w-12 object-contain mix-blend-multiply shrink-0"
                              referrerPolicy="no-referrer"
                              onError={(e) => handleLogoError(e, alloc.partner!.name)}
                            />
                            <span className="text-[9px] text-[#2e2640] font-bold line-clamp-1">
                              {alloc.partner.name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 w-full h-6">
                            <HelpCircle size={12} />
                            <span className="text-[8px] font-bold uppercase">Sem Parceiro</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-2.5 flex-1 flex flex-col justify-between min-h-[90px]">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            <span className={`text-[7.5px] font-sans font-bold px-1.5 py-0.5 rounded ${seg.bg} ${seg.text}`}>
                              {alloc.atelieNames.join(' & ') || 'Ateliê Pendente'}
                            </span>
                            {alloc.turma && (
                              <span className="text-[7.5px] font-sans font-bold px-1.5 py-0.5 rounded bg-[#90a5e5]/10 text-[#2e2640] max-w-full truncate">
                                {cleanOrDetectCourse(alloc.turma.course, alloc.turma.courseModule, alloc.turma.name)}
                              </span>
                            )}
                          </div>
                          <p className="font-sans text-[9px] text-[#2e2640] font-bold uppercase tracking-wide leading-tight line-clamp-2 mb-2">
                            {alloc.subtitle}
                          </p>
                        </div>

                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[7.5px] text-slate-400 font-bold uppercase tracking-wide mt-auto">
                          <span>Orientador (a):</span>
                          <span className="text-[#2e2640] font-black truncate max-w-[70%]" title={alloc.turma?.epOrientador || alloc.turma?.orientador}>
                            {alloc.turma?.epOrientador || alloc.turma?.orientador || 'Não Cadastrado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {page2Ano3Allocations.length === 0 && page2Ano2Allocations.length === 0 && (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-lg">
              <span className="text-[10px] font-sans uppercase font-bold text-slate-300">Nenhum projeto de 2º/3º Ano</span>
            </div>
          )}
          
          {/* Timeline / Footer */}
          <div className="mt-auto pt-4" id="boletim-cronograma-rodape">
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <div className="text-center mb-4">
                <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-slate-400">
                  Cronograma do Módulo
                </span>
              </div>
              <div className="relative flex justify-between">
                <div className="absolute top-2 left-4 right-4 h-px bg-slate-200"></div>
                
                {['inicio', 'kickoff', 'sprint2', 'fim'].map((key, i) => {
                  const labels = ['1. Onboarding', '2. Kick-Off', '3. Sprints', '4. Apresentação'];
                  return (
                    <div key={key} className="relative z-10 flex flex-col items-center">
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-[#2e2640] mb-2"></div>
                      <span className="font-sans text-[9px] font-bold text-[#2e2640]">{labels[i]}</span>
                      <span className="font-sans text-[8px] text-slate-500 mt-0.5">
                        {key === 'sprint2' ? 'Ver detalhe' : sprintDates[key] ? formatDate(sprintDates[key]) : '-'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
