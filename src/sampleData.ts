import { Atelie, Turma, Partner, AllocationRow } from './types';

// Embedded premium SVG icons/logos for the partners
const googleLogo = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48"><path fill="%23EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="%234285F4" d="M46.5 24c0-1.55-.15-3.24-.47-4.75H24v9h12.75c-.53 2.87-2.14 5.31-4.57 6.95l7.1 5.51C43.43 36.6 46.5 30.87 46.5 24z"/><path fill="%23FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"/><path fill="%2334A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.1-5.51c-1.97 1.33-4.5 2.12-8.79 2.12-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

const itauLogo = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="20" fill="%23EC7000"/><text x="50" y="62" font-family="sans-serif" font-weight="900" font-size="34" fill="%23002D72" text-anchor="middle">Itaú</text></svg>`;

const ambevLogo = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="20" fill="%23FFCD00"/><circle cx="50" cy="50" r="30" fill="%23010101"/><text x="50" y="58" font-family="sans-serif" font-weight="900" font-size="24" fill="%23FFFFFF" text-anchor="middle">AMB</text></svg>`;

const mercadolivreLogo = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="20" fill="%23FFE600"/><path d="M25 60 C 25 35, 75 35, 75 60" fill="none" stroke="%232D3277" stroke-width="8" stroke-linecap="round"/><circle cx="35" cy="48" r="6" fill="%232D3277"/><circle cx="65" cy="48" r="6" fill="%232D3277"/><text x="50" y="82" font-family="sans-serif" font-weight="800" font-size="14" fill="%232D3277" text-anchor="middle">MELI</text></svg>`;

const btgPactualLogo = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="20" fill="%230F172A"/><path d="M30 35 L50 20 L70 35 L70 65 L50 80 L30 65 Z" fill="none" stroke="%2338BDF8" stroke-width="6"/><text x="50" y="58" font-family="sans-serif" font-weight="bold" font-size="22" fill="%23FFFFFF" text-anchor="middle">BTG</text></svg>`;

export const DEFAULT_ATELIES: Atelie[] = [
  { id: 'a1', name: 'Ateliê Ada Lovelace', block: '2ª Mezanino', capacity: 36, color: 'Indigo' },
  { id: 'a2', name: 'Ateliê Alan Turing', block: '1ª Mezanino', capacity: 40, color: 'Emerald' },
  { id: 'a3', name: 'Ateliê Grace Hopper', block: 'Térreo', capacity: 32, color: 'Rose' },
  { id: 'a4', name: 'Ateliê Tim Berners-Lee', block: '2ª Mezanino', capacity: 45, color: 'Amber' },
  { id: 'a5', name: 'Ateliê Margaret Hamilton', block: '1ª Mezanino', capacity: 38, color: 'Violet' },
];

export const DEFAULT_TURMAS: Turma[] = [
  { id: 't1', name: '1º Ano - Engenharia de Computação - Grupo A', course: 'Engenharia de Computação', period: 'Manhã', studentCount: 30, projectDescription: 'Desenvolvimento de aplicativo móvel para controle de estoque inteligente' },
  { id: 't2', name: '1º Ano - Engenharia de Software - Grupo B', course: 'Engenharia de Software', period: 'Manhã', studentCount: 35, projectDescription: 'Plataforma web para otimização de rotas de entregas expressas' },
  { id: 't3', name: '2º Ano - Ciência da Computação - Grupo A', course: 'Ciência da Computação', period: 'Tarde', studentCount: 28, projectDescription: 'Modelo de inteligência artificial para detecção de fraudes em transações financeiras' },
  { id: 't4', name: '2º Ano - Sistemas de Informação - Grupo A', course: 'Sistemas de Informação', period: 'Tarde', studentCount: 32, projectDescription: 'Sistema de telemetria e análise de dados em tempo real para sensores industriais' },
  { id: 't5', name: '3º Ano - Engenharia de Computação - Grupo Alpha', course: 'Engenharia de Computação', period: 'Manhã', studentCount: 25, projectDescription: 'Protótipo de IoT para monitoramento de consumo de energia residencial' },
  { id: 't6', name: '3º Ano - Ciência da Computação - Grupo Beta', course: 'Ciência da Computação', period: 'Tarde', studentCount: 27, projectDescription: 'Algoritmo de recomendação personalizado baseado em redes neurais' },
];

export const DEFAULT_PARTNERS: Partner[] = [
  { id: 'p1', name: 'Google Brasil', logoUrl: googleLogo },
  { id: 'p2', name: 'Banco Itaú', logoUrl: itauLogo },
  { id: 'p3', name: 'Ambev Tech', logoUrl: ambevLogo },
  { id: 'p4', name: 'Mercado Livre', logoUrl: mercadolivreLogo },
  { id: 'p5', name: 'BTG Pactual', logoUrl: btgPactualLogo },
];

export const DEFAULT_ROWS: AllocationRow[] = [
  {
    id: 'row1',
    turmaId: 't1',
    partnerId: 'p1',
    allocations: {
      inicio: 'a1',
      kickoff: 'a1',
      sprint1: 'a2',
      sprint2: 'a2',
      sprint3: 'a3',
      sprint4: 'a3',
      fim: 'a1',
    },
  },
  {
    id: 'row2',
    turmaId: 't2',
    partnerId: 'p2',
    allocations: {
      inicio: 'a2',
      kickoff: 'a2',
      sprint1: 'a1',
      sprint2: 'a1',
      sprint3: 'a4',
      sprint4: 'a4',
      fim: 'a2',
    },
  },
  {
    id: 'row3',
    turmaId: 't3',
    partnerId: 'p3',
    allocations: {
      inicio: 'a3',
      kickoff: 'a3',
      sprint1: 'a4',
      sprint2: 'a4',
      sprint3: 'a5',
      sprint4: 'a5',
      fim: 'a3',
    },
  },
  {
    id: 'row4',
    turmaId: 't4',
    partnerId: 'p4',
    allocations: {
      inicio: 'a4',
      kickoff: 'a4',
      sprint1: 'a5',
      sprint2: 'a5',
      sprint3: 'a1',
      sprint4: 'a1',
      fim: 'a4',
    },
  },
  {
    id: 'row5',
    turmaId: 't5',
    partnerId: 'p5',
    allocations: {
      inicio: 'a5',
      kickoff: 'a5',
      sprint1: 'a3',
      sprint2: 'a3',
      sprint3: 'a2',
      sprint4: 'a2',
      fim: 'a5',
    },
  },
];
