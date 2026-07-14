import { useState } from 'react';
import { Turma, Partner, Atelie } from '../types';
import { getFriendlyStageName } from './TurmaManager';
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  ArrowUpDown,
  Search,
  Award
} from 'lucide-react';

interface NpsReportProps {
  turmas: Turma[];
  partners: Partner[];
  atelies: Atelie[];
}

export default function NpsReport({ turmas, partners, atelies }: NpsReportProps) {
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'geral' | 'cursos' | 'parceiros'>('geral');
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [npsFilter, setNpsFilter] = useState<'todos' | 'promotores' | 'passivos' | 'detratores'>('todos');
  const [sortField, setSortField] = useState<'name' | 'course' | 'nps'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Parse NPS scores
  const parsedTurmas = turmas.map((t) => {
    let npsNum: number | null = null;
    if (t.epNps) {
      const clean = String(t.epNps).replace('%', '').trim();
      const parsed = parseFloat(clean);
      if (!isNaN(parsed)) {
        npsNum = parsed;
      }
    }
    return {
      ...t,
      npsNumeric: npsNum,
    };
  });

  const activeNpsTurmas = parsedTurmas.filter((t) => t.npsNumeric !== null);
  const totalTurmasCount = turmas.length;
  const withNpsCount = activeNpsTurmas.length;

  const isCompletedProject = (t: Turma) => {
    if (!t.dealstage) return false;
    const friendly = getFriendlyStageName(t.dealstage);
    return friendly === "Concluído";
  };

  const completedTurmasCount = turmas.filter(isCompletedProject).length;
  const samplingDenominator = completedTurmasCount > 0 ? completedTurmasCount : turmas.length;

  // NPS Statistics Calculations
  let promotersCount = 0;
  let passivesCount = 0;
  let detractorsCount = 0;

  activeNpsTurmas.forEach((t) => {
    const score = t.npsNumeric!;

    // NPS standard categorization (Promoter >= 90 or 9 depending on scale, Detractors < 70 or 7)
    // We assume scale 0-10 or percentages. If score <= 10, scale it up to 100
    const normalizedScore = score <= 10 ? score * 10 : score;
    if (normalizedScore >= 90) {
      promotersCount++;
    } else if (normalizedScore >= 70) {
      passivesCount++;
    } else {
      detractorsCount++;
    }
  });

  const promoterPct = withNpsCount > 0 ? Math.round((promotersCount / withNpsCount) * 100) : 0;
  const passivePct = withNpsCount > 0 ? Math.round((passivesCount / withNpsCount) * 100) : 0;
  const detractorPct = withNpsCount > 0 ? Math.round((detractorsCount / withNpsCount) * 100) : 0;

  // Real NPS score: % Promoters - % Detractors
  const overallNps = promoterPct - detractorPct;

  // Partner Maps for High-Precision Resolution
  const partnerMap = new Map(partners.map((p) => [p.id, p]));
  const partnerByNameMap = new Map(partners.map((p) => [p.name.toLowerCase().trim(), p]));

  const getPartnerObject = (idOrName: string | undefined) => {
    if (!idOrName) return null;
    let p = partnerMap.get(idOrName);
    if (!p) {
      p = partnerByNameMap.get(idOrName.toLowerCase().trim());
    }
    return p;
  };

  // Aggregate stats by Course
  const courseStatsMap: Record<string, { sum: number; count: number; promoterCount: number; passiveCount: number; detractorCount: number }> = {};
  activeNpsTurmas.forEach((t) => {
    const courseName = t.course || 'Não Definido';
    if (!courseStatsMap[courseName]) {
      courseStatsMap[courseName] = { sum: 0, count: 0, promoterCount: 0, passiveCount: 0, detractorCount: 0 };
    }
    const val = t.npsNumeric!;
    const normalized = val <= 10 ? val * 10 : val;
    courseStatsMap[courseName].sum += val;
    courseStatsMap[courseName].count++;
    if (normalized >= 90) {
      courseStatsMap[courseName].promoterCount++;
    } else if (normalized >= 70) {
      courseStatsMap[courseName].passiveCount++;
    } else {
      courseStatsMap[courseName].detractorCount++;
    }
  });

  const courseStatsList = Object.entries(courseStatsMap).map(([name, stats]) => {
    const pPct = stats.count > 0 ? Math.round((stats.promoterCount / stats.count) * 100) : 0;
    const dPct = stats.count > 0 ? Math.round((stats.detractorCount / stats.count) * 100) : 0;
    const pNeutralsPct = Math.max(0, 100 - pPct - dPct);
    const npsScore = pPct - dPct;
    return {
      name,
      avgNps: npsScore,
      count: stats.count,
      promoterPct: pPct,
      detractorPct: dPct,
      passivePct: pNeutralsPct,
    };
  }).sort((a, b) => b.avgNps - a.avgNps);

  // Aggregate stats by Partner
  const partnerStatsMap: Record<string, { sum: number; count: number; promoterCount: number; passiveCount: number; detractorCount: number }> = {};
  activeNpsTurmas.forEach((t) => {
    if (!t.partnerId) return;
    const partnerObj = getPartnerObject(t.partnerId);
    const resolvedId = partnerObj ? partnerObj.id : t.partnerId;
    if (!partnerStatsMap[resolvedId]) {
      partnerStatsMap[resolvedId] = { sum: 0, count: 0, promoterCount: 0, passiveCount: 0, detractorCount: 0 };
    }
    const val = t.npsNumeric!;
    const normalized = val <= 10 ? val * 10 : val;
    partnerStatsMap[resolvedId].sum += val;
    partnerStatsMap[resolvedId].count++;
    if (normalized >= 90) {
      partnerStatsMap[resolvedId].promoterCount++;
    } else if (normalized >= 70) {
      partnerStatsMap[resolvedId].passiveCount++;
    } else {
      partnerStatsMap[resolvedId].detractorCount++;
    }
  });

  const partnerStatsList = Object.entries(partnerStatsMap).map(([partnerIdOrName, stats]) => {
    const partner = getPartnerObject(partnerIdOrName);
    const pPct = stats.count > 0 ? Math.round((stats.promoterCount / stats.count) * 100) : 0;
    const dPct = stats.count > 0 ? Math.round((stats.detractorCount / stats.count) * 100) : 0;
    const pNeutralsPct = Math.max(0, 100 - pPct - dPct);
    const npsScore = pPct - dPct;
    return {
      id: partner?.id || partnerIdOrName,
      name: partner?.name || partnerIdOrName,
      logoUrl: partner?.logoUrl || '',
      avgNps: npsScore,
      count: stats.count,
      promoterPct: pPct,
      detractorPct: dPct,
      passivePct: pNeutralsPct,
    };
  }).sort((a, b) => b.avgNps - a.avgNps);

  // Handle list sorting
  const handleSort = (field: 'name' | 'course' | 'nps') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to descending for numbers, ascending for string
    }
  };

  // Filter and sort the complete Turmas list (Only showing those with answered surveys and NPS scores)
  const filteredAndSortedTurmas = activeNpsTurmas
    .filter((t) => {
      // Search matching
      const matchesSearch = 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.projectTitle && t.projectTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.course && t.course.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Course matching
      const matchesCourse = courseFilter === '' || t.course === courseFilter;

      // NPS category filtering
      let matchesNps = true;
      if (npsFilter !== 'todos') {
        const val = t.npsNumeric;
        if (val === null) {
          matchesNps = false;
        } else {
          const normalized = val <= 10 ? val * 10 : val;
          if (npsFilter === 'promotores') matchesNps = normalized >= 90;
          else if (npsFilter === 'passivos') matchesNps = normalized >= 70 && normalized < 90;
          else if (npsFilter === 'detratores') matchesNps = normalized < 70;
        }
      }

      return matchesSearch && matchesCourse && matchesNps;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'course') {
        comparison = (a.course || '').localeCompare(b.course || '');
      } else if (sortField === 'nps') {
        const valA = a.npsNumeric !== null ? a.npsNumeric : -999;
        const valB = b.npsNumeric !== null ? b.npsNumeric : -999;
        comparison = valA - valB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Color helper for NPS display badges
  const getNpsBadgeClass = (score: number | null | string, isGroupScore = false) => {
    if (score === null || score === undefined || score === '') {
      return 'bg-slate-100 text-slate-500 border border-slate-200';
    }
    const val = typeof score === 'string' ? parseFloat(score.replace('%', '')) : score;
    if (isNaN(val)) return 'bg-slate-100 text-slate-500 border border-slate-200';

    if (isGroupScore) {
      if (val >= 75) return 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold';
      if (val >= 50) return 'bg-teal-50 text-teal-700 border border-teal-200 font-bold';
      if (val >= 0) return 'bg-amber-50 text-amber-700 border border-amber-200 font-bold';
      return 'bg-rose-50 text-rose-700 border border-rose-200 font-bold';
    } else {
      const norm = (val >= 0 && val <= 10) ? val * 10 : val;
      if (norm >= 90) return 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold';
      if (norm >= 70) return 'bg-teal-50 text-teal-700 border border-teal-200 font-bold';
      return 'bg-rose-50 text-rose-700 border border-rose-200 font-bold';
    }
  };

  const getNpsColorHex = (score: number, isGroupScore = false) => {
    if (isGroupScore) {
      if (score >= 75) return 'text-emerald-600';
      if (score >= 50) return 'text-teal-600';
      if (score >= 0) return 'text-amber-600';
      return 'text-rose-600';
    } else {
      const norm = (score >= 0 && score <= 10) ? score * 10 : score;
      if (norm >= 90) return 'text-emerald-600';
      if (norm >= 70) return 'text-teal-600';
      return 'text-rose-600';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto" id="nps-report-dashboard">
      
      {/* Dynamic Header & Context Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-[10px] font-extrabold text-indigo-600 tracking-widest uppercase">Relatórios de Qualidade</span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">Satisfação & Relatórios NPS</h2>
          <p className="text-xs text-slate-500 mt-1">Monitore o índice de satisfação das empresas parceiras sincronizado do HubSpot CRM e planeje melhorias.</p>
        </div>
      </div>

      {/* Metric Overview Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Core NPS Gauge Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NPS Geral Médio</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl sm:text-4xl font-black tracking-tight ${getNpsColorHex(overallNps, true)}`}>
                {withNpsCount > 0 ? `${overallNps}%` : 'N/A'}
              </span>
            </div>
            
            {/* NPS Zone Badge */}
            <div className="mt-2.5">
              {withNpsCount > 0 ? (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                  overallNps >= 75 ? 'bg-emerald-100 text-emerald-800' :
                  overallNps >= 50 ? 'bg-teal-100 text-teal-800' :
                  overallNps >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {overallNps >= 75 ? 'Zona de Excelência' :
                   overallNps >= 50 ? 'Zona de Qualidade' :
                   overallNps >= 0 ? 'Zona de Aperfeiçoamento' : 'Zona Crítica'}
                </span>
              ) : (
                <span className="text-slate-400 text-[10px] italic">Sem notas cadastradas</span>
              )}
            </div>
          </div>
        </div>

        {/* Sync Rate Progress Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amostragem de Respostas</span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-800">
                {withNpsCount}
              </span>
              <span className="text-xs text-slate-400 font-semibold">de {samplingDenominator} concluídos</span>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3.5 space-y-1">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                  style={{ width: `${samplingDenominator > 0 ? Math.min(100, (withNpsCount / samplingDenominator) * 100) : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>Taxa de Resposta</span>
                <span>{samplingDenominator > 0 ? Math.round(Math.min(100, (withNpsCount / samplingDenominator) * 100)) : 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Promoters Proportions Segment Bar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs sm:col-span-2 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distribuição de Promotores (NPS Segmentado)</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Award size={16} />
            </div>
          </div>
          
          <div>
            {/* Horizontal stacked percentage bar */}
            <div className="h-4 w-full bg-slate-100 rounded-md overflow-hidden flex">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${promoterPct}%` }}
                title={`Promotores: ${promoterPct}%`}
              />
              <div 
                className="bg-teal-400 h-full transition-all duration-500" 
                style={{ width: `${passivePct}%` }}
                title={`Passivos: ${passivePct}%`}
              />
              <div 
                className="bg-rose-400 h-full transition-all duration-500" 
                style={{ width: `${detractorPct}%` }}
                title={`Detratores: ${detractorPct}%`}
              />
            </div>

            {/* Legend indicators */}
            <div className="grid grid-cols-3 gap-2 mt-3.5 pt-2.5 border-t border-slate-100 text-[10px]">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0"></span>
                  <span className="font-bold text-slate-700">Promotores</span>
                </div>
                <p className="text-slate-400 font-semibold mt-0.5">{promotersCount} classes ({promoterPct}%)</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-teal-400 rounded-full shrink-0"></span>
                  <span className="font-bold text-slate-700">Passivos</span>
                </div>
                <p className="text-slate-400 font-semibold mt-0.5">{passivesCount} classes ({passivePct}%)</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-rose-400 rounded-full shrink-0"></span>
                  <span className="font-bold text-slate-700">Detratores</span>
                </div>
                <p className="text-slate-400 font-semibold mt-0.5">{detractorsCount} classes ({detractorPct}%)</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Main Analysis and Exploration Segmented Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-3xs overflow-hidden">
        
        {/* Segmented Controller Tab Headers */}
        <div className="border-b border-slate-200 bg-slate-50 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-1.5 p-1 bg-slate-200/60 rounded-lg">
            <button
              onClick={() => setActiveAnalysisTab('geral')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeAnalysisTab === 'geral' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos os Projetos
            </button>
            <button
              onClick={() => setActiveAnalysisTab('cursos')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeAnalysisTab === 'cursos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Análise por Curso
            </button>
            <button
              onClick={() => setActiveAnalysisTab('parceiros')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeAnalysisTab === 'parceiros' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Análise por Parceiro
            </button>
          </div>

          <p className="text-[11px] font-semibold text-slate-400">
            {activeAnalysisTab === 'geral' && `Exibindo ${filteredAndSortedTurmas.length} negócios cadastrados`}
            {activeAnalysisTab === 'cursos' && `Agrupado em ${courseStatsList.length} cursos acadêmicos`}
            {activeAnalysisTab === 'parceiros' && `Agrupado em ${partnerStatsList.length} parceiros corporativos`}
          </p>
        </div>

        {/* Tab 1: General Classes/Deals Exploration Table */}
        {activeAnalysisTab === 'geral' && (
          <div className="p-4 sm:p-6 space-y-4">
            
            {/* Filter controls row */}
            <div className="flex flex-col sm:flex-row gap-3">
              
              {/* Search */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Pesquisar negócios, títulos de projetos ou cursos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              {/* Course filter */}
              <div className="w-full sm:w-48">
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                >
                  <option value="">Todos os Cursos</option>
                  {Array.from(new Set(turmas.map(t => t.course).filter(Boolean))).map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              {/* NPS Category filter */}
              <div className="w-full sm:w-48">
                <select
                  value={npsFilter}
                  onChange={(e) => setNpsFilter(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                >
                  <option value="todos">Todos os NPS</option>
                  <option value="promotores">Promotores (90+)</option>
                  <option value="passivos">Passivos (70-89)</option>
                  <option value="detratores">Detratores (&lt;70)</option>
                </select>
              </div>

            </div>

            {/* Main Table view */}
            <div className="border border-slate-150 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1.5">
                        <span>Negócio / Projeto</span>
                        <ArrowUpDown size={11} />
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('course')}>
                      <div className="flex items-center gap-1.5">
                        <span>Curso Acadêmico</span>
                        <ArrowUpDown size={11} />
                      </div>
                    </th>
                    <th className="px-4 py-3">Parceiro Corporativo</th>
                    <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('nps')}>
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Nota NPS</span>
                        <ArrowUpDown size={11} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {filteredAndSortedTurmas.length > 0 ? (
                    filteredAndSortedTurmas.map((t) => {
                      const partner = getPartnerObject(t.partnerId);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-slate-900 line-clamp-1">{t.projectTitle || t.name}</p>
                            <span className="text-[10px] text-slate-400 font-semibold">{t.classCode || 'Sem Código'} • Módulo {t.courseModule || 'N/D'}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="bg-slate-100 text-slate-600 border border-slate-200/60 px-2 py-0.5 rounded text-[10px] font-bold">
                              {t.course}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {partner ? (
                              <div className="flex items-center gap-2">
                                {partner.logoUrl ? (
                                  <img 
                                    src={partner.logoUrl} 
                                    alt={partner.name} 
                                    className="w-5 h-5 rounded-full object-cover border border-slate-200 bg-white"
                                  />
                                ) : (
                                  <div className="w-5 h-5 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-[8px] font-extrabold uppercase border border-indigo-100">
                                    {partner.name.slice(0, 2)}
                                  </div>
                                )}
                                <span className="font-bold text-slate-800">{partner.name}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-semibold italic">Não Vinculado</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded text-xs font-black ${getNpsBadgeClass(t.epNps)}`}>
                              {t.epNps || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-400 font-bold italic">
                        Nenhum negócio ou projeto corresponde aos filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Tab 2: Grouped Course Analysis */}
        {activeAnalysisTab === 'cursos' && (
          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Detailed statistical list */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Ranking de NPS por Curso</h4>
                
                <div className="space-y-3.5">
                  {courseStatsList.length > 0 ? (
                    courseStatsList.map((stat, idx) => (
                      <div key={stat.name} className="p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-200 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-400 w-5">#{idx + 1}</span>
                            <span className="font-black text-slate-900 text-xs sm:text-sm">{stat.name}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-black ${getNpsBadgeClass(stat.avgNps, true)}`}>
                            NPS {stat.avgNps}%
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-100">
                          <span>{stat.count} {stat.count === 1 ? 'projeto respondido' : 'projetos respondidos'}</span>
                          <span className="text-emerald-600">{stat.promoterPct}% Promotores</span>
                          <span className="text-amber-600">{stat.passivePct}% Neutros</span>
                          <span className="text-rose-500">{stat.detractorPct}% Detratores</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic font-bold">Sem dados suficientes para análise por curso.</p>
                  )}
                </div>
              </div>

              {/* Dynamic Course Comparison Bar widget */}
              <div className="bg-slate-50 p-5 border border-slate-200 rounded-xl">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-indigo-600" />
                    Comparativo Visual de Desempenho
                  </h4>
                  <p className="text-[11px] text-slate-400">Representação visual das médias ponderadas de satisfação.</p>
                </div>

                <div className="space-y-5 mt-6">
                  {courseStatsList.map(stat => (
                    <div key={stat.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-700">{stat.name}</span>
                        <span className={getNpsColorHex(stat.avgNps, true)}>NPS {stat.avgNps}%</span>
                      </div>
                      
                      {/* Responsive HTML bar */}
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            stat.avgNps >= 75 ? 'bg-emerald-500' :
                            stat.avgNps >= 50 ? 'bg-teal-400' :
                            stat.avgNps >= 0 ? 'bg-amber-400' : 'bg-rose-400'
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, stat.avgNps))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: Grouped Partner Analysis */}
        {activeAnalysisTab === 'parceiros' && (
          <div className="p-4 sm:p-6 space-y-4">
            
            <div className="border border-slate-150 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                    <th className="px-4 py-3">Parceiro Corporativo</th>
                    <th className="px-4 py-3 text-center">Projetos Atendidos</th>
                    <th className="px-4 py-3 text-center">NPS Médio</th>
                    <th className="px-4 py-3 text-center">Status de Relacionamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {partnerStatsList.length > 0 ? (
                    partnerStatsList.map((stat) => (
                      <tr key={stat.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            {stat.logoUrl ? (
                              <img 
                                src={stat.logoUrl} 
                                alt={stat.name} 
                                className="w-6 h-6 rounded-full object-cover border border-slate-200 bg-white"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-extrabold uppercase border border-indigo-100">
                                {stat.name.slice(0, 2)}
                              </div>
                            )}
                            <span className="font-extrabold text-slate-900">{stat.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                          {stat.count}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-black ${getNpsBadgeClass(stat.avgNps, true)}`}>
                            {stat.avgNps}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {stat.avgNps >= 75 ? (
                            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 justify-center w-max mx-auto border border-emerald-150">
                              <CheckCircle size={10} /> Parceiro Promotor
                            </span>
                          ) : stat.avgNps >= 50 ? (
                            <span className="bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 justify-center w-max mx-auto border border-teal-150">
                              <CheckCircle size={10} /> Satisfeito (Neutro)
                            </span>
                          ) : stat.avgNps >= 0 ? (
                            <span className="bg-amber-50 text-amber-750 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 justify-center w-max mx-auto border border-amber-150">
                              <AlertTriangle size={10} /> Aperfeiçoamento
                            </span>
                          ) : (
                            <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 justify-center w-max mx-auto border border-rose-150 animate-pulse">
                              <AlertTriangle size={10} /> Atenção Crítica
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-400 font-bold italic">
                        Nenhum parceiro possui notas registradas no momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
