import { useState, FormEvent, ChangeEvent } from 'react';
import { Turma, Partner } from '../types';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Users, 
  Save, 
  X, 
  GraduationCap, 
  Clock, 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  Info, 
  Building2, 
  Tag, 
  Calendar, 
  Hash, 
  Link2, 
  Database
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const COURSE_MAP: Record<string, string> = {
  CCMD: 'Ciência da Computação',
  AMD: 'Adm Tech',
  ECMD: 'Engenharia de Computação',
  ESMD: 'Engenharia de Software',
  SIMD: 'Sistemas da Informação',
};

export function autoDetectCourse(text: string): string | null {
  if (!text) return null;
  const upper = text.toUpperCase();
  const keys = ['ECMD', 'ESMD', 'SIMD', 'CCMD', 'AMD'];
  for (const key of keys) {
    if (upper.includes(key)) {
      return COURSE_MAP[key];
    }
  }
  return null;
}

export function cleanOrDetectCourse(courseRaw?: string, courseModuleRaw?: string, nameRaw?: string): string {
  const c = String(courseRaw || '').trim();
  const cm = String(courseModuleRaw || '').trim();
  const n = String(nameRaw || '').trim();
  
  // Try to detect/clean from raw course
  const detFromCourse = autoDetectCourse(c);
  if (detFromCourse) return detFromCourse;
  
  // If course matches one of our clean values, return it
  const cleanValues = Object.values(COURSE_MAP);
  if (cleanValues.includes(c)) return c;
  
  // Try to detect from courseModule or name
  const detFromModule = autoDetectCourse(cm);
  if (detFromModule) return detFromModule;
  
  const detFromName = autoDetectCourse(n);
  if (detFromName) return detFromName;
  
  // Fallback to whatever course was, or courseModule, or default
  return c || cm || 'Ciência da Computação';
}

