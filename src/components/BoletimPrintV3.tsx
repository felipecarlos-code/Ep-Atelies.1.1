import React from 'react';
import { HelpCircle } from 'lucide-react';
import { cleanOrDetectCourse } from './TurmaManager';

export function BoletimPrintV3({ 
  activeAllocations, 
  selectedQuarter, 
  selectedYear, 
  sprintDates,
  campusImgSrc,
  renderInteliLogo,
  handleLogoError
}: any) {
  // We want to chunk allocations. 
  // According to the 212x529mm PDF, a page can comfortably hold ~6 projects.
  // The last page has the schedule (cronograma) and can hold ~4-5 projects.
  
  const MAX_PER_PAGE = 6;
  const pages: any[][] = [];
  let currentPage: any[] = [];

  activeAllocations.forEach((alloc: any, index: number) => {
    currentPage.push(alloc);
    // If page is full, or it's the very last item, we break.
    // If it's the last page and we need room for cronograma, 
    // actually, let's just use 6 per page, and if the last page has 5 or 6 items, 
    // the cronograma might overflow to a new page, which is fine.
    // To closely match the PDF, we'll slice by 6.
    if (currentPage.length === MAX_PER_PAGE || index === activeAllocations.length - 1) {
      // Check if this is the last page, and if adding cronograma would overflow
      if (index === activeAllocations.length - 1 && currentPage.length > 5) {
        pages.push([...currentPage]);
        currentPage = [];
      } else {
        pages.push([...currentPage]);
        currentPage = [];
      }
    }
  });

  // If the last page is full, the cronograma will be on its own page
  // We'll handle cronograma in the last page array

  const getQuarterText = (q: string) => {
    switch(q) {
      case 'Q1': return 'PRIMEIRO';
      case 'Q2': return 'SEGUNDO';
      case 'Q3': return 'TERCEIRO';
      case 'Q4': return 'QUARTO';
      default: return 'SEGUNDO';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const months = ['Jan', 'Fev', 'Mar', 'Abril', 'Maio', 'Junho', 'Julho', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${day}/${months[parseInt(month)-1]}`;
  };

  return (
    <div id="boletim-v3-container" className="flex flex-col items-center gap-8 bg-slate-100 py-8 print:py-0 print:bg-white">
      <style>
        {`
          @media print {
            @page {
              size: 212mm 529mm;
              margin: 0;
            }
            body {
              margin: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #boletim-v3-container {
              gap: 0;
              padding: 0;
            }
            .boletim-v3-page {
              page-break-after: always;
              margin: 0 !important;
              box-shadow: none !important;
            }
            /* Hide UI elements */
            nav, .no-print, button, .admin-dropdown {
              display: none !important;
            }
          }
        `}
      </style>

      {pages.map((pageAllocations, pageIndex) => (
        <div 
          key={pageIndex} 
          className="boletim-v3-page relative bg-white mx-auto shadow-xl overflow-hidden flex flex-col"
          style={{ width: '212mm', height: '529mm' }}
        >
          {/* Header Image - Only on the first page? The PDF shows it on all 3 pages */}
          <div className="w-full h-[180px] shrink-0">
            <img src={campusImgSrc} alt="Campus" className="w-full h-full object-cover" />
          </div>

          {/* Title Area */}
          <div className="px-12 pt-8 pb-6 shrink-0">
            <h1 className="text-[#2e2640] font-serif text-[75px] leading-none mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              BOLETIM EP
            </h1>
            <h2 className="text-[#E24A4A] text-2xl font-bold uppercase tracking-wide mb-6">
              {getQuarterText(selectedQuarter)} TRIMESTRE - {selectedYear}
            </h2>
            <p className="text-slate-700 text-lg font-medium">Projetos de 1° e 3° ano - 09h às 11h</p>
            <p className="text-slate-700 text-lg font-medium">Projetos de 2° ano - 14h às 16h</p>
          </div>

          {/* Projects List */}
          <div className="flex-1 px-12 flex flex-col gap-6 pt-2">
            {pageAllocations.map((alloc: any, idx: number) => {
              const isPartner = alloc.partner !== null && alloc.partner !== undefined;
              
              // Determine header text
              let headerText = alloc.atelieNames.join(' / ');
              if (headerText.toLowerCase().includes('parceiro')) {
                headerText = 'NO PARCEIRO';
              } else if (headerText.toLowerCase().includes('auditório') || headerText.toLowerCase().includes('auditorio')) {
                headerText = 'AUDITÓRIO';
              } else {
                headerText = 'ATELIÊ ' + headerText.replace(/Ateliê/ig, '').trim();
              }
              
              const isEnglish = alloc.subtitle?.toLowerCase().includes('inglês') || alloc.subtitle?.toLowerCase().includes('english');

              const courseStr = cleanOrDetectCourse(alloc.turma?.course, alloc.turma?.courseModule, alloc.turma?.name);

              return (
                <div key={alloc.rowId || idx} className="flex gap-8 items-stretch h-[170px]">
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
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Block Header */}
                    <div className="bg-[#99cdb0] text-white px-5 py-2 flex justify-between items-center shrink-0">
                      <span className="font-medium text-[16px] uppercase tracking-wider font-sans">{headerText}</span>
                      {isEnglish && (
                        <span className="font-bold text-[12px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">MÓDULO EM INGLÊS</span>
                      )}
                    </div>
                    {/* Block Body */}
                    <div className="bg-slate-100 flex-1 p-5 flex flex-col justify-center">
                      <h3 className="text-[#2e2640] text-[20px] font-medium leading-tight mb-2">
                        {alloc.academicYear}° ANO - MÓD. {alloc.turma?.courseModule?.toString().padStart(2, '0') || '00'} {courseStr ? `- ${courseStr}` : ''}
                      </h3>
                      <h4 className="text-[#2e2640] text-[18px] font-serif leading-snug mb-3">
                        {alloc.subtitle}
                      </h4>
                      <p className="text-[#2e2640] text-[15px] leading-relaxed line-clamp-3 font-sans">
                        {alloc.turma?.epDescricaoCurta || 'Sem descrição.'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cronograma (Only on the very last page) */}
          {pageIndex === pages.length - 1 && (
            <div className="px-12 mt-8 mb-12 shrink-0">
              <h3 className="text-[#2e2640] text-3xl font-serif mb-6 border-b-2 border-[#2e2640] pb-2 inline-block">
                CRONOGRAMA DO MÓDULO
              </h3>
              
              <div className="relative mt-8">
                {/* Horizontal Line */}
                <div className="absolute top-[8px] left-[5%] right-[5%] h-[3px] bg-[#E24A4A]"></div>
                
                <div className="relative flex justify-between px-[5%] text-center">
                  
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-[#E24A4A] relative z-10 mb-3"></div>
                    <span className="text-[#2e2640] font-bold text-lg uppercase tracking-wider">ONBOARDING</span>
                    <span className="text-slate-600 text-lg mt-1">{formatDate(sprintDates['inicio'])}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-[#E24A4A] relative z-10 mb-3"></div>
                    <span className="text-[#2e2640] font-bold text-lg uppercase tracking-wider">KICK OFF</span>
                    <span className="text-slate-600 text-lg mt-1">{formatDate(sprintDates['kickoff'])}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-[#E24A4A] relative z-10 mb-3"></div>
                    <span className="text-[#2e2640] font-bold text-lg uppercase tracking-wider">SPRINTS</span>
                    <div className="flex flex-col mt-1 text-slate-600 text-lg">
                      <span>{formatDate(sprintDates['sprint1'])}</span>
                      <span>{formatDate(sprintDates['sprint2'])}</span>
                      <span>{formatDate(sprintDates['sprint3'])}</span>
                      <span>{formatDate(sprintDates['sprint4'])}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-[#E24A4A] relative z-10 mb-3"></div>
                    <span className="text-[#2e2640] font-bold text-lg uppercase tracking-wider">APRESENTAÇÃO FINAL</span>
                    <span className="text-slate-600 text-lg mt-1">{formatDate(sprintDates['fim'])}</span>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Footer (On every page) */}
          <div className="bg-[#2e2640] h-[100px] w-full shrink-0 flex items-center justify-center mt-auto">
            <div className="flex items-center justify-center w-full max-w-[200px]">
              {renderInteliLogo(true, 'lg')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
