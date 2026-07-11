import React, { useState } from 'react';
// @ts-ignore
import inteliCampusImg from '../assets/images/inteli_campus_original.jpg';
import { Atelie, Turma, Partner, AllocationRow, PHASES, PhaseKey } from '../types';
import { findMatchingAtelie } from '../utils/atelieMatcher';
import { cleanOrDetectCourse } from './TurmaManager';
import { 
  FileSpreadsheet, 
  Printer, 
  Layout, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  HelpCircle,
  FileText,
  Info,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface BoletimEPProps {
  atelies: Atelie[];
  turmas: Turma[];
  partners: Partner[];
  rows: AllocationRow[];
  sprintDates: Record<string, string>;
  selectedYear: string;
  selectedQuarter: string;
}

export default function BoletimEP({
  atelies,
  turmas,
  partners,
  rows,
  sprintDates,
  selectedYear,
  selectedQuarter,
}: BoletimEPProps) {
  const [selectedPhase, setSelectedPhase] = useState<PhaseKey>('sprint1');
  const [layoutMode, setLayoutMode] = useState<'ppt' | 'print'>('ppt');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
  };

  const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement, Event>, partnerName: string, domain?: string) => {
    const target = e.currentTarget;
    const currentSrc = target.src;
    
    // Try to extract domain from src if not explicitly provided
    let cleanDomain = domain || "";
    if (!cleanDomain) {
      if (currentSrc.includes("logo.clearbit.com/")) {
        cleanDomain = currentSrc.split("logo.clearbit.com/")[1];
      } else if (currentSrc.includes("unavatar.io/")) {
        cleanDomain = currentSrc.split("unavatar.io/")[1];
      }
    }

    // Remove any trailing queries or slashes
    if (cleanDomain) {
      cleanDomain = cleanDomain.split("?")[0].split("/")[0];
    }

    if (cleanDomain) {
      // Step 1: If Clearbit failed, try unavatar.io
      if (currentSrc.includes("logo.clearbit.com")) {
        target.src = `https://unavatar.io/${cleanDomain}`;
        return;
      }
      // Step 2: If unavatar failed, try google favicon (128px)
      if (currentSrc.includes("unavatar.io")) {
        target.src = `https://www.google.com/s2/favicons?sz=128&domain=${cleanDomain}`;
        return;
      }
    }

    // Step 3: Default fallback to a beautifully styled, 100% offline inline SVG
    const words = partnerName.trim().split(/\s+/);
    const initials = words.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
    const colors = ['2e2640', '066d73', 'ff4545', '1e293b', '4f46e5', '0891b2', '059669', '7c3aed'];
    let hash = 0;
    for (let i = 0; i < partnerName.length; i++) {
      hash = partnerName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];
    const fallbackSvg = "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><rect width='100' height='100' rx='20' fill='#${color}'/><text x='50' y='58' font-family='sans-serif' font-weight='900' font-size='34' fill='#ffffff' text-anchor='middle'>${initials}</text></svg>`
    );
    if (target.src !== fallbackSvg) {
      target.src = fallbackSvg;
    }
  };

  // Inteli Custom Color Constants from Brandbook
  const ROXO = '#2e2640';
  const CORAL = '#ff4545';
  const LILAS = '#90a5e5';
  const VERDE = '#89cea5';
  const VERDE_ESCURO = '#066d73';
  const CINZA_CLARO = '#e6eaeb';
  const CINZA_ESCURO = '#b2b6bf';

  // Lowercase "inteli" signature logo with coral sphere
  const renderInteliLogo = (isDark: boolean = false) => {
    return (
      <div className="flex items-center gap-2.5 select-none" id="brand-logo-frame">
        <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-12">
            <g fill={CORAL}>
              {/* Row 1 */}
              <circle cx="50" cy="25" r="3.5" />
              <circle cx="58" cy="27" r="3.2" />
              <circle cx="66" cy="31" r="2.8" />
              <circle cx="73" cy="37" r="2.2" />
              {/* Row 2 */}
              <circle cx="43" cy="33" r="4.0" />
              <circle cx="51" cy="36" r="3.8" />
              <circle cx="59" cy="41" r="3.4" />
              <circle cx="66" cy="48" r="2.8" />
              <circle cx="72" cy="56" r="2.0" />
              {/* Row 3 */}
              <circle cx="38" cy="44" r="4.2" />
              <circle cx="45" cy="48" r="4.0" />
              <circle cx="53" cy="54" r="3.6" />
              <circle cx="60" cy="62" r="3.0" />
              <circle cx="66" cy="71" r="2.2" />
              {/* Row 4 */}
              <circle cx="35" cy="57" r="4.0" />
              <circle cx="41" cy="62" r="3.8" />
              <circle cx="48" cy="69" r="3.4" />
              <circle cx="54" cy="77" r="2.8" />
              {/* Row 5 */}
              <circle cx="36" cy="71" r="3.5" />
              <circle cx="41" cy="77" r="3.2" />
              <circle cx="46" cy="84" r="2.5" />
            </g>
          </svg>
        </div>
        <span className={`font-sans font-black tracking-tight text-xl leading-none ${isDark ? 'text-white' : 'text-[#2e2640]'}`}>
          inteli
        </span>
      </div>
    );
  };



  // Parse Turma metadata to match official EP style
  const getEpMeta = (turma: Turma) => {
    const name = turma.name.toLowerCase();
    const courseYear = String(turma.courseYear || '').toLowerCase();
    
    // Auto-detect year
    let detectedYear: '1' | '2' | '3' | null = null;
    if (courseYear.includes('1º') || courseYear.includes('1o') || courseYear.includes('1') || courseYear.includes('primeiro')) {
      detectedYear = '1';
    } else if (courseYear.includes('2º') || courseYear.includes('2o') || courseYear.includes('2') || courseYear.includes('segundo')) {
      detectedYear = '2';
    } else if (courseYear.includes('3º') || courseYear.includes('3o') || courseYear.includes('3') || courseYear.includes('terceiro')) {
      detectedYear = '3';
    } else {
      // Try to extract from course module or name
      const extractModuleNumber = (text: string): number | null => {
        const upper = text.toUpperCase().trim();
        const keyMatch = upper.match(/(?:ECMD|ESMD|SIMD|CCMD|AMD)\s*(\d+)/);
        if (keyMatch) return parseInt(keyMatch[1], 10);
        const genericMatch = upper.match(/[A-Z]+(\d+)/);
        if (genericMatch) return parseInt(genericMatch[1], 10);
        const modMatch = upper.match(/(?:MODULO|MÓDULO|MOD)\s*(\d+)/);
        if (modMatch) return parseInt(modMatch[1], 10);
        const numbers = upper.match(/\b\d+\b/g);
        if (numbers) {
          for (const numStr of numbers) {
            const num = parseInt(numStr, 10);
            if (num >= 1 && num <= 16) return num;
          }
        }
        return null;
      };
      
      const modFromModule = extractModuleNumber(turma.courseModule || '');
      const modFromName = extractModuleNumber(turma.name);
      const modNum = modFromModule !== null ? modFromModule : modFromName;
      
      if (modNum !== null) {
        if (modNum >= 1 && modNum <= 4) detectedYear = '1';
        else if (modNum >= 5 && modNum <= 8) detectedYear = '2';
        else if (modNum >= 9 && modNum <= 12) detectedYear = '3';
      }
    }

    let title = 'PROJETO PRÁTICO';
    let subtitle = turma.course;
    let academicYear: '1' | '2' | '3' = '1';

    // Detect Year & Module using name or detectedYear
    if (name.includes('1º ano') || name.includes('1º') || detectedYear === '1') {
      title = '1º ANO - MÓD. 02';
      subtitle = 'APLICAÇÃO WEB';
      academicYear = '1';
    } else if (name.includes('2º ano') || name.includes('2º') || detectedYear === '2') {
      let acronym = 'ES';
      if (name.includes('computação') || name.includes('comp')) acronym = 'EC';
      else if (name.includes('ciência') || name.includes('cc')) acronym = 'CC';
      else if (name.includes('sistemas') || name.includes('si')) acronym = 'SI';
      else if (name.includes('adm')) acronym = 'ADM TECH';

      title = `2º ANO - MÓD. 06 - ${acronym}`;
      academicYear = '2';
      
      // Subtitle area of study from real EP
      if (acronym === 'ES') subtitle = 'Plataforma digital baseada em arquitetura orientada a serviços';
      else if (acronym === 'EC') subtitle = 'Dermolipectomia / Robótica Móvel e Visão Computacional';
      else if (acronym === 'CC') subtitle = 'Otimização e Pesquisa Operacional para Crédito';
      else if (acronym === 'SI') subtitle = 'Aplicação baseada em Processamento em Linguagem Natural';
      else if (acronym === 'ADM TECH') subtitle = 'Sistemas de Business Intelligence para tomada de decisão';
    } else if (name.includes('3º ano') || name.includes('3º') || detectedYear === '3') {
      let acronym = 'ES';
      if (name.includes('computação') || name.includes('comp')) acronym = 'EC';
      else if (name.includes('ciência') || name.includes('cc')) acronym = 'CC';
      else if (name.includes('sistemas') || name.includes('si')) acronym = 'SI';

      title = `3º ANO - MÓD. 10 - ${acronym}`;
      academicYear = '3';

      if (acronym === 'ES') subtitle = 'Esteira ágil de produção de software / Plataforma DevOps';
      else if (acronym === 'EC') subtitle = 'Aplicações para dispositivos móveis e IoT avançado';
      else if (acronym === 'CC') subtitle = 'Aplicação de redes neurais artificiais em aprendizado por reforço';
      else if (acronym === 'SI') subtitle = 'Análise Comportamental de Usuários de Interfaces Digitais';
    }

    return { title, subtitle, academicYear };
  };

  // Color-coding helpers strictly respecting segment colors on p. 68
  const getSegmentStyle = (academicYear: '1' | '2' | '3') => {
    if (academicYear === '1') {
      return {
        bg: 'bg-[#89cea5]',
        text: 'text-[#2e2640]',
        border: 'border-[#89cea5]',
        borderLight: 'border-[#89cea5]/30',
        badgeBg: 'bg-[#89cea5]/15',
        badgeText: 'text-[#066d73]',
        name: '1º Ano'
      };
    } else if (academicYear === '2') {
      return {
        bg: 'bg-[#90a5e5]',
        text: 'text-[#2e2640]',
        border: 'border-[#90a5e5]',
        borderLight: 'border-[#90a5e5]/30',
        badgeBg: 'bg-[#90a5e5]/15',
        badgeText: 'text-[#2e2640]',
        name: '2º Ano'
      };
    } else {
      return {
        bg: 'bg-[#066d73]',
        text: 'text-white',
        border: 'border-[#066d73]',
        borderLight: 'border-[#066d73]/30',
        badgeBg: 'bg-[#066d73]/15',
        badgeText: 'text-[#066d73]',
        name: '3º Ano'
      };
    }
  };

  // Helper to check if an allocation belongs to the morning shift
  const isMorning = (alloc: any) => {
    const period = String(alloc.turma?.period || '').toLowerCase();
    if (period.includes('manhã') || period.includes('manha')) return true;
    if (period.includes('tarde')) return false;
    return alloc.academicYear === '1' || alloc.academicYear === '3';
  };

  // Get active allocations for selected phase sorted by Morning (1º & 3º Ano) first
  const activeAllocations = rows
    .filter((row) => {
      if (!row.turmaId) return false;
      return turmas.some((t) => t.id === row.turmaId);
    })
    .map((row) => {
      const turma = turmas.find((t) => t.id === row.turmaId)!;
      const partner = partners.find((p) => p.id === row.partnerId);
      
      const atelieIdsStr = row.allocations[selectedPhase] || '';
      const allocatedAtelies = atelieIdsStr
          .split(',')
          .map((id) => findMatchingAtelie(id.trim(), atelies))
          .filter((a): a is Atelie => !!a);

      const atelieNames = allocatedAtelies.map((a) => a.name);
      const atelieBlocks = Array.from(new Set(allocatedAtelies.map((a) => a.block)));
      const atelieColor = allocatedAtelies[0]?.color || 'Slate';

      return {
        rowId: row.id,
        turma,
        partner,
        atelies: allocatedAtelies,
        atelieNames,
        atelieBlocks,
        atelieColor,
        ...getEpMeta(turma),
      };
    })
    .sort((a, b) => {
      const aMorning = isMorning(a);
      const bMorning = isMorning(b);
      if (aMorning && !bMorning) return -1;
      if (!aMorning && bMorning) return 1;
      // Preserve academicYear order (e.g. 1º Ano, then 3º Ano, then 2º Ano)
      return a.academicYear.localeCompare(b.academicYear);
    });

  const morningAllocations = activeAllocations.filter(alloc => isMorning(alloc));
  const afternoonAllocations = activeAllocations.filter(alloc => !isMorning(alloc));

  const activePhaseObj = PHASES.find((p) => p.key === selectedPhase);
  const activePhaseLabel = activePhaseObj ? activePhaseObj.label : selectedPhase;

  // Export to Excel
  const handleExportExcel = () => {
    if (activeAllocations.length === 0) return;

    const sheetData = activeAllocations.map((alloc) => ({
      'Turma': alloc.turma?.name || '',
      'Curso / Área de Estudo': alloc.turma?.course || '',
      'Ano Acadêmico': alloc.academicYear + 'º Ano',
      'Período': alloc.turma?.period || '',
      'Alunos': alloc.turma?.studentCount || 0,
      'Parceiro Comercial': alloc.partner?.name || 'Sem Parceiro',
      'Ateliê(s) Selecionado(s)': alloc.atelieNames.join(' & ') || 'Não alocado',
      'Bloco / Localização': alloc.atelieBlocks.join(' / ') || 'N/A',
      'Título do Desafio': alloc.title,
      'Título do Projeto': alloc.turma?.projectTitle || 'Sem título de projeto cadastrado.',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetData);

    // Apply auto column widths
    const maxLens = Object.keys(sheetData[0] || {}).map((key) => {
      let maxLen = key.length;
      sheetData.forEach((row: any) => {
        const valStr = String(row[key] || '');
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      });
      return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
    });
    ws['!cols'] = maxLens;

    XLSX.utils.book_append_sheet(wb, ws, 'Boletim EP');
    XLSX.writeFile(wb, `boletim_ep_${selectedYear}_${selectedQuarter}_${selectedPhase}.xlsx`);
  };

  // Trigger print dialog with dynamic document title for perfect PDF filename suggestion
  const handlePrint = () => {
    const originalLayout = layoutMode;
    const originalTitle = document.title;
    
    // Force layout mode to print so that the DOM section is active and fully rendered
    setLayoutMode('print');
    document.title = `Boletim EP - ${selectedYear} - ${selectedQuarter} - ${activePhaseLabel}`;
    
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error('Error printing:', err);
      } finally {
        setTimeout(() => {
          setLayoutMode(originalLayout);
          document.title = originalTitle;
        }, 150);
      }
    }, 150);
  };

  // Slide pages size configuration
  const itemsPerSlide = 4;
  
  interface SlideData {
    period: 'manhã' | 'tarde';
    allocations: typeof activeAllocations;
  }

  const slides: SlideData[] = [];

  // Morning slides
  for (let i = 0; i < morningAllocations.length; i += itemsPerSlide) {
    slides.push({
      period: 'manhã',
      allocations: morningAllocations.slice(i, i + itemsPerSlide),
    });
  }

  // Afternoon slides
  for (let i = 0; i < afternoonAllocations.length; i += itemsPerSlide) {
    slides.push({
      period: 'tarde',
      allocations: afternoonAllocations.slice(i, i + itemsPerSlide),
    });
  }

  // If no slides at all, create an empty one so we don't break
  if (slides.length === 0) {
    slides.push({
      period: 'manhã',
      allocations: [],
    });
  }

  const totalSlides = slides.length;
  const activeSlide = slides[currentSlideIndex] || slides[0] || { period: 'manhã', allocations: [] };
  const slideAllocations = activeSlide.allocations;

  return (
    <div className="space-y-6 font-sans text-slate-800" id="boletim-ep-container">
      
      {/* Dynamic Upper Header with brand elements */}
      <div className="bg-gradient-to-r from-[#2e2640] to-[#1a162b] p-6 rounded-lg text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">

        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {renderInteliLogo(true)}
          <div className="sm:border-l sm:border-white/20 sm:pl-4">
            <h2 className="font-serif text-2xl font-extrabold tracking-tight leading-none text-white">BOLETIM EP</h2>
            <p className="font-mono text-[10px] text-[#ff4545] mt-1.5 uppercase tracking-widest font-bold">
              {selectedQuarter === 'Q1' ? 'PRIMEIRO' : selectedQuarter === 'Q2' ? 'SEGUNDO' : selectedQuarter === 'Q3' ? 'TERCEIRO' : 'QUARTO'} TRIMESTRE • {selectedYear}
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="bg-[#1a162b] p-1.5 rounded-lg border border-white/10 flex items-center gap-1">
            <button
              onClick={() => setLayoutMode('ppt')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer ${
                layoutMode === 'ppt' 
                  ? 'bg-[#ff4545] text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layout size={13} />
              Apresentação Slides
            </button>
            <button
              onClick={() => setLayoutMode('print')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer ${
                layoutMode === 'print' 
                  ? 'bg-[#ff4545] text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Printer size={13} />
              Boletim A4 Oficial
            </button>
          </div>
        </div>
      </div>

      {/* HORIZONTAL TIMELINE SELECTOR FOR ALL PHASES */}
      <div className="bg-white border border-[#e6eaeb] p-4 rounded-lg shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <span className="text-[10px] font-mono text-[#ff4545] font-bold uppercase tracking-wider flex items-center gap-1">
            <Calendar size={12} /> Navegar por Ciclo / Sprints
          </span>
          <span className="text-xs text-slate-400 font-semibold">Selecione uma fase para visualizar o boletim</span>
        </div>

        {/* Timeline Horizontal List */}
        <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          {PHASES.map((p) => {
            const isSelected = selectedPhase === p.key;
            return (
              <button
                key={p.key}
                onClick={() => {
                  setSelectedPhase(p.key);
                  setCurrentSlideIndex(0);
                }}
                className={`flex-1 min-w-[130px] p-2.5 rounded-md border text-center transition-all cursor-pointer flex flex-col justify-between gap-1 relative ${
                  isSelected 
                    ? 'bg-[#2e2640] border-[#2e2640] text-white shadow-xs' 
                    : 'bg-[#e6eaeb]/30 border-slate-200 hover:border-slate-300 hover:bg-[#e6eaeb]/60 text-slate-600'
                }`}
              >
                {/* Active Indicator Pin */}
                {isSelected && (
                  <span className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full bg-[#ff4545] animate-ping"></span>
                )}
                
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                  {p.key === 'inicio' || p.key === 'kickoff' || p.key === 'fim' ? 'Etapa' : 'Ciclo'}
                </span>
                <span className={`text-xs font-bold truncate leading-tight block ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                  {p.label}
                </span>
                
                {sprintDates[p.key] ? (
                  <span className={`text-[10px] mt-1.5 font-mono font-medium block ${isSelected ? 'text-indigo-200' : 'text-indigo-600'}`}>
                    📅 {formatDate(sprintDates[p.key])}
                  </span>
                ) : (
                  <span className="text-[10px] mt-1.5 text-slate-400 font-mono italic block">
                    Sem data
                  </span>
                )}

                <div className="mt-1.5 flex justify-center">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#ff4545]' : 'bg-slate-300'}`}></span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Toolbar buttons */}
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-serif text-sm font-bold text-[#2e2640]">Fase Ativa:</span>
          <span className="font-mono text-xs font-extrabold uppercase px-2.5 py-1 rounded bg-[#ff4545]/10 text-[#ff4545] border border-[#ff4545]/20">
            {activePhaseLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={activeAllocations.length === 0}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-2 rounded transition-all cursor-pointer shadow-3xs"
          >
            <FileSpreadsheet size={13} className="text-emerald-600" />
            Exportar XLS
          </button>
          <button
            onClick={handlePrint}
            disabled={activeAllocations.length === 0}
            className="flex items-center gap-1.5 bg-[#2e2640] hover:bg-[#1a162b] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded transition-all cursor-pointer shadow-2xs"
          >
            <Printer size={13} />
            Gerar PDF / Imprimir
          </button>
        </div>
      </div>

      {/* Empty Allocations Notification */}
      {activeAllocations.length === 0 && (
        <div className="bg-white border border-[#e6eaeb] rounded-lg p-16 text-center text-slate-500 shadow-3xs">
          <HelpCircle className="mx-auto text-slate-300 mb-2.5" size={44} />
          <h3 className="font-serif text-base font-extrabold text-[#2e2640] uppercase tracking-wider">Sem alocações nesta fase</h3>
          <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed font-sans">
            Nenhuma turma possui ateliês alocados na fase <strong>{activePhaseLabel}</strong>. 
            Vá até a aba do <strong>Quadro de Sprints</strong> para vincular as turmas aos seus respectivos ateliês.
          </p>
        </div>
      )}

      {/* RENDER MODE: PPT PRESENTATION DECK (16:9 Ambient Canvas) */}
      {layoutMode === 'ppt' && activeAllocations.length > 0 && (
        <div className="space-y-4">
          <div className="relative bg-[#2e2640] rounded-xl p-8 md:p-10 shadow-lg border border-slate-800 overflow-hidden min-h-[580px] flex flex-col justify-between select-none">
            
            {/* Ambient Brand Background Elements */}
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-[#90a5e5]/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-[#ff4545]/5 rounded-full blur-3xl pointer-events-none"></div>
            {/* Elegant grid points */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
            


            {/* Slide Header */}
            <div className="relative border-b border-white/10 pb-4 flex justify-between items-end z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-[#ff4545] text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    {selectedYear} • {selectedQuarter}
                  </span>
                  <span className="font-mono text-[10px] text-[#90a5e5] font-extrabold uppercase tracking-wider">
                    Fase: {activePhaseLabel} {sprintDates[selectedPhase] ? `— ${formatDate(sprintDates[selectedPhase])}` : ''}
                  </span>
                </div>
                <h1 className="font-serif text-2xl font-black text-white mt-1.5 tracking-tight uppercase">
                  BOLETIM EP
                </h1>
              </div>
              <div className="text-right pb-1">
                <p className="font-mono text-[8px] text-slate-400 font-bold uppercase tracking-widest">Inteli</p>
                <p className="text-[10px] text-slate-200 font-bold">1º e 3º Ano • 09h às 11h</p>
                <p className="text-[10px] text-slate-200 font-bold mt-0.5">2º Ano • 14h às 16h</p>
              </div>
            </div>

            {/* Period Separator Banner inside the Slide */}
            <div className="relative flex items-center gap-2 mt-4 z-10">
              {activeSlide.period === 'manhã' ? (
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#89cea5] bg-[#89cea5]/10 border border-[#89cea5]/20 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse-subtle">
                  🌅 Período da Manhã (1º & 3º Anos)
                </span>
              ) : (
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#90a5e5] bg-[#90a5e5]/10 border border-[#90a5e5]/20 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse-subtle">
                  🌇 Período da Tarde (2º Ano)
                </span>
              )}
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                {activeSlide.period === 'manhã' ? '09h às 11h' : '14h às 16h'}
              </span>
            </div>

            {/* Slide Grid Body (4-column bento grids aligned to segment ratios) */}
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 my-4 flex-1 items-center z-10">
              {slideAllocations.map((alloc) => {
                const seg = getSegmentStyle(alloc.academicYear);
                
                return (
                  <div 
                    key={alloc.rowId} 
                    className="bg-white rounded-lg p-4 flex items-stretch gap-4 hover:shadow-md transition-all shadow-sm border-l-4 relative min-h-[170px]"
                    style={{ borderLeftColor: seg.bg.includes('[#') ? seg.bg.slice(4, -1) : '#b2b6bf' }}
                  >
                    {/* Left Frame: Partner Logo container */}
                    <div className="w-[85px] shrink-0 bg-[#e6eaeb]/30 rounded p-1.5 flex flex-col justify-center items-center border border-slate-100/80 shadow-3xs">
                      {alloc.partner ? (
                        <>
                          <img
                            src={alloc.partner.logoUrl}
                            alt={alloc.partner.name}
                            className="max-h-12 max-w-full object-contain mix-blend-multiply"
                            referrerPolicy="no-referrer"
                            onError={(e) => handleLogoError(e, alloc.partner!.name)}
                          />
                          <span className="text-[8px] text-slate-500 font-extrabold mt-2 text-center truncate w-full" title={alloc.partner.name}>
                            {alloc.partner.name}
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300 h-full">
                          <HelpCircle size={18} className="text-slate-300" />
                          <span className="text-[7px] font-bold text-slate-400 mt-1 uppercase">Sem Parceiro</span>
                        </div>
                      )}
                    </div>

                    {/* Right Frame: Project description & meta */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        {/* Segment Color-Coded Atelie Tag */}
                        <div className={`flex justify-between items-center ${seg.badgeBg} border ${seg.borderLight} px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-1.5`}>
                          <span className={seg.badgeText}>
                            {alloc.atelieNames.join(' & ') || 'Não Alocado'}
                          </span>
                          <span className="text-[8.5px] font-mono font-bold text-slate-500">
                            {alloc.atelieBlocks.map(b => {
                              return String(b).toUpperCase().replace('BLOCO', '').trim();
                            }).join(' / ') || 'N/A'}
                          </span>
                        </div>

                        {/* Title & Technical Subtitle */}
                        <h3 className="font-serif font-black text-xs text-[#2e2640] tracking-tight leading-tight">{alloc.title}</h3>
                        <p className="font-mono text-[9px] text-[#ff4545] font-bold mt-0.5 uppercase tracking-wide truncate">
                          {alloc.subtitle}
                        </p>
                        {alloc.turma && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse-subtle">
                              Curso: {cleanOrDetectCourse(alloc.turma.course, alloc.turma.courseModule, alloc.turma.name)}
                            </span>
                          </div>
                        )}

                        {/* Description */}
                        <p className="font-sans text-[11px] text-slate-600 font-medium leading-relaxed mt-2 line-clamp-3" title={alloc.turma?.projectTitle}>
                          {alloc.turma?.projectTitle || 'Nenhum título de projeto cadastrado para esta turma.'}
                        </p>
                      </div>

                      {/* Info footer */}
                      <div className="flex items-center justify-between text-[8px] text-slate-400 font-extrabold mt-2 pt-1.5 border-t border-slate-100">
                        <span className="truncate max-w-[120px] font-semibold" title={alloc.turma?.name}>
                          {alloc.turma?.name}
                        </span>
                        <span className="font-mono uppercase text-[#066d73]">
                          {alloc.turma?.studentCount || 0} alunos • {alloc.turma?.period}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pad empty spots */}
              {slideAllocations.length < itemsPerSlide && 
                Array.from({ length: itemsPerSlide - slideAllocations.length }).map((_, idx) => (
                  <div 
                    key={`empty-slide-slot-${idx}`} 
                    className="border border-dashed border-white/10 rounded-lg p-6 flex flex-col items-center justify-center text-slate-400 bg-white/5 min-h-[170px]"
                  >
                    <Layers size={20} className="text-white/10 mb-1" />
                    <span className="text-[9px] font-mono uppercase tracking-wider font-bold italic opacity-40">Lote Disponível</span>
                  </div>
                ))
              }
            </div>

            {/* Slide Footer */}
            <div className="relative border-t border-white/10 pt-4 flex items-center justify-between z-10">
              <span className="text-[9px] text-slate-300 font-bold font-mono flex items-center gap-2">
                <span>Slide {currentSlideIndex + 1} de {totalSlides}</span>
                <span className="text-white/20">•</span>
                <span className="uppercase text-slate-200">
                  {activeSlide.period === 'manhã' ? 'Período da Manhã (1º & 3º Anos)' : 'Período da Tarde (2º Ano)'}
                </span>
                <span className="text-white/20">•</span>
                <span>{activeSlide.allocations.length} Projetos</span>
              </span>

              {/* Nav buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentSlideIndex === 0}
                  onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                  className="p-1.5 bg-[#1a162b] border border-white/10 rounded text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="font-mono text-xs font-bold text-slate-200 px-2 min-w-[50px] text-center">
                  {currentSlideIndex + 1} / {totalSlides}
                </span>
                <button
                  type="button"
                  disabled={currentSlideIndex >= totalSlides - 1}
                  onClick={() => setCurrentSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1))}
                  className="p-1.5 bg-[#1a162b] border border-white/10 rounded text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  <ChevronRight size={13} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                  ESTRUTURA CORPORATIVA
                </span>
                {renderInteliLogo(true)}
              </div>
            </div>
          </div>

          {/* Sorter dots */}
          <div className="flex justify-center gap-1.5">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={`jump-${idx}`}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  currentSlideIndex === idx ? 'bg-[#ff4545] scale-125 shadow-xs' : 'bg-slate-300 hover:bg-slate-400'
                }`}
                title={`Ir para o slide ${idx + 1}`}
              ></button>
            ))}
          </div>
        </div>
      )}

      {/* RENDER MODE: PRINT LAYOUT (A4 PORTRAIT) */}
      {activeAllocations.length > 0 && (
        <div 
          className={`bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6 ${layoutMode === 'print' ? 'block' : 'hidden print:block'}`} 
          id="boletim-print-section"
        >
          
          <div className="bg-[#e6eaeb]/50 border border-slate-200 rounded-lg p-4 text-[#2e2640] text-xs flex items-start gap-3 font-medium">
            <Info size={16} className="text-[#ff4545] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Diretrizes de Impressão Oficial - Boletim EP</p>
              <p className="text-slate-500 font-sans">
                Este layout replica perfeitamente o encarte impresso do Inteli. Para gerar uma versão em PDF perfeita, clique no botão <strong>PDF / Imprimir</strong> acima e, nas opções do seu navegador, ative <strong>"Imprimir cores e imagens de plano de fundo"</strong>. Configure a orientação para "Retrato".
              </p>
            </div>
          </div>

          {/* Printable Sheet Canvas Wrapper */}
          <div className="bg-white p-6 md:p-10 rounded-lg border border-slate-200 max-w-4xl mx-auto shadow-2xs print:border-none print:p-0">
            
            {/* Header Poster conforming to Boletim EP */}
            <div className="relative text-center border-b-[3px] border-[#2e2640] pb-6 mb-8 flex flex-col items-center">

              
              <div className="mb-4">
                {renderInteliLogo(false)}
              </div>

              <h1 className="font-serif font-black text-4xl text-[#2e2640] tracking-tight leading-none print:text-[#2e2640]">
                BOLETIM EP
              </h1>
              
              <h2 className="font-serif text-sm font-black text-[#ff4545] mt-3.5 uppercase tracking-widest print:text-[#ff4545]">
                {selectedQuarter === 'Q1' ? 'PRIMEIRO' : selectedQuarter === 'Q2' ? 'SEGUNDO' : selectedQuarter === 'Q3' ? 'TERCEIRO' : 'QUARTO'} TRIMESTRE - {selectedYear}
              </h2>

              <p className="font-mono text-xs font-black text-slate-700 mt-2 uppercase tracking-wide">
                Fase: {activePhaseLabel} {sprintDates[selectedPhase] ? `— ${formatDate(sprintDates[selectedPhase])}` : ''}
              </p>

              <div className="mt-3 w-full max-w-md overflow-hidden rounded-lg border border-slate-100 shadow-xs">
                <img 
                  src={inteliCampusImg} 
                  alt="Inteli Campus" 
                  className="w-full h-44 object-cover hover:scale-102 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="w-16 h-1 bg-[#ff4545] my-4"></div>
              
              <div className="flex justify-center gap-6 mt-3 text-[10px] text-slate-400 font-bold uppercase font-mono">
                <span>Graduação 1º e 3º Ano — 09h às 11h</span>
                <span className="text-slate-300">•</span>
                <span>Graduação 2º Ano — 14h às 16h</span>
              </div>
            </div>

            {/* List of Projects (Vertical Card Ensembles) sorted by Morning (1º & 3º Anos) first and separated nicely */}
            <div className="space-y-8">
              {/* PERÍODO DA MANHÃ (1º & 3º ANOS) */}
              {morningAllocations.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#2e2640]/10 pb-2 mb-4">
                    <span className="text-[11px] font-mono font-black uppercase tracking-widest text-[#2e2640] bg-[#89cea5]/25 border border-[#89cea5]/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                      🌅 Período da Manhã (1º & 3º Anos)
                    </span>
                    <div className="h-px bg-[#2e2640]/10 flex-1"></div>
                    <span className="font-mono text-[9px] text-slate-400 font-bold uppercase">09h às 11h</span>
                  </div>
                  <div className="space-y-6">
                    {morningAllocations.map((alloc) => {
                      const seg = getSegmentStyle(alloc.academicYear);
                      return (
                        <div 
                          key={alloc.rowId} 
                          className="bg-[#e6eaeb]/10 border border-[#e6eaeb] rounded-lg overflow-hidden flex items-stretch hover:shadow-2xs transition-all relative break-inside-avoid"
                        >
                          {/* Left Frame: Corporate partner */}
                          <div className="w-[120px] shrink-0 bg-[#e6eaeb]/25 border-r border-[#e6eaeb] p-3 flex flex-col justify-center items-center">
                            {alloc.partner ? (
                              <>
                                <img
                                  src={alloc.partner.logoUrl}
                                  alt={alloc.partner.name}
                                  className="max-h-14 max-w-full object-contain mix-blend-multiply"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => handleLogoError(e, alloc.partner!.name)}
                                />
                                <span className="text-[7.5px] text-slate-500 font-bold mt-2 text-center truncate w-full" title={alloc.partner.name}>
                                  {alloc.partner.name}
                                </span>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-300 py-4 h-full">
                                <HelpCircle size={20} className="text-slate-300" />
                                <span className="text-[7px] font-bold text-slate-400 mt-1 uppercase">Sem Parceiro</span>
                              </div>
                            )}
                          </div>

                          {/* Right Frame: Project description */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            {/* Colored Segment Badge Header Band */}
                            <div className={`${seg.bg} px-4 py-1.5 flex justify-between items-center ${seg.text}`}>
                              <span className="font-mono text-[9px] font-black uppercase tracking-wider">
                                {alloc.atelieNames.join(' & ') || 'Ateliê Pendente'}
                              </span>
                              <span className="font-mono text-[8.5px] font-black uppercase bg-white/20 px-2 py-0.5 rounded tracking-wide">
                                {alloc.atelieBlocks.map(b => {
                                  return String(b).toUpperCase().replace('BLOCO', '').trim();
                                }).join(' / ') || 'N/A'}
                              </span>
                            </div>

                            {/* Card main text content */}
                            <div className="p-4 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded border ${seg.badgeBg} ${seg.borderLight} ${seg.badgeText}`}>
                                  {seg.name}
                                </span>
                                <h3 className="font-serif font-black text-sm text-[#2e2640] tracking-tight leading-tight">{alloc.title}</h3>
                              </div>
                              
                              <p className="font-mono text-[9.5px] text-[#ff4545] font-bold uppercase tracking-wider">
                                {alloc.subtitle}
                              </p>
                              {alloc.turma && (
                                <div className="mt-1.5 flex items-center gap-1">
                                  <span className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8.5px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse-subtle">
                                    Curso: {cleanOrDetectCourse(alloc.turma.course, alloc.turma.courseModule, alloc.turma.name)}
                                  </span>
                                </div>
                              )}
                              <p className="font-sans text-xs text-slate-600 font-medium leading-relaxed mt-2.5">
                                {alloc.turma?.projectTitle || 'Sem título de projeto cadastrado para esta turma.'}
                              </p>
                            </div>

                            {/* Bottom Meta */}
                            <div className="bg-[#e6eaeb]/20 border-t border-[#e6eaeb]/50 px-4 py-2 flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase font-mono">
                              <span className="truncate pr-4" title={alloc.turma?.name}>
                                Turma: {alloc.turma?.name}
                              </span>
                              <span className="shrink-0 text-slate-400 font-semibold text-[8.5px]">
                                {alloc.turma?.studentCount || 0} Alunos • Período {alloc.turma?.period || 'Manhã'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PERÍODO DA TARDE (2º ANO) */}
              {afternoonAllocations.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#2e2640]/10 pb-2 mb-4 pt-4">
                    <span className="text-[11px] font-mono font-black uppercase tracking-widest text-[#2e2640] bg-[#90a5e5]/25 border border-[#90a5e5]/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                      🌇 Período da Tarde (2º Ano)
                    </span>
                    <div className="h-px bg-[#2e2640]/10 flex-1"></div>
                    <span className="font-mono text-[9px] text-slate-400 font-bold uppercase">14h às 16h</span>
                  </div>
                  <div className="space-y-6">
                    {afternoonAllocations.map((alloc) => {
                      const seg = getSegmentStyle(alloc.academicYear);
                      return (
                        <div 
                          key={alloc.rowId} 
                          className="bg-[#e6eaeb]/10 border border-[#e6eaeb] rounded-lg overflow-hidden flex items-stretch hover:shadow-2xs transition-all relative break-inside-avoid"
                        >
                          {/* Left Frame: Corporate partner */}
                          <div className="w-[120px] shrink-0 bg-[#e6eaeb]/25 border-r border-[#e6eaeb] p-3 flex flex-col justify-center items-center">
                            {alloc.partner ? (
                              <>
                                <img
                                  src={alloc.partner.logoUrl}
                                  alt={alloc.partner.name}
                                  className="max-h-14 max-w-full object-contain mix-blend-multiply"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => handleLogoError(e, alloc.partner!.name)}
                                />
                                <span className="text-[7.5px] text-slate-500 font-bold mt-2 text-center truncate w-full" title={alloc.partner.name}>
                                  {alloc.partner.name}
                                </span>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-300 py-4 h-full">
                                <HelpCircle size={20} className="text-slate-300" />
                                <span className="text-[7px] font-bold text-slate-400 mt-1 uppercase">Sem Parceiro</span>
                              </div>
                            )}
                          </div>

                          {/* Right Frame: Project description */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            {/* Colored Segment Badge Header Band */}
                            <div className={`${seg.bg} px-4 py-1.5 flex justify-between items-center ${seg.text}`}>
                              <span className="font-mono text-[9px] font-black uppercase tracking-wider">
                                {alloc.atelieNames.join(' & ') || 'Ateliê Pendente'}
                              </span>
                              <span className="font-mono text-[8.5px] font-black uppercase bg-white/20 px-2 py-0.5 rounded tracking-wide">
                                {alloc.atelieBlocks.map(b => {
                                  return String(b).toUpperCase().replace('BLOCO', '').trim();
                                }).join(' / ') || 'N/A'}
                              </span>
                            </div>

                            {/* Card main text content */}
                            <div className="p-4 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded border ${seg.badgeBg} ${seg.borderLight} ${seg.badgeText}`}>
                                  {seg.name}
                                </span>
                                <h3 className="font-serif font-black text-sm text-[#2e2640] tracking-tight leading-tight">{alloc.title}</h3>
                              </div>
                              
                              <p className="font-mono text-[9.5px] text-[#ff4545] font-bold uppercase tracking-wider">
                                {alloc.subtitle}
                              </p>
                              {alloc.turma && (
                                <div className="mt-1.5 flex items-center gap-1">
                                  <span className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8.5px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse-subtle">
                                    Curso: {cleanOrDetectCourse(alloc.turma.course, alloc.turma.courseModule, alloc.turma.name)}
                                  </span>
                                </div>
                              )}
                              <p className="font-sans text-xs text-slate-600 font-medium leading-relaxed mt-2.5">
                                {alloc.turma?.projectTitle || 'Sem título de projeto cadastrado para esta turma.'}
                              </p>
                            </div>

                            {/* Bottom Meta */}
                            <div className="bg-[#e6eaeb]/20 border-t border-[#e6eaeb]/50 px-4 py-2 flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase font-mono">
                              <span className="truncate pr-4" title={alloc.turma?.name}>
                                Turma: {alloc.turma?.name}
                              </span>
                              <span className="shrink-0 text-slate-400 font-semibold text-[8.5px]">
                                {alloc.turma?.studentCount || 0} Alunos • Período {alloc.turma?.period || 'Tarde'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Brand Chronogram / Timeline Graphics (p. 3) */}
            <div className="mt-12 pt-8 border-t-2 border-[#e6eaeb] break-inside-avoid">
              <h4 className="font-mono font-black text-[10px] text-center text-slate-400 uppercase tracking-widest mb-6">
                Cronograma do módulo
              </h4>

              <div className="relative py-2">
                {/* Horizontal line using institutional roxo - connected behind the circles */}
                <div className="absolute top-[14px] left-8 right-8 h-0.5 bg-[#e6eaeb]"></div>
                
                {/* Timeline checkpoints styled with coral accent dots */}
                <div className="relative grid grid-cols-4 text-center gap-2">
                  <div className="space-y-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#2e2640] border-2 border-white mx-auto shadow-sm relative z-10"></div>
                    <div>
                      <h5 className="font-serif font-black text-[10px] text-[#2e2640] uppercase tracking-tight">Onboarding</h5>
                      <p className="font-mono text-[8px] text-slate-400 uppercase font-semibold">Início do Módulo</p>
                      <p className="font-mono text-[9px] text-slate-600 font-bold mt-1">
                        {sprintDates['inicio'] ? formatDate(sprintDates['inicio']) : 'Sem data'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#2e2640] border-2 border-white mx-auto shadow-sm relative z-10"></div>
                    <div>
                      <h5 className="font-serif font-black text-[10px] text-[#2e2640] uppercase tracking-tight">KickOff</h5>
                      <p className="font-mono text-[8px] text-slate-400 uppercase font-semibold">Kickoff</p>
                      <p className="font-mono text-[9px] text-slate-600 font-bold mt-1">
                        {sprintDates['kickoff'] ? formatDate(sprintDates['kickoff']) : 'Sem data'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-[#e6eaeb]/20 p-2 rounded-md border border-dashed border-[#e6eaeb] relative z-10">
                    <div className="w-3 h-3 rounded-full bg-[#ff4545] border-2 border-white mx-auto shadow-sm relative z-10"></div>
                    <div>
                      <h5 className="font-serif font-black text-[10px] text-[#ff4545] uppercase tracking-tight">Sprint</h5>
                      <div className="mt-1.5 space-y-0.5 font-mono text-[8px] text-slate-500 font-bold max-w-[130px] mx-auto text-left">
                        <div className="flex justify-between border-b border-slate-200/50 pb-0.5">
                          <span>Sprint 1:</span>
                          <span className="text-[#2e2640]">{sprintDates['sprint1'] ? formatDate(sprintDates['sprint1']) : 'Sem data'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/50 pb-0.5">
                          <span>Sprint 2:</span>
                          <span className="text-[#2e2640]">{sprintDates['sprint2'] ? formatDate(sprintDates['sprint2']) : 'Sem data'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/50 pb-0.5">
                          <span>Sprint 3:</span>
                          <span className="text-[#2e2640]">{sprintDates['sprint3'] ? formatDate(sprintDates['sprint3']) : 'Sem data'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sprint 4:</span>
                          <span className="text-[#2e2640]">{sprintDates['sprint4'] ? formatDate(sprintDates['sprint4']) : 'Sem data'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#2e2640] border-2 border-white mx-auto shadow-sm relative z-10"></div>
                    <div>
                      <h5 className="font-serif font-black text-[10px] text-[#2e2640] uppercase tracking-tight">Apresentação</h5>
                      <p className="font-mono text-[8px] text-slate-400 uppercase font-semibold">Apresentação Final</p>
                      <p className="font-mono text-[9px] text-slate-600 font-bold mt-1">
                        {sprintDates['fim'] ? formatDate(sprintDates['fim']) : 'Sem data'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom printed footer watermark */}
            <div className="mt-12 pt-4 border-t border-slate-100 flex justify-between items-center text-[8px] text-slate-400 font-mono uppercase tracking-wider">
              <span>Gerado em {new Date().toLocaleDateString('pt-BR')} • Inteli</span>
              <span>Inteli - Instituto de Tecnologia e Liderança</span>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for physical paper print optimization */}
      <style>{`
        @media print {
          /* Hide non-printable elements */
          body * {
            visibility: hidden;
          }
          #boletim-print-section, #boletim-print-section * {
            visibility: visible;
          }
          #boletim-print-section {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Eliminate all outside UI chrome from print */
          header, nav, #sub-header-bar, .flex.justify-between.items-center.gap-3, button, select {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