export function getFriendlyStageName(stage: string): string {
  if (!stage) return "";
  const normalized = stage.toLowerCase().trim();
  
  const mapping: Record<string, string> = {
    "appointmentscheduled": "Contato Inicial",
    "qualifiedtobuy": "Qualificado",
    "presentationscheduled": "Apresentação Agendada",
    "decisionmakerboughtin": "Decisor Alinhado",
    "contractsent": "Contrato Enviado",
    "closedwon": "Fechado Ganho (Won)",
    "closedlost": "Fechado Perdido (Lost)",
    
    // EP / B2B - EP - Iniciativas custom stage mappings
    "appointmentscheduled_ep": "Início da Prospecção",
    "presentationscheduled_ep": "Reunião de Alinhamento",
    "proposal_sent": "Proposta Enviada",
    "under_review": "Em Análise",
    "approved": "Aprovado",
    "contracting": "Em Contratação",
    "active": "Ativo / Em Andamento",
    "completed": "Concluído",
    "cancelled": "Cancelado",
  };

  if (mapping[normalized]) return mapping[normalized];

  if (normalized.includes("won") || normalized.includes("ganho") || normalized.includes("sucesso")) return "Fechado Ganho";
  if (normalized.includes("lost") || normalized.includes("perdido") || normalized.includes("cancelado")) return "Fechado Perdido";
  if (normalized.includes("proposal") || normalized.includes("proposta") || normalized.includes("apresenta")) return "Proposta / Apresentação";
  if (normalized.includes("negotiation") || normalized.includes("negocia")) return "Em Negociação";
  if (normalized.includes("appointment") || normalized.includes("agendado") || normalized.includes("contato")) return "Contato Inicial";
  if (normalized.includes("qualified") || normalized.includes("qualificado")) return "Qualificado";
  if (normalized.includes("contract") || normalized.includes("contrato")) return "Em Contratação";
  
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

function PartnerLogo({ partner }: { partner?: Partner }) {
  const [hasError, setHasError] = useState(false);

  if (!partner) {
    return (
      <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700 shrink-0 mt-0.5 flex items-center justify-center w-10 h-10 border border-indigo-100">
        <Building2 size={16} />
      </div>
    );
  }

  // Generate nice initials (e.g., "Ambev Tech" -> "AT")
  const words = partner.name.trim().split(/\s+/);
  const initials = words.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');

  // Vibrant, high-contrast colors for modern feel
  const bgColors = [
    'bg-indigo-600 text-white border-indigo-700',
    'bg-emerald-600 text-white border-emerald-700',
    'bg-rose-600 text-white border-rose-700',
    'bg-amber-500 text-slate-900 border-amber-600',
    'bg-violet-600 text-white border-violet-700',
    'bg-cyan-600 text-white border-cyan-700',
    'bg-teal-600 text-white border-teal-700',
    'bg-fuchsia-600 text-white border-fuchsia-700',
  ];
  
  let hash = 0;
  for (let i = 0; i < partner.name.length; i++) {
    hash = partner.name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % bgColors.length;
  const colorClass = bgColors[colorIndex];

  if (hasError || !partner.logoUrl) {
    return (
      <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center shrink-0 mt-0.5 font-extrabold text-[11px] tracking-wider uppercase border shadow-2xs`}>
        {initials}
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden shadow-2xs">
      <img
        src={partner.logoUrl}
        alt={partner.name}
        className="w-8 h-8 object-contain rounded"
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

interface TurmaManagerProps {
  turmas: Turma[];
  partners?: Partner[]; // Linked partners
  onAddTurma: (turma: Omit<Turma, 'id'>) => void;
  onAddMultipleTurmas?: (turmas: Omit<Turma, 'id'>[]) => void;
  onUpdateTurma: (turma: Turma) => void;
  onDeleteTurma: (id: string) => void;
  onClearTurmas: () => void;
}

export default function TurmaManager({
  turmas,
  partners = [],
  onAddTurma,
  onAddMultipleTurmas,
  onUpdateTurma,
  onDeleteTurma,
  onClearTurmas,
}: TurmaManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // States matching the 9 required fields
  const [name, setName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [dealstage, setDealstage] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [applicationYear, setApplicationYear] = useState('');
  const [applicationQuarter, setApplicationQuarter] = useState('Q1');
  const [courseModule, setCourseModule] = useState('');
  const [classCode, setClassCode] = useState('');
  const [uniqueClassId, setUniqueClassId] = useState('');
  
  // Legacy standard fields for backwards compatibility
  const [course, setCourse] = useState('');
  const [period, setPeriod] = useState<'Manhã' | 'Tarde' | 'Noite' | ''>('');
  const [studentCount, setStudentCount] = useState<number | ''>('');
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Excel Import States
  const [showImportSection, setShowImportSection] = useState(false);
  const [importSummary, setImportSummary] = useState<{ success: number; skipped: number; total: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');

  // Extract unique stages
  const uniqueStages = Array.from(
    new Set(turmas.map((t) => t.dealstage || '').filter(Boolean))
  ).sort();

  // Filtered turmas list
  const filteredTurmas = turmas.filter((t) => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.projectTitle && t.projectTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.classCode && t.classCode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStage = !stageFilter || t.dealstage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

  const handleDownloadTemplate = () => {
    const headers = [[
      'Nome do Negócio', 
      'Título do Projeto', 
      'Descrição', 
      'Etapa de Negócios (dealstage)', 
      'Ano de Aplicação', 
      'Trimestre de Aplicação', 
      'Módulo do Curso', 
      'Código da Turma', 
      'ID Único da Turma', 
      'Turno (Manhã/Tarde/Noite)', 
      'Alunos'
    ]];
    const examples = [
      [
        'Copel - Inovação Energética', 
        'Otimização de Consumo Copel', 
        'Desenvolvimento de aplicativo móvel para controle de estoque inteligente', 
        'Contrato Assinado', 
        '2026', 
        'Q1', 
        'Ciência da Computação', 
        '2026-1B-T14', 
        'copel-2026-q1', 
        'Manhã', 
        30
      ],
      [
        'Cocamar - Rastreabilidade', 
        'Blockchain de Logística', 
        'Plataforma web para otimização de rotas de entregas expressas', 
        'Em negociação', 
        '2026', 
        'Q2', 
        'Engenharia de Software', 
        '2026-2A-T15', 
        'cocamar-2026-q2', 
        'Tarde', 
        35
      ]
    ];
    const data = [...headers, ...examples];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Negócios');
    XLSX.writeFile(wb, 'modelo_cadastro_negocios.xlsx');
  };

  const handleImportExcel = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportSummary(null);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const rawRows = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
        
        if (rawRows.length === 0) {
          setImportError('A planilha está vazia ou não pôde ser lida.');
          return;
        }
        
        const newNegocios: Omit<Turma, 'id'>[] = [];
        let skippedCount = 0;

        rawRows.forEach((row: any) => {
          // Flexible mapping supporting standard and translated column headers
          const rawName = row['Nome do Negócio'] || row['Nome'] || row['Turma'] || row['name'] || '';
          const rawProjectTitle = row['Título do Projeto'] || row['Titulo do Projeto'] || row['projectTitle'] || '';
          const rawDesc = row['Descrição'] || row['Descrição do Negocio'] || row['description'] || row['projectDescription'] || '';
          const rawDealstage = row['Etapa de Negócios'] || row['Etapa'] || row['dealstage'] || '';
          const rawYear = row['Ano de Aplicação'] || row['Ano'] || row['ep_ano_de_aplicacao'] || '';
          const rawQuarter = row['Trimestre de Aplicação'] || row['Trimestre'] || row['ep_tri_de_aplicacao'] || 'Q1';
          const rawModule = row['Módulo do Curso'] || row['Módulo'] || row['modulo_curso'] || '';
          const rawClassCode = row['Código da Turma'] || row['Código'] || row['codigo_turma_c'] || '';
          const rawUniqueId = row['ID Único da Turma'] || row['ID Único'] || row['ep_id_unico_da_turma'] || '';
          const rawPeriod = row['Turno'] || row['Período'] || row['period'] || '';
          const rawStudentCount = row['Alunos'] || row['studentCount'] || '';

          const nameStr = String(rawName).trim();
          if (!nameStr) {
            skippedCount++;
            return;
          }

          let periodVal: 'Manhã' | 'Tarde' | 'Noite' | '' = '';
          const periodStr = String(rawPeriod).trim().toLowerCase();
          if (periodStr.includes('manhã') || periodStr.includes('manha')) {
            periodVal = 'Manhã';
          } else if (periodStr.includes('tarde')) {
            periodVal = 'Tarde';
          } else if (periodStr.includes('noite') || periodStr.includes('vespertino')) {
            periodVal = 'Noite';
          }

          const count = rawStudentCount ? (parseInt(String(rawStudentCount)) || undefined) : undefined;

          // Auto-detect course based on any available text in row using de-para intelligence
          let detectedCourse = '';
          const fieldsToScan = [rawName, rawModule, rawClassCode, rawUniqueId, rawProjectTitle, rawDesc];
          for (const f of fieldsToScan) {
            if (f) {
              const det = autoDetectCourse(String(f));
              if (det) {
                detectedCourse = det;
                break;
              }
            }
          }

          newNegocios.push({
            name: nameStr,
            projectTitle: String(rawProjectTitle).trim(),
            projectDescription: String(rawDesc).trim(),
            description: String(rawDesc).trim(),
            dealstage: String(rawDealstage).trim(),
            applicationYear: String(rawYear).trim(),
            applicationQuarter: String(rawQuarter).trim(),
            courseModule: String(rawModule).trim(),
            classCode: String(rawClassCode).trim(),
            uniqueClassId: String(rawUniqueId).trim(),
            course: detectedCourse || String(rawModule || 'Ciência da Computação').trim(),
            period: periodVal,
            studentCount: count,
          });
        });

        if (newNegocios.length === 0) {
          setImportError('Nenhum negócio válido encontrado. Certifique-se de que a planilha possui cabeçalhos como "Nome do Negócio", "Descrição", etc.');
          return;
        }

        if (onAddMultipleTurmas) {
          onAddMultipleTurmas(newNegocios);
        } else {
          newNegocios.forEach(t => onAddTurma(t));
        }

        setImportSummary({
          success: newNegocios.length,
          skipped: skippedCount,
          total: rawRows.length
        });

        e.target.value = '';
      } catch (err: any) {
        console.error(err);
        setImportError(`Erro ao ler o arquivo: ${err.message || 'Formato de arquivo incompatível'}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const resetForm = () => {
    setName('');
    setProjectTitle('');
    setProjectDescription('');
    setDealstage('');
    setPartnerId('');
    setApplicationYear('');
    setApplicationQuarter('Q1');
    setCourseModule('');
    setClassCode('');
    setUniqueClassId('');
    setCourse('');
    setPeriod('');
    setStudentCount('');
    setEditingId(null);
    setIsEditing(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleStartEdit = (turma: Turma) => {
    setName(turma.name);
    setProjectTitle(turma.projectTitle || '');
    setProjectDescription(turma.projectDescription || turma.description || '');
    setDealstage(turma.dealstage || '');
    setPartnerId(turma.partnerId || '');
    setApplicationYear(turma.applicationYear || '');
    setApplicationQuarter(turma.applicationQuarter || 'Q1');
    setCourseModule(turma.courseModule || '');
    setClassCode(turma.classCode || '');
    setUniqueClassId(turma.uniqueClassId || '');
    setCourse(cleanOrDetectCourse(turma.course, turma.courseModule, turma.name));
    setPeriod(turma.period || '');
    setStudentCount(turma.studentCount !== undefined && turma.studentCount !== null ? turma.studentCount : '');
    setEditingId(turma.id);
    setIsEditing(true);
    
    // Smoothly scroll window to top to show the edit form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const trimmedDesc = projectDescription.trim();
    const payload = {
      name: name.trim(),
      projectTitle: projectTitle.trim(),
      projectDescription: trimmedDesc,
      description: trimmedDesc,
      dealstage: dealstage.trim(),
      partnerId,
      applicationYear: applicationYear.trim(),
      applicationQuarter,
      courseModule: courseModule.trim(),
      classCode: classCode.trim(),
      uniqueClassId: uniqueClassId.trim(),
      course: cleanOrDetectCourse(course, courseModule, name),
      period: period || undefined,
      studentCount: studentCount !== '' ? Number(studentCount) : undefined,
    };

    if (editingId) {
      onUpdateTurma({
        id: editingId,
        ...payload,
      });
    } else {
      onAddTurma(payload);
    }
    resetForm();
  };

  return (
    <div className="space-y-6" id="negocio-manager-root">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">Negócios</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Gerencie os negócios integrados e estruturados do HubSpot</p>
        </div>
        <div className="flex items-center gap-2">
          {turmas.length > 0 && !isEditing && (
            showClearConfirm ? (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded text-xs animate-fade-in">
                <span className="font-bold text-rose-800 text-[11px]">Excluir todos?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClearTurmas();
                    setShowClearConfirm(false);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold px-2.5 py-1 rounded uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-extrabold px-2.5 py-1 rounded uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                id="clear-negocios-btn"
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold px-4 py-2 rounded transition-all cursor-pointer whitespace-nowrap"
                title="Excluir todos os negócios cadastrados"
              >
                <Trash2 size={13} /> Excluir Todos
              </button>
            )
          )}
          <button
            id="toggle-import-btn"
            onClick={() => {
              setShowImportSection(!showImportSection);
              setIsEditing(false);
              setImportSummary(null);
              setImportError(null);
            }}
            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded transition-all shadow-2xs cursor-pointer border ${
              showImportSection
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet size={14} /> Importar Planilha
          </button>
          {!isEditing && (
            <button
              id="add-negocio-btn"
              onClick={() => {
                handleStartAdd();
                setShowImportSection(false);
              }}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded transition-all shadow-2xs cursor-pointer"
            >
              <Plus size={14} /> Novo Negócio
            </button>
          )}
        </div>
      </div>

      {showImportSection && (
        <div className="bg-gradient-to-br from-indigo-50/50 to-slate-50 rounded border border-indigo-100 p-5 shadow-2xs space-y-4 relative animate-fade-in">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded">
                <FileSpreadsheet size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Importar Negócios via Excel / Planilha</h3>
                <p className="text-[11px] text-slate-500 font-medium">Cadastre dezenas de negócios de forma simplificada com todos os 9 campos.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowImportSection(false);
                setImportSummary(null);
                setImportError(null);
              }}
              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-250 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
            {/* Step 1: Download Model */}
            <div className="bg-white rounded border border-slate-200/80 p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                  <span>Passo 1</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                </div>
                <h4 className="font-bold text-slate-800 text-xs">Baixar Planilha de Exemplo</h4>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  Baixe o modelo com as 9 colunas requeridas para garantir importação estruturada e sem erros.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center justify-center gap-1.5 w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold py-2 rounded transition-all cursor-pointer shadow-3xs"
              >
                <Download size={13} /> Baixar Modelo (.xlsx)
              </button>
            </div>

            {/* Step 2: Instructions */}
            <div className="bg-white rounded border border-slate-200/80 p-4 space-y-3">
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <span>Campos Estruturados</span>
              </div>
              <h4 className="font-bold text-slate-800 text-xs">Atributos Suportados</h4>
              <ul className="text-[10.5px] text-slate-500 font-medium space-y-1">
                <li>• <strong>Nome do Negócio:</strong> Nome do deal (Ex: Copel)</li>
                <li>• <strong>Título do Projeto:</strong> Título descritivo</li>
                <li>• <strong>Descrição:</strong> Resumo do negócio</li>
                <li>• <strong>Etapa de Negócios:</strong> dealstage</li>
                <li>• <strong>Ano / Trimestre:</strong> Ano e trimestre letivo</li>
                <li>• <strong>Módulo / Código / ID Único:</strong> Estrutura acadêmica</li>
              </ul>
            </div>

            {/* Step 3: Upload */}
            <div className="bg-white rounded border border-slate-200/80 p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                  <span>Passo 2</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                </div>
                <h4 className="font-bold text-slate-800 text-xs">Enviar Planilha Preenchida</h4>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  Selecione o arquivo Excel ou CSV editado para processar a importação instantaneamente.
                </p>
              </div>

              <label className="flex items-center justify-center gap-1.5 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded transition-all cursor-pointer shadow-2xs">
                <FileSpreadsheet size={13} /> Selecionar Arquivo...
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleImportExcel}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {importSummary && (
            <div className="bg-emerald-50 border border-emerald-200 rounded p-3 flex items-start gap-2.5 animate-fade-in">
              <span className="text-emerald-500 font-bold text-base leading-none">✓</span>
              <div className="flex-1 min-w-0">
                <h5 className="font-bold text-emerald-800 text-[11px] uppercase tracking-wider">Importação concluída com sucesso!</h5>
                <p className="text-xs text-emerald-700 font-medium mt-0.5">
                  Foram importados com sucesso <strong>{importSummary.success}</strong> negócios. 
                  {importSummary.skipped > 0 && ` ${importSummary.skipped} linhas foram ignoradas por falta de identificador válido.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportSummary(null)}
                className="text-emerald-500 hover:text-emerald-700 font-semibold text-xs cursor-pointer px-1.5"
              >
                Dispensar
              </button>
            </div>
          )}

          {importError && (
            <div className="bg-rose-50 border border-rose-200 rounded p-3 flex items-start gap-2.5 animate-fade-in">
              <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h5 className="font-bold text-rose-800 text-[11px] uppercase tracking-wider">Falha na Importação</h5>
                <p className="text-xs text-rose-700 font-medium mt-0.5">{importError}</p>
              </div>
              <button
                type="button"
                onClick={() => setImportError(null)}
                className="text-rose-500 hover:text-rose-700 font-semibold text-xs cursor-pointer px-1.5"
              >
                Dispensar
              </button>
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <form id="negocio-form" onSubmit={handleSave} className="bg-white rounded border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
              {editingId ? 'Editar Negócio' : 'Cadastrar Novo Negócio'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1 - Nome do Negócio */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                Nome do Negócio / Identificador *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  setName(val);
                  const det = autoDetectCourse(val);
                  if (det) setCourse(det);
                }}
                placeholder="Ex: Copel ou Cocamar"
                className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
              />
            </div>

            {/* 2 - Título do Projeto */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                Título do Projeto (titulo_projeto_c)
              </label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => {
                  const val = e.target.value;
                  setProjectTitle(val);
                  const det = autoDetectCourse(val);
                  if (det) setCourse(det);
                }}
                placeholder="Ex: Rastreabilidade Agro"
                className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
              />
            </div>

            {/* 3 - Etapa de Negócios */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                Etapa do Negócio (dealstage)
              </label>
              <input
                type="text"
                value={dealstage}
                onChange={(e) => setDealstage(e.target.value)}
                placeholder="Ex: Contrato Assinado ou Proposta"
                className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
              />
            </div>

            {/* 4 - Empresa Associada (Link com Parceiros cadastrados) */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                Empresa (Vincular Parceiro Registrado)
              </label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
              >
                <option value="">Sem empresa associada...</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* 5 - Ano de Aplicação */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                Ano de Aplicação (ep_ano_de_aplicacao)
              </label>
              <input
                type="text"
                value={applicationYear}
                onChange={(e) => setApplicationYear(e.target.value)}
                placeholder="Ex: 2026"
                className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
              />
            </div>

            {/* 6 - Trimestre de Aplicação */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                Trimestre de Aplicação (ep_tri_de_aplicacao)
              </label>
              <select
                value={applicationQuarter}
                onChange={(e) => setApplicationQuarter(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
              >
                <option value="Q1">Q1 - Primeiro Trimestre</option>
                <option value="Q2">Q2 - Segundo Trimestre</option>
                <option value="Q3">Q3 - Terceiro Trimestre</option>
                <option value="Q4">Q4 - Quarto Trimestre</option>
              </select>
            </div>

            {/* 7 - Módulo do Curso */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                Módulo do Curso (modulo_curso)
              </label>
              <input
                type="text"
                value={courseModule}
                onChange={(e) => {
                  const val = e.target.value;
                  setCourseModule(val);
                  const det = autoDetectCourse(val);
                  if (det) {
                    setCourse(det);
                  }
                }}
                placeholder="Ex: 1AMD3 - LÓGICA PARA PREDIÇÃO..."
                className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
              />
            </div>

            {/* Curso - De-Para inteligente */}
            <div>
              <label className="block text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                <span>Curso (De-Para Inteligente)</span>
                <span className="text-[8px] bg-indigo-50 text-indigo-700 px-1 rounded font-mono font-bold lowercase">Auto-selecionado</span>
              </label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full text-xs border border-indigo-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
              >
                <option value="">Selecione o Curso...</option>
                <option value="Ciência da Computação">Ciência da Computação (CCMD)</option>
                <option value="Adm Tech">Adm Tech (AMD)</option>
                <option value="Engenharia de Computação">Engenharia de Computação (ECMD)</option>
                <option value="Engenharia de Software">Engenharia de Software (ESMD)</option>
                <option value="Sistemas da Informação">Sistemas da Informação (SIMD)</option>
              </select>
            </div>

            {/* 8 - Código da Turma */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                Código da turma (codigo_turma_c)
              </label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => {
                  const val = e.target.value;
                  setClassCode(val);
                  const det = autoDetectCourse(val);
                  if (det) setCourse(det);
                }}
                placeholder="Ex: 2026-1B-T14"
                className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
              />
            </div>

            {/* 9 - ID Único da Turma */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                ID Único da Turma (ep_id_unico_da_turma)
              </label>
              <input
                type="text"
                value={uniqueClassId}
                onChange={(e) => {
                  const val = e.target.value;
                  setUniqueClassId(val);
                  const det = autoDetectCourse(val);
                  if (det) setCourse(det);
                }}
                placeholder="Ex: copel-2026-q1"
                className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
              />
            </div>

            {/* Turno */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                Período / Turno Letivo
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
              >
                <option value="">Selecione o Turno (Em branco)</option>
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
              </select>
            </div>

            {/* Qtd Alunos */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                Qtd Alunos
              </label>
              <input
                type="number"
                min={1}
                value={studentCount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setStudentCount('');
                  } else {
                    const parsed = parseInt(val, 10);
                    setStudentCount(isNaN(parsed) ? '' : Math.max(1, parsed));
                  }
                }}
                placeholder="Cadastrar Qtd Alunos"
                className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
              />
            </div>
          </div>

          {/* Descrição do Negócio */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
              Descrição do Negócio / Escopo do Desafio
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Descreva o escopo, metas, e especificações técnicas negociadas..."
              rows={3}
              className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all resize-none font-medium"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded transition-all shadow-2xs cursor-pointer"
            >
              <Save size={14} /> Salvar Negócio
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Controls */}
      {turmas.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-2xs">
          <div className="relative w-full md:max-w-md">
            <input
              type="text"
              placeholder="Buscar por nome do negócio, título do projeto ou código da turma..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg pl-3 pr-8 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Tag size={12} /> Filtrar por Etapa:
            </span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
            >
              <option value="">Todas as etapas</option>
              {uniqueStages.map((stage) => (
                <option key={stage} value={stage}>
                  {getFriendlyStageName(stage)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Grid List of Negócios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="negocios-grid">
        {turmas.length === 0 ? (
          <div className="col-span-full border border-dashed border-slate-200 rounded p-10 text-center text-slate-500">
            <Building2 className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="font-semibold text-sm text-slate-700">Nenhum negócio cadastrado</p>
            <p className="text-xs text-slate-400 mt-1">Conecte com o HubSpot CRM para sincronizar ou cadastre manualmente</p>
          </div>
        ) : filteredTurmas.length === 0 ? (
          <div className="col-span-full border border-dashed border-slate-200 rounded p-10 text-center text-slate-500 bg-white">
            <Building2 className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="font-semibold text-sm text-slate-700">Nenhum resultado encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Nenhum negócio corresponde aos critérios de pesquisa selecionados.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStageFilter('');
              }}
              className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded transition-all cursor-pointer"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          filteredTurmas.map((turma) => {
            const isFromHubspot = /^[0-9]+$/.test(turma.id); // HubSpot numeric deal IDs
            const linkedPartner = partners.find(p => p.id === turma.partnerId);

            return (
              <div
                key={turma.id}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs relative hover:shadow-xs transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 min-w-0 w-full">
                    <div className="flex items-start gap-3 min-w-0 w-full">
                      <PartnerLogo partner={linkedPartner} />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-slate-900 text-sm tracking-tight truncate" title={turma.name}>
                          {turma.name}
                        </h4>
                        {turma.projectTitle && (
                          <p className="text-[11px] text-slate-400 font-bold truncate leading-tight mt-0.5" title={turma.projectTitle}>
                            {turma.projectTitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-slate-50 pt-3">
                    {/* Link com Empresa cadastrada */}
                    <div className="flex items-start justify-between gap-2 text-[11px] min-w-0">
                      <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 pt-0.5">
                        <Building2 size={10} /> Empresa:
                      </span>
                      {linkedPartner ? (
                        <span className="font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 text-right truncate max-w-[65%] leading-normal inline-block" title={linkedPartner.name}>
                          {linkedPartner.name}
                        </span>
                      ) : (
                        <span className="font-medium text-slate-400 italic text-right break-words max-w-[65%]">Sem empresa vinculada</span>
                      )}
                    </div>

                    {/* Etapa de Negócios */}
                    {turma.dealstage && (
                      <div className="flex items-start justify-between gap-2 text-[11px] min-w-0">
                        <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 pt-0.5">
                          <Tag size={10} /> Etapa:
                        </span>
                        <span className="font-extrabold text-slate-700 uppercase tracking-wide bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-right truncate max-w-[65%] inline-block" title={getFriendlyStageName(turma.dealstage)}>
                          {getFriendlyStageName(turma.dealstage)}
                        </span>
                      </div>
                    )}

                    {/* Ano e Trimestre de Aplicação */}
                    {(turma.applicationYear || turma.applicationQuarter) && (
                      <div className="flex items-center justify-between gap-2 text-[11px] min-w-0">
                        <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                          <Calendar size={10} /> Período EP:
                        </span>
                        <span className="font-bold text-slate-800 text-right break-words max-w-[65%]">
                          {turma.applicationYear ? `${turma.applicationYear} - ` : ''}
                          <strong className="text-indigo-600 font-extrabold">{turma.applicationQuarter || 'Q1'}</strong>
                        </span>
                      </div>
                    )}

                    {/* Módulo do Curso */}
                    {(turma.courseModule || turma.course) && (
                      <div className="flex items-start justify-between gap-2 text-[11px] min-w-0">
                        <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 pt-0.5">
                          <GraduationCap size={10} /> Curso:
                        </span>
                        <span className="font-bold text-slate-700 text-right truncate max-w-[65%] leading-normal inline-block" title={turma.courseModule || turma.course}>
                          {turma.courseModule || turma.course}
                        </span>
                      </div>
                    )}

                    {/* Código da Turma */}
                    {turma.classCode && (
                      <div className="flex items-center justify-between gap-2 text-[11px] min-w-0">
                        <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                          <Hash size={10} /> Cód. Turma:
                        </span>
                        <span className="font-semibold text-slate-700 font-mono text-right truncate max-w-[65%] inline-block" title={turma.classCode}>
                          {turma.classCode}
                        </span>
                      </div>
                    )}

                    {/* ID Único da Turma */}
                    {turma.uniqueClassId && (
                      <div className="flex items-center justify-between gap-2 text-[11px] min-w-0">
                        <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                          <Link2 size={10} /> ID Único:
                        </span>
                        <span className="font-semibold text-slate-600 font-mono text-[10px] text-right truncate max-w-[65%] inline-block" title={turma.uniqueClassId}>
                          {turma.uniqueClassId}
                        </span>
                      </div>
                    )}

                    {/* Alunos & Turno */}
                    <div className="flex items-center justify-between gap-2 text-[11px] min-w-0">
                      <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                        <Clock size={10} /> Turno / Alunos:
                      </span>
                      <span className="font-bold text-slate-700 text-right break-words max-w-[65%] inline-flex flex-wrap items-center justify-end gap-1">
                        {turma.period ? (
                          <span>{turma.period}</span>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide">Sem Turno</span>
                        )}
                        <span className="text-slate-300 mx-0.5">•</span>
                        <strong className="text-slate-800 font-extrabold">
                          {typeof turma.studentCount === 'number' ? (
                            <span>{turma.studentCount} alunos</span>
                          ) : (
                            <span className="text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide">Sem Qtd Alunos</span>
                          )}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {(turma.projectDescription || turma.description) && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest block mb-1">Descrição do Escopo:</span>
                      <p className="text-xs text-slate-500 leading-normal font-medium line-clamp-3" title={turma.projectDescription || turma.description}>
                        {turma.projectDescription || turma.description}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {/* Source indicator */}
                  {isFromHubspot ? (
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 font-extrabold uppercase tracking-wider bg-amber-50 border border-amber-100 px-2 py-0.5 rounded max-w-[65%] truncate" title={turma.id}>
                      <Database size={10} className="shrink-0" /> HubSpot {turma.id}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                      Local
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1">
                    {deleteConfirmId === turma.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 p-0.5 rounded shadow-2xs animate-fade-in">
                        <span className="text-[8px] font-extrabold text-rose-700 uppercase tracking-wider px-1">Excluir?</span>
                        <button
                          onClick={() => {
                            onDeleteTurma(turma.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-extrabold uppercase tracking-wider cursor-pointer"
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[8px] font-extrabold uppercase tracking-wider cursor-pointer"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(turma)}
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Editar Negócio"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(turma.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Excluir Negócio"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
