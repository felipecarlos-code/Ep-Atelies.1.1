export interface Atelie {
  id: string;
  name: string;
  block: string;
  capacity: number;
  color: string; // Tailwind color class or hex, e.g. "emerald"
  composableWith?: string[]; // IDs of other atelies that can combine with this one
}

export interface Turma {
  id: string;
  name: string;
  course: string;
  period?: 'Manhã' | 'Tarde' | 'Noite' | '';
  studentCount?: number;
  projectDescription?: string; // Move project description to Turma
  
  // HubSpot integration fields
  dealstage?: string;               // 1 - Etapa de Negócios (dealstage)
  projectTitle?: string;            // 2 - Titulo do Projeto (titulo_projeto_c)
  description?: string;             // 3 - Descrição do Negocio (description)
  epDescricaoCurta?: string;        // [EP] Descrição Curta do Projeto (ep_descricao_curta_do_projeto)
  partnerId?: string;               // 4 - Empresa (Fazer o link com a empresa cadastrada dentro da nossa aplicação)
  applicationYear?: string;         // 5 - Ano de Aplicação do Módulo (ep_ano_de_aplicacao)
  applicationQuarter?: string;      // 6 - Trimestre de Aplicação (ep_tri_de_aplicacao)
  courseModule?: string;            // 7 - Módulo do Curso (modulo_curso)
  classCode?: string;               // 8 - Código da turma (codigo_turma_c)
  uniqueClassId?: string;           // 9 - ID Único da Turma (ep_id_unico_da_turma)
  epAtelie?: string[];              // HubSpot ep_atelie (array of Atelie IDs or names)
  epNps?: string;                   // [EP] NPS - nps do HubSpot
  epOrientador?: string;            // [EP] Orientador (ep_orientador) do HubSpot
  orientador?: string;              // Orientador (fallback) do HubSpot
  courseYear?: string;              // Ano do Curso (Auto-calculated from modulo_curso)
  
  // TAPI Document tracking fields
  tapiLink?: string;
  tapiValidity?: string;
  tapiStatus?: string;
  tapiSummary?: string;
}

export interface Partner {
  id: string;
  name: string;
  logoUrl: string; // Base64 uploaded logo or preset URL/SVG string
  description?: string; // Made optional as it's moved to Turma
  
  // Partnership Term tracking fields
  partnershipTermLink?: string;
  partnershipTermValidity?: string;
  partnershipTermStatus?: string;
  partnershipTermSummary?: string;
}

export type PhaseKey = 'inicio' | 'kickoff' | 'sprint1' | 'sprint2' | 'sprint3' | 'sprint4' | 'fim';

export interface AllocationRow {
  id: string;
  turmaId: string; // Selected class/group
  partnerId: string; // Selected partner
  allocations: Record<PhaseKey, string>; // Maps PhaseKey -> Atelie ID
}

export const PHASES: { key: PhaseKey; label: string }[] = [
  { key: 'inicio', label: 'Início do Módulo' },
  { key: 'kickoff', label: 'Kickoff 1º ao 3º Anos' },
  { key: 'sprint1', label: 'Sprint 1' },
  { key: 'sprint2', label: 'Sprint 2' },
  { key: 'sprint3', label: 'Sprint 3' },
  { key: 'sprint4', label: 'Sprint 4' },
  { key: 'fim', label: 'Fim do Módulo' },
];

export const PRESET_COLORS = [
  { name: 'Indigo', value: '#4f46e5', bg: 'bg-indigo-50 border-indigo-200 text-indigo-700', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800' },
  { name: 'Emerald', value: '#10b981', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  { name: 'Amber', value: '#f59e0b', bg: 'bg-amber-50 border-amber-200 text-amber-700', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  { name: 'Rose', value: '#f43f5e', bg: 'bg-rose-50 border-rose-200 text-rose-700', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-800' },
  { name: 'Violet', value: '#8b5cf6', bg: 'bg-violet-50 border-violet-200 text-violet-700', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-800' },
  { name: 'Cyan', value: '#06b6d4', bg: 'bg-cyan-50 border-cyan-200 text-cyan-700', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-800' },
  { name: 'Orange', value: '#f97316', bg: 'bg-orange-50 border-orange-200 text-orange-700', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
  { name: 'Teal', value: '#14b8a6', bg: 'bg-teal-50 border-teal-200 text-teal-700', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-800' },
];

export interface AppUser {
  id: string;
  name: string;
  email: string;
  allowedTabs: string[]; // List of tabs the user can access
  isAdmin: boolean;      // Admin user can configure others
}

