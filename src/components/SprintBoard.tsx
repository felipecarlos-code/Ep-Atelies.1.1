import React, { useState } from 'react';
import { Atelie, Turma, Partner, AllocationRow, PHASES, PhaseKey, PRESET_COLORS } from '../types';
import { findMatchingAtelie } from '../utils/atelieMatcher';
import { getFriendlyStageName } from './TurmaManager';
import { 
  Building2, 
  Users, 
  Briefcase, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  HelpCircle, 
  Check, 
  ArrowUpDown, 
  Sparkles,
  Info,
  Copy,
  X,
  Layers,
  Calendar
} from 'lucide-react';

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
};

interface SprintBoardProps {
  atelies: Atelie[];
  turmas: Turma[];
  partners: Partner[];
  rows: AllocationRow[];
  sprintDates: Record<string, string>;
  selectedYear: string;
  selectedQuarter: string;
  onUpdateSprintDates: (dates: Record<string, string>) => void;
  onAddRow: () => void;
  onUpdateRow: (row: AllocationRow) => void;
  onDeleteRow: (id: string) => void;
  onUpdateAllRows?: (updater: AllocationRow[] | ((prev: AllocationRow[]) => AllocationRow[])) => void;
}

export default function SprintBoard({
  atelies,
  turmas,
  partners,
  rows,
  sprintDates,
  selectedYear,
  selectedQuarter,
  onUpdateSprintDates,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
  onUpdateAllRows,
}: SprintBoardProps) {
  const [filterTurmaId, setFilterTurmaId] = useState<string>('all');
  const [filterPartnerId, setFilterPartnerId] = useState<string>('all');
  const [filterAtelieId, setFilterAtelieId] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTurmaSearchRowId, setActiveTurmaSearchRowId] = useState<string | null>(null);
  const [turmaSearchText, setTurmaSearchText] = useState<string>('');
  const [showDateConfig, setShowDateConfig] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{ count: number; text: string } | null>(null);

  // Helper to normalize strings for comparison (removes accents, spaces, special chars)
  const normalizeStr = (str?: string) => {
    if (!str) return '';
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "");
  };

  const isStageAllowed = (dealstage?: string): boolean => {
    if (!dealstage) return false;
    
    // Allowed phases requested by the user:
    // - Pré-Projeto
    // - Projeto
    // - Envio de Protótipos
    // - Publicação de Protótipos
    // - Patente
    // - Concluído
    const allowedStages = [
      'Pré-Projeto',
      'Projeto',
      'Envio de Protótipos',
      'Publicação de Protótipos',
      'Patente',
      'Concluído'
    ];

    const normalizedStage = normalizeStr(dealstage);
    
    return allowedStages.some(allowed => {
      const normAllowed = normalizeStr(allowed);
      if (normalizedStage === normAllowed) return true;
      
      const friendly = getFriendlyStageName(dealstage);
      if (normalizeStr(friendly) === normAllowed) return true;
      
      return false;
    });
  };

  // 1. Filter matching turmas/deals according to the rules:
  //    - applicationYear == selectedYear
  //    - applicationQuarter == selectedQuarter
  //    - dealstage is one of the allowed stages
  const matchingTurmas = turmas.filter((t) => {
    const yearMatch = t.applicationYear && String(t.applicationYear).trim() === String(selectedYear).trim();
    const quarterMatch = t.applicationQuarter && String(t.applicationQuarter).trim() === String(selectedQuarter).trim();
    const stageMatch = isStageAllowed(t.dealstage);
    return yearMatch && quarterMatch && stageMatch;
  });

  // 2. Identify which ones are NOT already present in current sprint rows (by turmaId)
  const existingTurmaIds = new Set(rows.map(r => r.turmaId).filter(Boolean));
  const missingMatchingTurmas = matchingTurmas.filter(t => !existingTurmaIds.has(t.id));
  const newMatchingDealsCount = missingMatchingTurmas.length;

  // 3. Import function
  const handleAutoImportDeals = () => {
    if (missingMatchingTurmas.length === 0) {
      setImportResult({
        count: 0,
        text: `Nenhum novo negócio encontrado para ${selectedYear} / ${selectedQuarter} nas fases especificadas.`
      });
      setTimeout(() => setImportResult(null), 4000);
      return;
    }

    // Create new rows
    const newAllocationRows: AllocationRow[] = missingMatchingTurmas.map((t, idx) => ({
      id: `row-auto-${Date.now()}-${t.id}-${idx}`,
      turmaId: t.id,
      partnerId: t.partnerId || '',
      allocations: {
        inicio: '',
        kickoff: '',
        sprint1: '',
        sprint2: '',
        sprint3: '',
        sprint4: '',
        fim: '',
      },
    }));

    if (onUpdateAllRows) {
      onUpdateAllRows((prev) => {
        // We do NOT delete any existing rows that have been populated/configured.
        // We filter out only those completely empty rows (to keep it neat), and append the new ones.
        const populatedRows = prev.filter(r => r.turmaId || r.partnerId || Object.values(r.allocations).some(Boolean));
        return [...populatedRows, ...newAllocationRows];
      });

      setImportResult({
        count: missingMatchingTurmas.length,
        text: `Sucesso! Vinculados ${missingMatchingTurmas.length} novos negócios automaticamente na visão de sprints.`
      });
      setTimeout(() => setImportResult(null), 5000);
    }
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
  

  
  // Track conflicts: map of `${phaseKey}-${atelieId}` -> count of allocations
  const getAtelieUsageMap = () => {
    const usage: Record<string, string[]> = {}; // "phase-atelieId" -> Array of Turma names
    
    rows.forEach((row) => {
      const turma = turmas.find((t) => t.id === row.turmaId);
      if (!turma) return;
      
      Object.entries(row.allocations).forEach(([phase, atelieIdsStr]) => {
        if (!atelieIdsStr) return;
        const ids = atelieIdsStr.split(',').map((s) => s.trim()).filter(Boolean);
        ids.forEach((atelieId) => {
          const matchedAtelie = findMatchingAtelie(atelieId, atelies);
          const resolvedId = matchedAtelie ? matchedAtelie.id : atelieId;
          const key = `${phase}-${resolvedId}`;
          if (!usage[key]) {
            usage[key] = [];
          }
          if (!usage[key].includes(turma.name)) {
            usage[key].push(turma.name);
          }
        });
      });
    });
    
    return usage;
  };

  const usageMap = getAtelieUsageMap();

  const handleRowTurmaChange = (rowId: string, turmaId: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (row) {
      const selectedTurma = turmas.find((t) => t.id === turmaId);
      const updatedRow = { ...row, turmaId };
      if (selectedTurma) {
        updatedRow.partnerId = selectedTurma.partnerId || '';
      }
      onUpdateRow(updatedRow);
    }
  };



  const handleCellAtelieChangeAtIndex = (rowId: string, phase: PhaseKey, index: number, newAtelieId: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (row) {
      const currentIds = row.allocations[phase] 
        ? row.allocations[phase].split(',').map((s) => s.trim()).filter(Boolean) 
        : [];
      
      if (index >= 0 && index < currentIds.length) {
        currentIds[index] = newAtelieId;
      } else {
        currentIds.push(newAtelieId);
      }
      
      const updatedAllocations = { ...row.allocations, [phase]: currentIds.join(',') };
      onUpdateRow({ ...row, allocations: updatedAllocations });
    }
  };

  const handleAddAtelieToCell = (rowId: string, phase: PhaseKey, atelieId: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (row) {
      const currentIds = row.allocations[phase] 
        ? row.allocations[phase].split(',').map((s) => s.trim()).filter(Boolean) 
        : [];
      
      if (currentIds.length < 2 && !currentIds.includes(atelieId)) {
        currentIds.push(atelieId);
        const updatedAllocations = { ...row.allocations, [phase]: currentIds.join(',') };
        onUpdateRow({ ...row, allocations: updatedAllocations });
      }
    }
  };

  const handleRemoveAtelieFromCell = (rowId: string, phase: PhaseKey, atelieIdToRemove: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (row) {
      const currentIds = row.allocations[phase] 
        ? row.allocations[phase].split(',').map((s) => s.trim()).filter(Boolean) 
        : [];
      
      const updatedIds = currentIds.filter((id) => id !== atelieIdToRemove);
      const updatedAllocations = { ...row.allocations, [phase]: updatedIds.join(',') };
      onUpdateRow({ ...row, allocations: updatedAllocations });
    }
  };

  const handlePropagateAllocations = (rowId: string, fromPhase: PhaseKey) => {
    const row = rows.find((r) => r.id === rowId);
    if (row) {
      const valueToCopy = row.allocations[fromPhase] || '';
      const fromIndex = PHASES.findIndex((p) => p.key === fromPhase);
      
      const updatedAllocations = { ...row.allocations };
      // Copy to all subsequent phases in the row
      for (let i = fromIndex + 1; i < PHASES.length; i++) {
        const nextPhaseKey = PHASES[i].key;
        updatedAllocations[nextPhaseKey] = valueToCopy;
      }
      
      onUpdateRow({ ...row, allocations: updatedAllocations });
    }
  };

  const handleReplicateAteliesToSprints = (rowId: string, atelieIds: string[]) => {
    const row = rows.find((r) => r.id === rowId);
    if (row) {
      const valueToCopy = atelieIds.join(',');
      const updatedAllocations = { ...row.allocations };
      PHASES.forEach((phase) => {
        updatedAllocations[phase.key] = valueToCopy;
      });
      onUpdateRow({ ...row, allocations: updatedAllocations });
    }
  };

  // Get only the Turmas, Partners, and Atelies that are actually present/allocated in the current rows
  const activeTurmaIds = new Set(rows.map((r) => r.turmaId).filter(Boolean));
  const activePartnerIds = new Set(rows.map((r) => r.partnerId).filter(Boolean));
  const activeAtelieIds = new Set<string>();
  rows.forEach((r) => {
    Object.values(r.allocations).forEach((val) => {
      if (val) {
        val.split(',').map((s) => s.trim()).filter(Boolean).forEach((id) => activeAtelieIds.add(id));
      }
    });
  });

  const activeTurmas = turmas
    .filter((t) => activeTurmaIds.has(t.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const activePartners = partners
    .filter((p) => activePartnerIds.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const activeAtelies = atelies
    .filter((a) => activeAtelieIds.has(a.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  // Filtering rows
  const filteredRows = rows.filter((row) => {
    if (filterTurmaId !== 'all' && row.turmaId !== filterTurmaId) return false;
    if (filterPartnerId !== 'all' && row.partnerId !== filterPartnerId) return false;
    if (filterAtelieId !== 'all') {
      const hasAtelieInSomePhase = Object.values(row.allocations).some((val) => {
        if (!val) return false;
        return val.split(',').map((s) => s.trim()).includes(filterAtelieId);
      });
      if (!hasAtelieInSomePhase) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6" id="sprint-board-root">
      
      {/* Filters and Stats Row - styled with Geometric Balance design */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Filtros rápidos:</span>
          
          {/* Turma Filter */}
          <select
            value={filterTurmaId}
            onChange={(e) => setFilterTurmaId(e.target.value)}
            className="text-xs border border-slate-200 rounded px-3 py-1.5 bg-white text-slate-700 font-semibold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all"
          >
            <option value="all">Todos os Negócios</option>
            {activeTurmas.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
 
          {/* Partner Filter */}
          <select
            value={filterPartnerId}
            onChange={(e) => setFilterPartnerId(e.target.value)}
            className="text-xs border border-slate-200 rounded px-3 py-1.5 bg-white text-slate-700 font-semibold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all"
          >
            <option value="all">Todos os Parceiros</option>
            {activePartners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
 
          {/* Atelie Filter */}
          <select
            value={filterAtelieId}
            onChange={(e) => setFilterAtelieId(e.target.value)}
            className="text-xs border border-slate-200 rounded px-3 py-1.5 bg-white text-slate-700 font-semibold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all"
          >
            <option value="all">Todos os Ateliês</option>
            {activeAtelies.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {(filterTurmaId !== 'all' || filterPartnerId !== 'all' || filterAtelieId !== 'all') && (
            <button
              onClick={() => {
                setFilterTurmaId('all');
                setFilterPartnerId('all');
                setFilterAtelieId('all');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowDateConfig(!showDateConfig)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold text-xs border transition-all cursor-pointer shadow-3xs ${
              showDateConfig 
                ? 'bg-indigo-600 text-white border-indigo-700' 
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}
          >
            <Calendar size={13} />
            {showDateConfig ? "Ocultar Calendário" : "Datas das Sprints"}
          </button>

          {onUpdateAllRows && (
            <button
              onClick={handleAutoImportDeals}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded transition-all shadow-2xs cursor-pointer"
              title={`Sincronizar automaticamente os Negócios correspondentes a ${selectedYear} ${selectedQuarter} nas fases de aplicação`}
            >
              <Sparkles size={13} className="text-emerald-200 animate-pulse" />
              Vincular Negócios ({newMatchingDealsCount})
            </button>
          )}

          <button
            onClick={onAddRow}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-1.5 rounded transition-all shadow-2xs cursor-pointer"
          >
            <Plus size={13} /> Adicionar Linha
          </button>
        </div>
      </div>

      {/* Import Feedback Alert Toast */}
      {importResult && (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-xs font-bold transition-all shadow-3xs ${
          importResult.count > 0 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : 'bg-amber-50 border border-amber-200 text-amber-800'
        }`}>
          <Sparkles size={15} className={importResult.count > 0 ? 'text-emerald-600' : 'text-amber-600'} />
          <span>{importResult.text}</span>
          <button 
            onClick={() => setImportResult(null)}
            className="ml-auto text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Smart Unlinked Deals Alert Banner */}
      {newMatchingDealsCount > 0 && (
        <div className="bg-gradient-to-r from-emerald-50/60 to-teal-50/60 border border-emerald-200/80 rounded-xl p-3.5 flex flex-wrap gap-4 items-center justify-between shadow-3xs">
          <div className="flex items-center gap-3 min-w-[280px]">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
              <Sparkles size={16} className="text-emerald-700 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900">
                Negócios Qualificados Disponíveis ({selectedYear} {selectedQuarter})
              </p>
              <p className="text-[10px] text-emerald-700 mt-0.5">
                Existem <strong className="font-extrabold">{newMatchingDealsCount}</strong> negócios no banco de dados correspondentes ao ano e trimestre desta Sprint que ainda não foram vinculados na visão.
              </p>
            </div>
          </div>
          <button
            onClick={handleAutoImportDeals}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold px-3 py-1.5 rounded shadow-2xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1"
          >
            <Check size={11} /> Vincular {newMatchingDealsCount} Negócio{newMatchingDealsCount > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {showDateConfig && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 transition-all duration-300">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-sans text-sm font-extrabold text-[#2e2640] flex items-center gap-1.5 uppercase tracking-wide">
                <Calendar size={16} className="text-[#ff4545]" />
                Calendário de Datas das Sprints
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider font-bold">
                {selectedQuarter === 'Q1' ? '1º' : selectedQuarter === 'Q2' ? '2º' : selectedQuarter === 'Q3' ? '3º' : '4º'} Trimestre • {selectedYear}
              </p>
            </div>
            <button 
              onClick={() => setShowDateConfig(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
            {PHASES.map((p) => (
              <div key={p.key} className="bg-slate-50 border border-slate-100 rounded-md p-3 space-y-2 hover:border-slate-200 transition-all">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate" title={p.label}>
                  {p.label}
                </label>
                <input
                  type="date"
                  value={sprintDates[p.key] || ''}
                  onChange={(e) => {
                    const updated = { ...sprintDates, [p.key]: e.target.value };
                    onUpdateSprintDates(updated);
                  }}
                  className="w-full text-xs bg-white border border-slate-200 rounded p-1.5 focus:border-[#ff4545] focus:ring-1 focus:ring-[#ff4545]/20 outline-none font-medium text-slate-700 cursor-pointer"
                />
              </div>
            ))}
          </div>

          <div className="bg-[#e6eaeb]/30 border border-slate-100 rounded p-3 text-[11px] text-slate-500 flex items-start gap-2 leading-relaxed">
            <Info size={14} className="text-indigo-600 shrink-0 mt-0.5" />
            <p>
              As datas cadastradas acima são vinculadas automaticamente ao <strong>{selectedQuarter === 'Q1' ? '1º' : selectedQuarter === 'Q2' ? '2º' : selectedQuarter === 'Q3' ? '3º' : '4º'} trimestre de {selectedYear}</strong>. 
              Elas aparecerão nos cabeçalhos e menus de navegação do <strong>Boletim EP</strong>, deixando o cronograma de sprints visível para toda a equipe acadêmica.
            </p>
          </div>
        </div>
      )}

      {/* Main Allocations Table / Grid - with crisp geometric lines */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden" id="sprints-table-container">
        <div 
          className="overflow-x-auto transition-all duration-200"
          style={{ paddingBottom: activeTurmaSearchRowId ? '200px' : '0px' }}
        >
          <table className="w-full text-left border-collapse table-fixed min-w-[2200px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {/* Fixed Headers with subtle geometric border and shade */}
                <th className="w-[185px] p-2.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-20 border-r border-slate-200">
                  Negócio
                </th>
                <th className="w-[185px] p-2.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-r border-slate-200">
                  Parceiro
                </th>
                <th className="w-[160px] p-2.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-r border-slate-200">
                  Ateliê
                </th>
                {/* Phase Columns */}
                {PHASES.map((phase) => {
                  const dateStr = sprintDates[phase.key];
                  const formatted = dateStr ? formatDate(dateStr) : null;
                  return (
                    <th key={phase.key} className="w-[230px] p-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-r border-slate-200 last:border-r-0">
                      <div className="flex flex-col">
                        <span className="text-slate-800 font-bold">{phase.label}</span>
                        {formatted ? (
                          <span className="text-[9px] text-indigo-600 font-mono font-bold flex items-center gap-1 mt-0.5 normal-case">
                            📅 {formatted}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic normal-case font-medium mt-0.5">
                            Data não definida
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="w-24 p-3.5 text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={PHASES.length + 4} className="p-12 text-center text-slate-500">
                    <HelpCircle className="mx-auto text-slate-300 mb-2" size={36} />
                    <p className="font-bold text-sm text-slate-700">Nenhuma linha de alocação cadastrada</p>
                    <p className="text-xs text-slate-400 mt-1">Clique no botão "Adicionar Linha" para criar um agendamento.</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const currentTurma = turmas.find((t) => t.id === row.turmaId);
                  const currentPartner = partners.find((p) => p.id === (currentTurma ? currentTurma.partnerId : row.partnerId));

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* TURMA SELECTOR CELL (Sticky column) */}
                      <td className={`p-2 sticky left-0 bg-white hover:bg-slate-50/90 transition-colors border-r border-slate-200 shadow-2xs ${activeTurmaSearchRowId === row.id ? 'z-30' : 'z-10'}`}>
                        <div className="space-y-1">
                          {activeTurmaSearchRowId === row.id ? (
                            <div className="relative">
                              <input
                                type="text"
                                value={turmaSearchText}
                                onChange={(e) => setTurmaSearchText(e.target.value)}
                                placeholder="Digitar negócio..."
                                autoFocus
                                className="w-full text-[10px] font-bold border border-indigo-600 rounded px-1.5 py-1 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none truncate"
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setActiveTurmaSearchRowId(null);
                                    setTurmaSearchText('');
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTurmaSearchRowId(null);
                                  setTurmaSearchText('');
                                }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                              >
                                <X size={10} />
                              </button>
                              
                              {/* Floating Filtered Dropdown List */}
                              <div className="absolute left-0 right-0 mt-1 max-h-44 overflow-y-auto bg-white border border-slate-200 rounded shadow-md z-30 divide-y divide-slate-150">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRowTurmaChange(row.id, '');
                                    setActiveTurmaSearchRowId(null);
                                    setTurmaSearchText('');
                                  }}
                                  className="w-full text-left text-[10px] font-extrabold text-rose-600 bg-rose-50/40 px-2 py-1.5 hover:bg-rose-50 block truncate cursor-pointer"
                                >
                                  -- Sem Negócio --
                                </button>
                                {turmas
                                  .filter((t) => {
                                    const isAlreadySelected = rows.some((r) => r.id !== row.id && r.turmaId === t.id);
                                    return !isAlreadySelected && t.name.toLowerCase().includes(turmaSearchText.toLowerCase());
                                  })
                                  .map((t) => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => {
                                        handleRowTurmaChange(row.id, t.id);
                                        setActiveTurmaSearchRowId(null);
                                        setTurmaSearchText('');
                                      }}
                                      className="w-full text-left text-[10px] font-bold px-2 py-1.5 hover:bg-indigo-50 text-slate-700 block truncate cursor-pointer"
                                      title={t.name}
                                    >
                                      {t.name}
                                    </button>
                                  ))}
                                {turmas.filter((t) => {
                                  const isAlreadySelected = rows.some((r) => r.id !== row.id && r.turmaId === t.id);
                                  return !isAlreadySelected && t.name.toLowerCase().includes(turmaSearchText.toLowerCase());
                                }).length === 0 && (
                                  <div className="p-2 text-[9px] text-slate-400 italic">Nenhum encontrado</div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setActiveTurmaSearchRowId(row.id);
                                setTurmaSearchText('');
                              }}
                              className="w-full text-[10px] font-bold border border-slate-200 rounded px-1.5 py-1 bg-white text-slate-800 cursor-pointer flex justify-between items-center hover:border-indigo-500 hover:bg-slate-50/50"
                              title="Clique para buscar negócio pelo nome"
                            >
                              <span className="truncate pr-1">
                                {currentTurma ? currentTurma.name : '🔍 Buscar negócio...'}
                              </span>
                              <span className="text-[7px] text-slate-400">▼</span>
                            </div>
                          )}
                          {currentTurma && (
                            <div className="px-1 text-center">
                              <span className="inline-flex items-center text-[8px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded uppercase tracking-wider max-w-full truncate" title={`${currentTurma.course} (${currentTurma.period})`}>
                                {currentTurma.period || 'Sem Turno'}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* PARTNER CELL (Read-only, automatically brought from Business/Turma) */}
                      <td className="p-2 border-r border-slate-200 bg-slate-50/20">
                        {currentPartner ? (
                          <div className="flex flex-col items-center gap-1.5 p-2 bg-white rounded-lg border border-slate-150 shadow-4xs">
                            <img
                              src={currentPartner.logoUrl}
                              alt={currentPartner.name}
                              className="w-12 h-12 object-contain rounded border border-slate-200 bg-white p-1 shadow-4xs shrink-0"
                              referrerPolicy="no-referrer"
                              onError={(e) => handleLogoError(e, currentPartner.name)}
                            />
                            <span className="text-[10px] font-extrabold text-slate-800 text-center max-w-[150px] line-clamp-2 leading-tight" title={currentPartner.name}>
                              {currentPartner.name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-3 border border-dashed border-slate-200 rounded-lg text-slate-400 bg-slate-50/50">
                            <Building2 size={16} className="text-slate-300 mb-1" />
                            <span className="text-[9px] font-bold text-center leading-snug">
                              {currentTurma ? 'Sem parceiro vinculado' : 'Definido no negócio'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* ATELIE LANE (From Business Registration / Cadastro de Negócios) */}
                      <td className="p-2 border-r border-slate-200 bg-slate-50/10 text-xs">
                        <div className="flex flex-col gap-2 justify-between h-full min-h-[90px]">
                          <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
                            {currentTurma && currentTurma.epAtelie && currentTurma.epAtelie.length > 0 ? (
                              currentTurma.epAtelie.map((atelieIdOrName) => {
                                const foundAtelie = findMatchingAtelie(atelieIdOrName, atelies);
                                const name = foundAtelie ? foundAtelie.name : atelieIdOrName;
                                const block = foundAtelie ? ` (${foundAtelie.block})` : '';
                                return (
                                  <span 
                                    key={atelieIdOrName}
                                    className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded text-[9px] uppercase tracking-wide truncate max-w-full block"
                                    title={`${name}${block}`}
                                  >
                                    {name}{block}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Nenhum ateliê</span>
                            )}
                          </div>
                          
                          {currentTurma && currentTurma.epAtelie && currentTurma.epAtelie.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleReplicateAteliesToSprints(row.id, currentTurma.epAtelie!)}
                              className="w-full mt-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border border-indigo-200 rounded py-1 px-1.5 flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              title="Alocar este ateliê em todas as fases / sprints desta linha"
                            >
                              <Copy size={9} />
                              Replicar nas Sprints
                            </button>
                          )}
                        </div>
                      </td>

                      {/* SPRINT PHASE CELLS */}
                      {PHASES.map((phase) => {
                        const selectedAtelieIds = row.allocations[phase.key]
                          ? row.allocations[phase.key].split(',').map((s) => s.trim()).filter(Boolean)
                          : [];

                        // Find all Atelie IDs allocated to other rows in this phase to prevent duplicate selection
                        const otherRowsAllocatedIds = rows
                          .filter((r) => r.id !== row.id)
                          .reduce<string[]>((acc, r) => {
                            const val = r.allocations[phase.key];
                            if (val) {
                              const ids = val.split(',').map((s) => s.trim()).filter(Boolean);
                              acc.push(...ids);
                            }
                            return acc;
                          }, []);

                        return (
                          <td key={phase.key} className="p-3 border-r border-slate-200 last:border-r-0 align-top">
                            {selectedAtelieIds.length > 0 ? (
                              <div className="space-y-3">
                                {/* Summed capacity and students above the card */}
                                {(() => {
                                  const compCheck = (() => {
                                    if (selectedAtelieIds.length <= 1) {
                                      const singleAtelie = findMatchingAtelie(selectedAtelieIds[0], atelies);
                                      return { isComposable: true, totalCapacity: singleAtelie ? singleAtelie.capacity : 0 };
                                    }

                                    let allConnected = true;
                                    let disconnectedAtelies: string[] = [];

                                    for (let i = 0; i < selectedAtelieIds.length; i++) {
                                      const at1 = findMatchingAtelie(selectedAtelieIds[i], atelies);
                                      if (!at1) continue;

                                      let hasConnection = false;
                                      for (let j = 0; j < selectedAtelieIds.length; j++) {
                                        if (i === j) continue;
                                        const at2 = findMatchingAtelie(selectedAtelieIds[j], atelies);
                                        if (!at2) continue;

                                        const isDirectlyLinked = 
                                          (at1.composableWith || []).includes(at2.id) || 
                                          (at2.composableWith || []).includes(at1.id);

                                        if (isDirectlyLinked) {
                                          hasConnection = true;
                                          break;
                                        }
                                      }

                                      if (!hasConnection) {
                                        allConnected = false;
                                        if (!disconnectedAtelies.includes(at1.name)) {
                                          disconnectedAtelies.push(at1.name);
                                        }
                                      }
                                    }

                                    const sumCapacity = selectedAtelieIds.reduce((sum, id) => {
                                      const a = findMatchingAtelie(id, atelies);
                                      return sum + (a ? a.capacity : 0);
                                    }, 0);

                                    return { 
                                      isComposable: allConnected, 
                                      totalCapacity: sumCapacity, 
                                      disconnectedAtelies 
                                    };
                                  })();

                                  // If they are not composable, the actual capacity cannot be combined, but we still display what is configured
                                  const totalCapacity = compCheck.totalCapacity;
                                  const studentCount = currentTurma ? (currentTurma.studentCount || 0) : 0;
                                  const isInsufficient = totalCapacity < studentCount || !compCheck.isComposable;
                                  const balance = totalCapacity - studentCount;

                                  return (
                                    <div className="space-y-1.5">
                                      {/* Main Capacity Status Bar */}
                                      <div className={`flex items-center justify-between text-[9.5px] font-extrabold px-2 py-1.5 rounded border uppercase tracking-wider ${
                                        isInsufficient 
                                          ? 'bg-rose-50 border-rose-200 text-rose-700' 
                                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                      }`}>
                                        <span className="flex items-center gap-1.5">
                                          {isInsufficient ? (
                                            <AlertTriangle size={11} className="text-rose-600 shrink-0" />
                                          ) : (
                                            <Check size={11} className="text-emerald-600 shrink-0" />
                                          )}
                                          Capacidade: {totalCapacity}/{studentCount}
                                        </span>
                                        <span className="font-black">
                                          {balance >= 0 && compCheck.isComposable ? `+${balance} sobram` : `${balance} vagas`}
                                        </span>
                                      </div>

                                      {/* Composable Status Indicator */}
                                      {selectedAtelieIds.length > 1 && (
                                        compCheck.isComposable ? (
                                          <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-150 rounded px-2 py-1 text-[8.5px] font-extrabold text-indigo-700 uppercase tracking-wide">
                                            <Layers size={10} className="text-indigo-500 shrink-0" />
                                            <span>🔗 Ateliês Componíveis Unidos (União Física Ativa)</span>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col gap-0.5 bg-amber-50 border border-amber-200 rounded p-1.5 text-[8.5px] font-bold text-amber-800 leading-tight">
                                            <span className="flex items-center gap-1 uppercase tracking-wider text-amber-900">
                                              <AlertTriangle size={11} className="text-amber-600 shrink-0" />
                                              ⚠️ Salas Separadas (Não se integram)
                                            </span>
                                            <span className="font-normal text-slate-500">
                                              Os ateliês não estão configurados como componíveis no cadastro. A capacidade não pode ser somada.
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  );
                                })()}

                                {selectedAtelieIds.map((selectedAtelieId, index) => {
                                  const selectedAtelie = findMatchingAtelie(selectedAtelieId, atelies);
                                  const isMissing = !selectedAtelie;
                                  
                                  const atelieObj = selectedAtelie || {
                                    id: selectedAtelieId,
                                    name: selectedAtelieId.startsWith('atelie-') 
                                      ? selectedAtelieId.replace('atelie-', '').toUpperCase().replace(/-/g, ' ') 
                                      : selectedAtelieId,
                                    block: 'Importado',
                                    capacity: 0,
                                    color: 'Rose'
                                  };

                                  // Check for conflicts using resolved ID
                                  const resolvedId = selectedAtelie ? selectedAtelie.id : selectedAtelieId;
                                  const conflictKey = `${phase.key}-${resolvedId}`;
                                  const sharingTurmas = usageMap[conflictKey] || [];
                                  const hasConflict = sharingTurmas.length > 1;

                                  const colorPreset = isMissing
                                    ? { bg: 'bg-amber-50 border-amber-300 border-dashed text-amber-900', badge: 'bg-amber-100 text-amber-800' }
                                    : (PRESET_COLORS.find((p) => p.name === selectedAtelie.color) || PRESET_COLORS[0]);

                                  return (
                                    <div 
                                      key={`${selectedAtelieId}-${index}`}
                                      className={`rounded border p-3 space-y-2 relative transition-all group shadow-xs ${colorPreset?.bg || 'bg-slate-50 border-slate-200 text-slate-700'}`}
                                      id={`card-${row.id}-${phase.key}-${index}`}
                                    >
                                      {/* Top Line: Classroom/Block Room Badge */}
                                      <div className="flex items-center justify-between gap-1">
                                        {isMissing ? (
                                          <span className="text-[8.5px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-0.5">
                                            <AlertTriangle size={10} className="shrink-0" /> Não Cadastrado
                                          </span>
                                        ) : (
                                          <div />
                                        )}
                                        <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded ${colorPreset?.badge || 'bg-slate-200 text-slate-700'} shrink-0 truncate uppercase tracking-wider`}>
                                          {atelieObj.block}
                                        </span>
                                      </div>

                                      {/* Class/Turma Label */}
                                      <div className="text-[9.5px] font-semibold text-slate-500 line-clamp-1 truncate leading-none" title={currentTurma?.name || 'Turma não definida'}>
                                        {currentTurma ? currentTurma.name : 'Sem Turma'}
                                      </div>

                                      {/* Ateliê Label - Main Focus */}
                                      <div className="flex items-center gap-1.5 mt-1.5 text-xs font-extrabold text-slate-800 bg-white/60 p-1.5 rounded border border-black/5">
                                        <Building2 size={13} className="shrink-0 text-slate-600" />
                                        <span className="truncate">{atelieObj.name}</span>
                                      </div>

                                      {/* Change Inline Selector Dropdown on Hover/Focus */}
                                      <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between gap-1">
                                        <select
                                          value={selectedAtelie ? selectedAtelie.id : selectedAtelieId}
                                          onChange={(e) => handleCellAtelieChangeAtIndex(row.id, phase.key, index, e.target.value)}
                                          className="bg-transparent text-[10px] font-semibold outline-none text-slate-600 hover:text-slate-900 cursor-pointer max-w-[85px] truncate"
                                        >
                                          {isMissing && (
                                            <option value={selectedAtelieId} disabled className="text-slate-400 font-normal">
                                              {atelieObj.name}
                                            </option>
                                          )}
                                          {atelies
                                            .filter((a) => {
                                              const isCurrent = a.id === (selectedAtelie ? selectedAtelie.id : selectedAtelieId);
                                              if (isCurrent) return true;
                                              if (selectedAtelieIds.length === 2) {
                                                const otherIndex = 1 - index;
                                                const otherId = selectedAtelieIds[otherIndex];
                                                const otherAtelie = findMatchingAtelie(otherId, atelies);
                                                return otherAtelie && (otherAtelie.composableWith || []).includes(a.id);
                                              }
                                              return true;
                                            })
                                            .map((a) => {
                                              const isAllocatedElsewhere = otherRowsAllocatedIds.includes(a.id);
                                              const isCurrent = a.id === (selectedAtelie ? selectedAtelie.id : selectedAtelieId);
                                              
                                              // Calculate tentative capacity if changed to 'a'
                                              const otherAteliesCapacity = selectedAtelieIds
                                                .filter((_, idx) => idx !== index)
                                                .reduce((sum, id) => {
                                                  const at = findMatchingAtelie(id, atelies);
                                                  return sum + (at ? at.capacity : 0);
                                                }, 0);
                                              const tentativeCapacity = otherAteliesCapacity + a.capacity;
                                              const isCapacityLow = currentTurma && tentativeCapacity < (currentTurma.studentCount || 0);

                                              return (
                                                <option 
                                                  key={a.id} 
                                                  value={a.id} 
                                                  disabled={isAllocatedElsewhere && !isCurrent}
                                                  className={isAllocatedElsewhere && !isCurrent ? "text-slate-400 font-normal" : "text-slate-900 font-semibold"}
                                                >
                                                  {a.name} ({a.capacity} vag.){isAllocatedElsewhere && !isCurrent ? " - Em uso" : ""}{isCapacityLow && !isCurrent ? " - Cap. Baixa" : ""}
                                                </option>
                                              );
                                            })
                                          }
                                        </select>

                                        <button
                                          onClick={() => handleRemoveAtelieFromCell(row.id, phase.key, selectedAtelieId)}
                                          className="text-[9px] text-red-500 hover:text-red-700 hover:underline cursor-pointer font-extrabold uppercase tracking-wider"
                                          title="Remover alocação"
                                        >
                                          Sair
                                        </button>
                                      </div>

                                      {/* Conflict Warning Badge */}
                                      {hasConflict && (
                                        <div 
                                          className="absolute -top-2 -right-1 bg-amber-500 text-white rounded-full p-1 shadow-xs hover:bg-amber-600 transition-colors cursor-help group/tooltip"
                                          title={`Conflito! O Ateliê está compartilhado no mesmo período por: ${sharingTurmas.join(', ')}`}
                                        >
                                          <AlertTriangle size={9} />
                                          <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tooltip:block bg-slate-900 text-white text-[10px] rounded p-2.5 w-48 z-30 leading-tight shadow-md">
                                            <span className="font-bold block mb-1 text-amber-300">⚠️ Conflito de Espaço:</span>
                                            Compartilhado por:<br/>
                                            {sharingTurmas.map((name, i) => (
                                              <span key={i} className="block font-medium">• {name}</span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                {/* If 1 Atelie is allocated, allow adding a 2nd one */}
                                {selectedAtelieIds.length === 1 && (
                                  <div className="border border-dashed border-slate-200 hover:border-indigo-300 bg-slate-50/40 hover:bg-white rounded px-2 py-1.5 flex items-center justify-center transition-all">
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleAddAtelieToCell(row.id, phase.key, e.target.value);
                                        }
                                      }}
                                      className="text-[9.5px] font-extrabold text-slate-400 bg-transparent border-0 outline-none w-full text-center cursor-pointer hover:text-indigo-600 transition-colors uppercase tracking-wider"
                                    >
                                      <option value="">+ 2º Ateliê</option>
                                      {atelies
                                        .filter(a => !selectedAtelieIds.includes(a.id))
                                        .filter((a) => {
                                          const firstAtelie = findMatchingAtelie(selectedAtelieIds[0], atelies);
                                          return firstAtelie && (firstAtelie.composableWith || []).includes(a.id);
                                        })
                                        .map((a) => {
                                          const isAllocatedElsewhere = otherRowsAllocatedIds.includes(a.id);
                                          
                                          // Calculate combined capacity
                                          const firstAtelieCapacity = selectedAtelieIds.reduce((sum, id) => {
                                            const at = findMatchingAtelie(id, atelies);
                                            return sum + (at ? at.capacity : 0);
                                          }, 0);
                                          const combinedCapacity = firstAtelieCapacity + a.capacity;
                                          const isCapacityLow = currentTurma && combinedCapacity < (currentTurma.studentCount || 0);

                                          return (
                                            <option 
                                              key={a.id} 
                                              value={a.id} 
                                              disabled={isAllocatedElsewhere}
                                              className={isAllocatedElsewhere ? "text-slate-400 font-normal" : "text-slate-900 font-semibold"}
                                            >
                                              {a.name} ({a.capacity} vag.){isAllocatedElsewhere ? " - Em uso" : ""}{isCapacityLow ? " - Cap. Baixa" : ""}
                                            </option>
                                          );
                                        })
                                      }
                                    </select>
                                  </div>
                                )}
                                
                                {/* Propagate button to copy this cell's allocations to all subsequent phases */}
                                {phase.key !== PHASES[PHASES.length - 1].key && (
                                  <div className="pt-2 border-t border-slate-100 flex justify-center">
                                    <button
                                      onClick={() => handlePropagateAllocations(row.id, phase.key)}
                                      className="w-full text-[9px] text-indigo-600 hover:text-white hover:bg-indigo-600 font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-1 bg-indigo-50 border border-indigo-100 py-1 rounded transition-all cursor-pointer"
                                      title="Replicar este(s) Ateliê(s) para todas as próximas Sprints desta linha"
                                    >
                                      <Copy size={10} />
                                      Clonar p/ Próximas
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* EMPTY ASSIGNMENT TRIGGER CELL */
                              <div className="h-full min-h-[90px] flex flex-col items-center justify-center border border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/40 hover:bg-white rounded p-2 transition-all group">
                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAddAtelieToCell(row.id, phase.key, e.target.value);
                                    }
                                  }}
                                  className="text-[10px] font-extrabold text-slate-400 bg-transparent border-0 outline-none w-full text-center cursor-pointer group-hover:text-indigo-600 transition-colors"
                                >
                                  <option value="">+ ALOCAR</option>
                                  {atelies.map((a) => {
                                    const isAllocatedElsewhere = otherRowsAllocatedIds.includes(a.id);
                                    const isCapacityLow = currentTurma && a.capacity < (currentTurma.studentCount || 0);
                                    return (
                                      <option 
                                        key={a.id} 
                                        value={a.id} 
                                        disabled={isAllocatedElsewhere}
                                        className={isAllocatedElsewhere ? "text-slate-400 font-normal" : "text-slate-900 font-semibold"}
                                      >
                                        {a.name} ({a.capacity} vag.){isAllocatedElsewhere ? " - Em uso" : ""}{isCapacityLow ? " - Cap. Baixa" : ""}
                                      </option>
                                    );
                                  })}
                                </select>
                                <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wider mt-1 group-hover:text-indigo-400 transition-colors">Disponível</span>
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* ACTIONS COLUMN */}
                      <td className="p-3 text-center min-w-[120px]">
                        {deleteConfirmId === row.id ? (
                          <div className="flex items-center justify-center gap-1 bg-rose-50 border border-rose-100 p-0.5 rounded shadow-2xs animate-fade-in inline-flex">
                            <span className="text-[9px] font-extrabold text-rose-700 uppercase tracking-wider px-1">Excluir?</span>
                            <button
                              onClick={() => {
                                onDeleteRow(row.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-extrabold uppercase tracking-wider cursor-pointer"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[9px] font-extrabold uppercase tracking-wider cursor-pointer"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setDeleteConfirmId(row.id)}
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
                              title="Excluir linha de cronograma"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick guide and info banner */}
      <div className="bg-indigo-50 border border-indigo-100 rounded p-4 flex gap-3 items-start">
        <Info className="text-indigo-600 shrink-0 mt-0.5" size={16} />
        <div className="space-y-1">
          <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider leading-none">Como funciona a grade de Sprints?</h4>
          <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
            Cada linha representa um cronograma completo para uma <strong>Turma</strong> e seu respectivo <strong>Parceiro Corporativo</strong>. 
            Em cada fase (desde o início do módulo até o fim), escolha qual <strong>Ateliê</strong> físico a turma usará. O sistema gera automaticamente um 
            card inteligente exibindo o logotipo da empresa e alertará com um ícone de aviso <span className="inline-block bg-amber-500 text-white rounded p-0.5 text-[8px]"><AlertTriangle size={8}/></span> se houver sobreposição de salas na mesma Sprint!
          </p>
        </div>
      </div>



    </div>
  );
}
