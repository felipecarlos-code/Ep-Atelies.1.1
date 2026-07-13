import { useState, useEffect } from 'react';
import { Turma, Partner, Atelie } from '../types';
import { 
  BarChart3, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  Briefcase, 
  Building,
  ArrowUpDown,
  Search,
  Filter,
  BrainCircuit,
  Maximize2,
  RefreshCw,
  Award
} from 'lucide-react';

interface NpsReportProps {
  turmas: Turma[];
  partners: Partner[];
  atelies: Atelie[];
}

// Simple helper to parse Markdown headings, lists, bold text, and paragraphs into styled HTML
function SimpleMarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split('\n');
  return (
    <div className="space-y-4 text-slate-700 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        
        // Headers
        if (trimmed.startsWith('###')) {
          return (
            <h4 key={idx} className="text-sm font-bold text-slate-900 mt-6 mb-2 uppercase tracking-wider border-l-4 border-indigo-500 pl-3">
              {trimmed.replace('###', '').trim()}
            </h4>
          );
        }
        if (trimmed.startsWith('##')) {
          return (
            <h3 key={idx} className="text-base font-extrabold text-indigo-950 mt-8 mb-3 uppercase tracking-wide border-b border-indigo-100 pb-1 flex items-center gap-2">
              <span>{trimmed.replace('##', '').trim()}</span>
            </h3>
          );
        }

        // Bullet list item
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const text = trimmed.substring(1).trim();
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-3 py-0.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 shrink-0"></span>
              <p className="flex-1">{renderFormattedText(text)}</p>
            </div>
          );
        }

        // Empty lines
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-slate-650 leading-relaxed text-justify">
            {renderFormattedText(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// Helper to render bold text inside line strings
function renderFormattedText(text: string) {
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-extrabold text-slate-900">{part}</strong>;
    }
    // Also handle code spans like `app_state`
    const codeParts = part.split('`');
    if (codeParts.length > 1) {
      return codeParts.map((cp, cIdx) => {
        if (cIdx % 2 === 1) {
          return <code key={cIdx} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded font-mono text-xs">{cp}</code>;
        }
        return cp;
      });
    }
    return part;
  });
}

export default function NpsReport({ turmas, partners, atelies }: NpsReportProps) {
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'geral' | 'cursos' | 'parceiros'>('geral');
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [npsFilter, setNpsFilter] = useState<'todos' | 'promotores' | 'passivos' | 'detratores' | 'sem_nps'>('todos');
  const [sortField, setSortField] = useState<'name' | 'course' | 'nps'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // AI Generation States
  const [aiReport, setAiReport] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

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

  // NPS Statistics Calculations
  let overallNps = 0;
  let promotersCount = 0;
  let passivesCount = 0;
  let detractorsCount = 0;

  activeNpsTurmas.forEach((t) => {
    const score = t.npsNumeric!;
    overallNps += score;

    // NPS standard categorization (Promoter >= 90 or 9 depending on scale, Detractors < 70 or 7)
    // We assume scale 0-100 or percentages. If score <= 10, scale it up to 100
    const normalizedScore = score <= 10 ? score * 10 : score;
    if (normalizedScore >= 90) {
      promotersCount++;
    } else if (normalizedScore >= 70) {
      passivesCount++;
    } else {
      detractorsCount++;
    }
  });

  if (withNpsCount > 0) {
    overallNps = Math.round((overallNps / withNpsCount) * 10) / 10;
  }

  const promoterPct = withNpsCount > 0 ? Math.round((promotersCount / withNpsCount) * 100) : 0;
  const passivePct = withNpsCount > 0 ? Math.round((passivesCount / withNpsCount) * 100) : 0;
  const detractorPct = withNpsCount > 0 ? Math.round((detractorsCount / withNpsCount) * 100) : 0;

  // Partner Map for Name Resolution
  const partnerMap = new Map(partners.map((p) => [p.id, p]));

  // AI Loading Steps Animation Text
  const loadingSteps = [
    'Carregando dados das turmas e negócios do HubSpot...',
    'Calculando distribuições estatísticas por cursos e parceiros corporativos...',
    'Cruzando notas de satisfação com históricos de Sprints anteriores...',
    'Consultando modelo inteligente Gemini-3.5-flash...',
    'Redigindo insights estratégicos e sugestões de relatórios personalizados...'
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoadingAi) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoadingAi]);

  // Call API for AI Analysis
  const handleGenerateAiAnalysis = async () => {
    setIsLoadingAi(true);
    setLoadingStep(0);
    try {
      const res = await fetch('/api/nps/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          turmas,
          partners,
          atelies,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAiReport(data.analysis);
          setIsAiGenerated(true);
        } else {
          setAiReport(`### Erro na Geração\nNão foi possível gerar a análise automatizada. Motivo: ${data.error || 'Erro desconhecido.'}`);
        }
      } else {
        setAiReport(`### Erro de Rede\nErro ao se conectar ao serviço inteligente (HTTP ${res.status}).`);
      }
    } catch (err: any) {
      setAiReport(`### Erro de Conexão\nFalha ao enviar a requisição para análise: ${err.message || err}`);
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Auto-run first local analysis or load on mount
  useEffect(() => {
    // Generate a quick local analysis first
    const runInitialLocalLoad = async () => {
      setIsLoadingAi(true);
      setLoadingStep(0);
      try {
        const res = await fetch('/api/nps/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ turmas, partners, atelies }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setAiReport(data.analysis);
            setIsAiGenerated(data.isAi || false);
          }
        }
      } catch (err) {
        console.error('Error loading initial NPS summary:', err);
      } finally {
        setIsLoadingAi(false);
      }
    };

    if (turmas.length > 0) {
      runInitialLocalLoad();
    }
  }, [turmas.length]);

  // Aggregate stats by Course
  const courseStatsMap: Record<string, { sum: number; count: number; promoterCount: number; detractorCount: number }> = {};
  activeNpsTurmas.forEach((t) => {
    const courseName = t.course || 'Não Definido';
    if (!courseStatsMap[courseName]) {
      courseStatsMap[courseName] = { sum: 0, count: 0, promoterCount: 0, detractorCount: 0 };
    }
    const val = t.npsNumeric!;
    const normalized = val <= 10 ? val * 10 : val;
    courseStatsMap[courseName].sum += val;
    courseStatsMap[courseName].count++;
    if (normalized >= 90) courseStatsMap[courseName].promoterCount++;
    if (normalized < 70) courseStatsMap[courseName].detractorCount++;
  });

  const courseStatsList = Object.entries(courseStatsMap).map(([name, stats]) => {
    return {
      name,
      avgNps: Math.round((stats.sum / stats.count) * 10) / 10,
      count: stats.count,
      promoterPct: Math.round((stats.promoterCount / stats.count) * 100),
      detractorPct: Math.round((stats.detractorCount / stats.count) * 100),
    };
  }).sort((a, b) => b.avgNps - a.avgNps);

  // Aggregate stats by Partner
  const partnerStatsMap: Record<string, { sum: number; count: number; promoterCount: number; detractorCount: number }> = {};
  activeNpsTurmas.forEach((t) => {
    if (!t.partnerId) return;
    if (!partnerStatsMap[t.partnerId]) {
      partnerStatsMap[t.partnerId] = { sum: 0, count: 0, promoterCount: 0, detractorCount: 0 };
    }
    const val = t.npsNumeric!;
    const normalized = val <= 10 ? val * 10 : val;
    partnerStatsMap[t.partnerId].sum += val;
    partnerStatsMap[t.partnerId].count++;
    if (normalized >= 90) partnerStatsMap[t.partnerId].promoterCount++;
    if (normalized < 70) partnerStatsMap[t.partnerId].detractorCount++;
  });

  const partnerStatsList = Object.entries(partnerStatsMap).map(([partnerId, stats]) => {
    const partner = partnerMap.get(partnerId);
    return {
      id: partnerId,
      name: partner?.name || 'Parceiro Sincronizado',
      logoUrl: partner?.logoUrl || '',
      avgNps: Math.round((stats.sum / stats.count) * 10) / 10,
      count: stats.count,
      promoterPct: Math.round((stats.promoterCount / stats.count) * 100),
      detractorPct: Math.round((stats.detractorCount / stats.count) * 100),
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

  // Filter and sort the complete Turmas list
  const filteredAndSortedTurmas = parsedTurmas
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
        if (npsFilter === 'sem_nps') {
          matchesNps = val === null;
        } else if (val === null) {
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
  const getNpsBadgeClass = (score: number | null | string) => {
    if (score === null || score === undefined || score === '') {
      return 'bg-slate-100 text-slate-500 border border-slate-200';
    }
    const val = typeof score === 'string' ? parseFloat(score.replace('%', '')) : score;
    if (isNaN(val)) return 'bg-slate-100 text-slate-500 border border-slate-200';

    const norm = val <= 10 ? val * 10 : val;
    if (norm >= 90) return 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold';
    if (norm >= 70) return 'bg-teal-50 text-teal-700 border border-teal-200 font-bold';
    return 'bg-rose-50 text-rose-700 border border-rose-200 font-bold';
  };

  const getNpsColorHex = (score: number) => {
    const norm = score <= 10 ? score * 10 : score;
    if (norm >= 90) return 'text-emerald-600';
    if (norm >= 70) return 'text-teal-600';
    return 'text-rose-600';
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

        {/* Action Button for AI Strategic Report */}
        <button
          onClick={handleGenerateAiAnalysis}
          disabled={isLoadingAi}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-950 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          {isLoadingAi ? (
            <RefreshCw size={13} className="animate-spin text-indigo-400" />
          ) : (
            <Sparkles size={13} className="text-amber-400" />
          )}
          <span>{isLoadingAi ? 'Analisando dados...' : 'Gerar Análise Estratégica IA'}</span>
        </button>
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
              <span className={`text-3xl sm:text-4xl font-black tracking-tight ${getNpsColorHex(overallNps)}`}>
                {withNpsCount > 0 ? overallNps : 'N/A'}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ 100</span>
            </div>
            
            {/* NPS Zone Badge */}
            <div className="mt-2.5">
              {withNpsCount > 0 ? (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                  overallNps >= 90 ? 'bg-emerald-100 text-emerald-800' :
                  overallNps >= 70 ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {overallNps >= 90 ? 'Zona de Excelência' :
                   overallNps >= 70 ? 'Zona de Qualidade' : 'Zona Crítica'}
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
              <span className="text-xs text-slate-400 font-semibold">de {totalTurmasCount} negócios</span>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3.5 space-y-1">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                  style={{ width: `${totalTurmasCount > 0 ? (withNpsCount / totalTurmasCount) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>Taxa de Resposta</span>
                <span>{totalTurmasCount > 0 ? Math.round((withNpsCount / totalTurmasCount) * 100) : 0}%</span>
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

      {/* Strategic Advisor AI Section - Highly premium execution */}
      <div className="bg-[#121620] text-slate-100 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
        
        {/* Advisor Header */}
        <div className="border-b border-slate-800 px-6 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#161b29]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <BrainCircuit size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-100">Conselheiro Acadêmico Inteligente</h3>
                {isAiGenerated ? (
                  <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase">Análise de IA Ativa</span>
                ) : (
                  <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[9px] font-bold">Sumário do Sistema</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Diagnóstico automatizado, sugestão de relatórios de melhoria e planos de ação.</p>
            </div>
          </div>

          <button
            onClick={handleGenerateAiAnalysis}
            disabled={isLoadingAi}
            className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 py-1 px-2.5 rounded hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-700 disabled:opacity-40"
          >
            <RefreshCw size={11} className={isLoadingAi ? 'animate-spin' : ''} />
            Recarregar Análise Inteligente
          </button>
        </div>

        {/* Advisor Content Area */}
        <div className="p-6 sm:p-8">
          {isLoadingAi ? (
            /* Immersive Loading Screen with Reactive Text */
            <div className="py-12 flex flex-col items-center justify-center space-y-5 text-center max-w-md mx-auto">
              <div className="relative flex items-center justify-center">
                {/* Visual ripple pulse */}
                <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-indigo-500 opacity-20"></span>
                <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg relative border border-indigo-400">
                  <BrainCircuit size={24} className="animate-pulse" />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-black text-white uppercase tracking-widest">Processando Informações</p>
                <p className="text-xs text-indigo-200 animate-pulse transition-all duration-300 font-medium">
                  {loadingSteps[loadingStep]}
                </p>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-2">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-slate-300">
              <SimpleMarkdownRenderer content={aiReport} />
            </div>
          )}
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
                  <option value="sem_nps">Sem Nota Registrada</option>
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
                      const partner = t.partnerId ? partnerMap.get(t.partnerId) : null;
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
                          <span className={`px-2 py-0.5 rounded text-xs font-black ${getNpsBadgeClass(stat.avgNps)}`}>
                            NPS {stat.avgNps}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-100">
                          <span>{stat.count} projetos respondidos</span>
                          <span className="text-emerald-600">{stat.promoterPct}% Promotores</span>
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
              <div className="bg-slate-50 p-5 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-indigo-600" />
                    Comparativo Visual de Desempenho
                  </h4>
                  <p className="text-[11px] text-slate-400">Representação visual das médias ponderadas de satisfação.</p>
                </div>

                <div className="space-y-5 mt-6 flex-1 flex flex-col justify-center">
                  {courseStatsList.map(stat => (
                    <div key={stat.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-700">{stat.name}</span>
                        <span className={getNpsColorHex(stat.avgNps)}>NPS {stat.avgNps}</span>
                      </div>
                      
                      {/* Responsive HTML bar */}
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            stat.avgNps >= 90 ? 'bg-emerald-500' :
                            stat.avgNps >= 70 ? 'bg-teal-400' : 'bg-rose-400'
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
                          <span className={`px-2 py-0.5 rounded text-xs font-black ${getNpsBadgeClass(stat.avgNps)}`}>
                            {stat.avgNps}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {stat.avgNps >= 90 ? (
                            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 justify-center w-max mx-auto border border-emerald-150">
                              <CheckCircle size={10} /> Parceiro Promotor
                            </span>
                          ) : stat.avgNps >= 70 ? (
                            <span className="bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 justify-center w-max mx-auto border border-teal-150">
                              <CheckCircle size={10} /> Satisfeito (Neutro)
                            </span>
                          ) : (
                            <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 justify-center w-max mx-auto border border-rose-150 animate-pulse">
                              <AlertTriangle size={10} /> Requer Atenção
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
