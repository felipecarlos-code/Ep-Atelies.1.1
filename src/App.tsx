import { useState, useEffect, ChangeEvent } from 'react';
import { Atelie, Turma, Partner, AllocationRow, PhaseKey } from './types';
import { 
  DEFAULT_ATELIES, 
  DEFAULT_TURMAS, 
  DEFAULT_PARTNERS, 
  DEFAULT_ROWS 
} from './sampleData';

import SprintBoard from './components/SprintBoard';
import AtelieManager from './components/AtelieManager';
import TurmaManager from './components/TurmaManager';
import PartnerManager from './components/PartnerManager';
import HubSpotSync from './components/HubSpotSync';
import BoletimEP from './components/BoletimEP';

import { 
  CalendarRange, 
  DoorOpen, 
  Users, 
  Briefcase, 
  Download, 
  Upload, 
  RotateCcw, 
  Sparkles,
  Layers,
  GraduationCap,
  Database,
  Cloud,
  CloudOff
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'sprints' | 'boletim' | 'atelies' | 'turmas' | 'partners' | 'hubspot'>('sprints');

  // Load from LocalStorage or fall back to preloaded sample defaults
  const [atelies, setAtelies] = useState<Atelie[]>(() => {
    const saved = localStorage.getItem('atelies_data');
    return saved ? JSON.parse(saved) : DEFAULT_ATELIES;
  });

  const [turmas, setTurmas] = useState<Turma[]>(() => {
    const saved = localStorage.getItem('turmas_data');
    return saved ? JSON.parse(saved) : DEFAULT_TURMAS;
  });

  const [partners, setPartners] = useState<Partner[]>(() => {
    const saved = localStorage.getItem('partners_data');
    return saved ? JSON.parse(saved) : DEFAULT_PARTNERS;
  });

  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return localStorage.getItem('selected_year') || '2026';
  });

  const [selectedQuarter, setSelectedQuarter] = useState<string>(() => {
    return localStorage.getItem('selected_quarter') || 'Q1';
  });

  const currentKey = `${selectedYear}_${selectedQuarter}`;

  // Helper to create an empty schedule
  const createEmptySchedule = (year: string, quarter: string): AllocationRow[] => {
    const defaultRows: AllocationRow[] = [];
    
    // For 2026 Q1, we can preload our DEFAULT_ROWS
    if (year === '2026' && quarter === 'Q1') {
      defaultRows.push(...DEFAULT_ROWS);
    }
    
    const startIdx = defaultRows.length + 1;
    for (let i = startIdx; i <= 15; i++) {
      defaultRows.push({
        id: `row-${year}-${quarter}-${Date.now()}-${i}`,
        turmaId: '',
        partnerId: '',
        allocations: {
          inicio: '',
          kickoff: '',
          sprint1: '',
          sprint2: '',
          sprint3: '',
          sprint4: '',
          fim: '',
        }
      });
    }
    return defaultRows;
  };

  const [schedules, setSchedules] = useState<Record<string, AllocationRow[]>>(() => {
    const saved = localStorage.getItem('all_schedules_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore and fallback
      }
    }

    // Migration from old single 'allocation_rows' if it exists
    const oldRows = localStorage.getItem('allocation_rows');
    let initialRows: AllocationRow[];
    if (oldRows) {
      try {
        initialRows = JSON.parse(oldRows);
      } catch (e) {
        initialRows = [...DEFAULT_ROWS];
        for (let i = DEFAULT_ROWS.length + 1; i <= 15; i++) {
          initialRows.push({
            id: `row-init-${i}`,
            turmaId: '',
            partnerId: '',
            allocations: {
              inicio: '',
              kickoff: '',
              sprint1: '',
              sprint2: '',
              sprint3: '',
              sprint4: '',
              fim: '',
            }
          });
        }
      }
    } else {
      initialRows = [...DEFAULT_ROWS];
      for (let i = DEFAULT_ROWS.length + 1; i <= 15; i++) {
        initialRows.push({
          id: `row-init-${i}`,
          turmaId: '',
          partnerId: '',
          allocations: {
            inicio: '',
            kickoff: '',
            sprint1: '',
            sprint2: '',
            sprint3: '',
            sprint4: '',
            fim: '',
          }
        });
      }
    }

    return {
      '2026_Q1': initialRows
    };
  });

  const rows = schedules[currentKey] || [];

  const [isDbConfigured, setIsDbConfigured] = useState(false);
  const [dbProvider, setDbProvider] = useState<string | null>(null);
  const [dbWarning, setDbWarning] = useState<string | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);

  // 1. Initial Load effect from database
  useEffect(() => {
    async function loadDb() {
      try {
        setIsLoadingDb(true);
        const res = await fetch("/api/db/load");
        const resData = await res.json();
        if (resData.success && resData.configured) {
          setIsDbConfigured(true);
          if (resData.isSupabase) {
            setDbProvider('Supabase');
          } else if (resData.isFirestore) {
            setDbProvider('Firestore');
          }
          if (resData.warning) {
            setDbWarning(resData.warning);
          }
          if (resData.data) {
            const { 
              atelies: dbAtelies, 
              turmas: dbTurmas, 
              partners: dbPartners, 
              schedules: dbSchedules, 
              selectedYear: dbYear, 
              selectedQuarter: dbQuarter 
            } = resData.data;
            if (dbAtelies) setAtelies(dbAtelies);
            if (dbTurmas) setTurmas(dbTurmas);
            if (dbPartners) setPartners(dbPartners);
            if (dbSchedules) setSchedules(dbSchedules);
            if (dbYear) setSelectedYear(dbYear);
            if (dbQuarter) setSelectedQuarter(dbQuarter);
          }
        }
      } catch (err) {
        console.error("Error loading database state:", err);
      } finally {
        setIsLoadingDb(false);
        setInitialLoadDone(true);
      }
    }
    loadDb();
  }, []);

  // Sync to LocalStorage on changes as secondary local cache
  useEffect(() => {
    localStorage.setItem('atelies_data', JSON.stringify(atelies));
  }, [atelies]);

  useEffect(() => {
    localStorage.setItem('turmas_data', JSON.stringify(turmas));
  }, [turmas]);

  useEffect(() => {
    localStorage.setItem('partners_data', JSON.stringify(partners));
  }, [partners]);

  useEffect(() => {
    localStorage.setItem('all_schedules_data', JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem('selected_year', selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    localStorage.setItem('selected_quarter', selectedQuarter);
  }, [selectedQuarter]);

  // 2. Autosave to database on state change
  useEffect(() => {
    if (!initialLoadDone || !isDbConfigured) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        setIsSavingDb(true);
        const res = await fetch("/api/db/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            atelies, 
            turmas, 
            partners, 
            schedules, 
            selectedYear, 
            selectedQuarter 
          })
        });
        const resData = await res.json();
        if (!resData.success) {
          if (resData.code === "TABLE_NOT_FOUND") {
            setDbWarning("A tabela 'app_state' não existe no Supabase. Crie-a no SQL Editor do Supabase.");
          } else {
            console.error("Error saving database state:", resData.error);
          }
        } else {
          // Clear warning on successful save
          if (dbWarning && dbWarning.includes("app_state")) {
            setDbWarning(null);
          }
        }
      } catch (err) {
        console.error("Error saving database state:", err);
      } finally {
        setIsSavingDb(false);
      }
    }, 1000); // 1-second debounce

    return () => clearTimeout(delayDebounceFn);
  }, [atelies, turmas, partners, schedules, selectedYear, selectedQuarter, initialLoadDone, isDbConfigured, dbWarning]);

  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleForceDbSave = async () => {
    try {
      setIsSavingDb(true);
      setSyncToast({ message: "Sincronizando os dados locais atuais com a nuvem (Supabase)...", type: 'info' });
      const res = await fetch("/api/db/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          atelies, 
          turmas, 
          partners, 
          schedules, 
          selectedYear, 
          selectedQuarter 
        })
      });
      const resData = await res.json();
      if (resData.success) {
        setSyncToast({ message: "Dados sincronizados e guardados com sucesso no Supabase!", type: 'success' });
        setDbWarning(null);
        // Fade out toast after a few seconds
        setTimeout(() => setSyncToast(null), 4000);
      } else {
        setSyncToast({ message: `Erro ao salvar dados no Supabase: ${resData.error || 'Erro desconhecido'}`, type: 'error' });
      }
    } catch (err: any) {
      console.error(err);
      setSyncToast({ message: `Erro de conexão: ${err.message}`, type: 'error' });
    } finally {
      setIsSavingDb(false);
    }
  };

  // Ensure that if current year/quarter schedule doesn't exist yet, we initialize it
  useEffect(() => {
    if (!schedules[currentKey]) {
      setSchedules(prev => ({
        ...prev,
        [currentKey]: createEmptySchedule(selectedYear, selectedQuarter)
      }));
    }
  }, [currentKey, selectedYear, selectedQuarter]);

  const updateActiveRows = (updater: AllocationRow[] | ((prev: AllocationRow[]) => AllocationRow[])) => {
    setSchedules((prev) => {
      const currentList = prev[currentKey] || [];
      const newList = typeof updater === 'function' ? updater(currentList) : updater;
      return {
        ...prev,
        [currentKey]: newList
      };
    });
  };

  // Ateliê operations
  const handleAddAtelie = (newAtelie: Omit<Atelie, 'id'>) => {
    const newId = `atelie-${Date.now()}`;
    const item: Atelie = {
      ...newAtelie,
      id: newId,
    };
    setAtelies((prev) => {
      const newComps = item.composableWith || [];
      const listWithNewItem = [...prev, item];
      return listWithNewItem.map((itemInList) => {
        if (itemInList.id === newId) {
          return itemInList;
        }
        
        const itemComps = itemInList.composableWith || [];
        const belongs = newComps.includes(itemInList.id);
        const hasMe = itemComps.includes(newId);
        
        if (belongs && !hasMe) {
          return {
            ...itemInList,
            composableWith: [...itemComps, newId]
          };
        } else if (!belongs && hasMe) {
          return {
            ...itemInList,
            composableWith: itemComps.filter(id => id !== newId)
          };
        }
        return itemInList;
      });
    });
  };

  const handleUpdateAtelie = (updated: Atelie) => {
    setAtelies((prev) => {
      const newComps = updated.composableWith || [];
      return prev.map((item) => {
        if (item.id === updated.id) {
          return updated;
        }
        
        const itemComps = item.composableWith || [];
        const belongs = newComps.includes(item.id);
        const hasMe = itemComps.includes(updated.id);
        
        if (belongs && !hasMe) {
          return {
            ...item,
            composableWith: [...itemComps, updated.id]
          };
        } else if (!belongs && hasMe) {
          return {
            ...item,
            composableWith: itemComps.filter(id => id !== updated.id)
          };
        }
        return item;
      });
    });
  };

  const handleDeleteAtelie = (id: string) => {
    setAtelies((prev) => 
      prev
        .filter((item) => item.id !== id)
        .map((item) => ({
          ...item,
          composableWith: (item.composableWith || []).filter((compId) => compId !== id)
        }))
    );
    // Clear allocations referencing this atelie in ALL schedules
    setSchedules((prev) => {
      const updatedSchedules = { ...prev };
      Object.keys(updatedSchedules).forEach((key) => {
        updatedSchedules[key] = updatedSchedules[key].map((row) => {
          const updatedAllocations = { ...row.allocations };
          Object.keys(updatedAllocations).forEach((phaseKey) => {
            const currentVal = updatedAllocations[phaseKey as PhaseKey];
            if (currentVal) {
              const ids = currentVal.split(',').map((s) => s.trim()).filter(Boolean);
              if (ids.includes(id)) {
                updatedAllocations[phaseKey as PhaseKey] = ids.filter((partId) => partId !== id).join(',');
              }
            }
          });
          return { ...row, allocations: updatedAllocations };
        });
      });
      return updatedSchedules;
    });
  };

  const handleClearAllAtelies = () => {
    setAtelies([]);
    // Clear ALL allocations in ALL schedules since no atelies remain
    setSchedules((prev) => {
      const updatedSchedules = { ...prev };
      Object.keys(updatedSchedules).forEach((key) => {
        updatedSchedules[key] = updatedSchedules[key].map((row) => {
          const updatedAllocations = { ...row.allocations };
          Object.keys(updatedAllocations).forEach((phaseKey) => {
            updatedAllocations[phaseKey as PhaseKey] = '';
          });
          return { ...row, allocations: updatedAllocations };
        });
      });
      return updatedSchedules;
    });
  };

  // Turma operations
  const handleAddTurma = (newTurma: Omit<Turma, 'id'>) => {
    const item: Turma = {
      ...newTurma,
      id: `turma-${Date.now()}`,
    };
    setTurmas((prev) => [...prev, item]);
  };

  const handleAddMultipleTurmas = (newTurmas: Omit<Turma, 'id'>[]) => {
    setTurmas((prev) => {
      const itemsToAdd = newTurmas.map((t, idx) => ({
        ...t,
        id: `turma-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      }));
      return [...prev, ...itemsToAdd];
    });
  };

  const handleUpdateTurma = (updated: Turma) => {
    setTurmas((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleDeleteTurma = (id: string) => {
    setTurmas((prev) => prev.filter((item) => item.id !== id));
    // Clear turma reference in ALL schedules
    setSchedules((prev) => {
      const updatedSchedules = { ...prev };
      Object.keys(updatedSchedules).forEach((key) => {
        updatedSchedules[key] = updatedSchedules[key].map((row) => 
          row.turmaId === id ? { ...row, turmaId: '' } : row
        );
      });
      return updatedSchedules;
    });
  };

  const handleClearAllTurmas = () => {
    setTurmas([]);
    // Clear turma reference in ALL schedules since no turmas remain
    setSchedules((prev) => {
      const updatedSchedules = { ...prev };
      Object.keys(updatedSchedules).forEach((key) => {
        updatedSchedules[key] = updatedSchedules[key].map((row) => 
          ({ ...row, turmaId: '' })
        );
      });
      return updatedSchedules;
    });
  };

  // Partner operations
  const handleAddPartner = (newPartner: Omit<Partner, 'id'>) => {
    const item: Partner = {
      ...newPartner,
      id: `partner-${Date.now()}`,
    };
    setPartners((prev) => [...prev, item]);
  };

  const handleUpdatePartner = (updated: Partner) => {
    setPartners((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleDeletePartner = (id: string) => {
    setPartners((prev) => prev.filter((item) => item.id !== id));
    // Clear partner reference in ALL schedules
    setSchedules((prev) => {
      const updatedSchedules = { ...prev };
      Object.keys(updatedSchedules).forEach((key) => {
        updatedSchedules[key] = updatedSchedules[key].map((row) => 
          row.partnerId === id ? { ...row, partnerId: '' } : row
        );
      });
      return updatedSchedules;
    });
  };

  const handleClearAllPartners = () => {
    setPartners([]);
    // Clear partner reference in ALL schedules since no partners remain
    setSchedules((prev) => {
      const updatedSchedules = { ...prev };
      Object.keys(updatedSchedules).forEach((key) => {
        updatedSchedules[key] = updatedSchedules[key].map((row) => 
          ({ ...row, partnerId: '' })
        );
      });
      return updatedSchedules;
    });
  };

  // Row operations
  const handleAddRow = () => {
    const newRow: AllocationRow = {
      id: `row-${Date.now()}`,
      turmaId: '',
      partnerId: '',
      allocations: {
        inicio: '',
        kickoff: '',
        sprint1: '',
        sprint2: '',
        sprint3: '',
        sprint4: '',
        fim: '',
      },
    };
    updateActiveRows((prev) => [...prev, newRow]);
  };

  const handleUpdateRow = (updated: AllocationRow) => {
    updateActiveRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleDeleteRow = (id: string) => {
    updateActiveRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleResetToDefaults = () => {
    setAtelies(DEFAULT_ATELIES);
    setTurmas(DEFAULT_TURMAS);
    setPartners(DEFAULT_PARTNERS);
    
    // Initialize active schedule with 15 rows: first 5 are defaults, next 10 are placeholders
    const initialRows: AllocationRow[] = [...DEFAULT_ROWS];
    for (let i = DEFAULT_ROWS.length + 1; i <= 15; i++) {
      initialRows.push({
        id: `row-reset-${Date.now()}-${i}`,
        turmaId: '',
        partnerId: '',
        allocations: {
          inicio: '',
          kickoff: '',
          sprint1: '',
          sprint2: '',
          sprint3: '',
          sprint4: '',
          fim: '',
        }
      });
    }
    updateActiveRows(initialRows);
  };

  // Export data as JSON
  const handleExportData = () => {
    const dataStr = JSON.stringify({ 
      atelies, 
      turmas, 
      partners, 
      schedules,
      selectedYear,
      selectedQuarter
    }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'ateliers-sprints-backup.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Import data from JSON
  const handleImportData = (e: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.atelies && parsed.turmas && parsed.partners) {
            setAtelies(parsed.atelies);
            setTurmas(parsed.turmas);
            setPartners(parsed.partners);
            
            if (parsed.schedules) {
              setSchedules(parsed.schedules);
            } else if (parsed.rows) {
              // Backward compatibility
              setSchedules({
                '2026_Q1': parsed.rows
              });
            }
            
            if (parsed.selectedYear) setSelectedYear(parsed.selectedYear);
            if (parsed.selectedQuarter) setSelectedQuarter(parsed.selectedQuarter);
            
            alert('Configurações importadas com sucesso!');
          } else {
            alert('Arquivo JSON inválido ou incompleto.');
          }
        } catch (error) {
          alert('Erro ao processar arquivo JSON.');
        }
      };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans flex flex-col">
      
      {/* Header Navigation matching Geometric Balance */}
      <header className="flex items-center justify-between px-6 sm:px-8 h-16 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs" id="main-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center shadow-sm">
            <div className="w-4 h-4 border-2 border-white rotate-45"></div>
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-800 leading-none">Sistema Ateliês</h1>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Inteli Acadêmico</span>
          </div>
        </div>

        {/* Tab Navigation directly in Header for clean Geometric layout */}
        <nav className="hidden xl:flex gap-2" id="header-nav">
          <button
            id="tab-sprints"
            onClick={() => setActiveTab('sprints')}
            className={`px-4 py-1.5 rounded font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer border ${
              activeTab === 'sprints'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            Grade de Sprints
          </button>

          <button
            id="tab-boletim"
            onClick={() => setActiveTab('boletim')}
            className={`px-4 py-1.5 rounded font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer border ${
              activeTab === 'boletim'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            Boletim EP
          </button>
          
          <button
            id="tab-atelies"
            onClick={() => setActiveTab('atelies')}
            className={`px-4 py-1.5 rounded font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer border ${
              activeTab === 'atelies'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            Cadastro Ateliês
          </button>

          <button
            id="tab-turmas"
            onClick={() => setActiveTab('turmas')}
            className={`px-4 py-1.5 rounded font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer border ${
              activeTab === 'turmas'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            Negócios
          </button>

          <button
            id="tab-partners"
            onClick={() => setActiveTab('partners')}
            className={`px-4 py-1.5 rounded font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer border ${
              activeTab === 'partners'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            Parceiros
          </button>

          <button
            id="tab-hubspot"
            onClick={() => setActiveTab('hubspot')}
            className={`px-4 py-1.5 rounded font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1.5 ${
              activeTab === 'hubspot'
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                : 'border-transparent text-amber-600 hover:text-amber-800 hover:bg-amber-50'
            }`}
          >
            <Database size={13} />
            HubSpot CRM
          </button>
        </nav>

        {/* Database & Cloud Sync + Coordinator Profile */}
        <div className="flex items-center gap-4">
          {/* Cloud Sync Status Indicator */}
          <div 
            title={
              isLoadingDb ? 'Carregando os dados mais recentes do banco de dados...' :
              isSavingDb ? 'Salvando alterações em tempo real no banco de dados...' :
              isDbConfigured ? 'Conexão ativa e segura com o banco de dados.' : 'Operando no modo local'
            }
            className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
              isLoadingDb ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
              isSavingDb ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse' :
              isDbConfigured ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
              'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            {isDbConfigured ? (
              <Cloud size={12} className={isLoadingDb || isSavingDb ? 'animate-bounce' : ''} />
            ) : (
              <CloudOff size={12} />
            )}
            <span className="hidden md:inline">
              {isLoadingDb ? 'Carregando Nuvem...' :
               isSavingDb ? 'Salvando Alterações...' :
               isDbConfigured ? `Sincronizado (${dbProvider || 'Nuvem'})` : 'Sem Conexão Nuvem'}
            </span>
            <span className="md:hidden">
              {isLoadingDb ? 'Lendo...' :
               isSavingDb ? 'Gravando...' :
               isDbConfigured ? 'Sinc' : 'Local'}
            </span>
          </div>

          {isDbConfigured && (
            <button
              onClick={handleForceDbSave}
              disabled={isSavingDb || isLoadingDb}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-full transition-all cursor-pointer disabled:opacity-50"
              title="Forçar salvamento imediato do estado atual para o Supabase"
            >
              <Database size={11} className={isSavingDb ? "animate-spin" : ""} />
              <span>Salvar na Nuvem</span>
            </button>
          )}

          {/* Admin Coordinator Profile Badge */}
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-none">Admin</p>
              <p className="text-xs font-semibold text-slate-700">Coordenação Geral</p>
            </div>
            <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-full border-2 border-white shadow-xs flex items-center justify-center font-bold text-sm">
              CG
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Tab Navigation */}
      <div className="bg-white border-b border-slate-200 flex xl:hidden overflow-x-auto py-2 px-4 gap-2 scrollbar-none sticky top-16 z-20 shadow-2xs">
        <button
          onClick={() => setActiveTab('sprints')}
          className={`px-3 py-1.5 rounded font-bold text-[10px] whitespace-nowrap uppercase tracking-wider shrink-0 cursor-pointer ${
            activeTab === 'sprints' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Sprints
        </button>
        <button
          onClick={() => setActiveTab('boletim')}
          className={`px-3 py-1.5 rounded font-bold text-[10px] whitespace-nowrap uppercase tracking-wider shrink-0 cursor-pointer ${
            activeTab === 'boletim' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Boletim EP
        </button>
        <button
          onClick={() => setActiveTab('atelies')}
          className={`px-3 py-1.5 rounded font-bold text-[10px] whitespace-nowrap uppercase tracking-wider shrink-0 cursor-pointer ${
            activeTab === 'atelies' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Ateliês
        </button>
        <button
          onClick={() => setActiveTab('turmas')}
          className={`px-3 py-1.5 rounded font-bold text-[10px] whitespace-nowrap uppercase tracking-wider shrink-0 cursor-pointer ${
            activeTab === 'turmas' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Negócios
        </button>
         <button
          onClick={() => setActiveTab('partners')}
          className={`px-3 py-1.5 rounded font-bold text-[10px] whitespace-nowrap uppercase tracking-wider shrink-0 cursor-pointer ${
            activeTab === 'partners' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Parceiros
        </button>
        <button
          onClick={() => setActiveTab('hubspot')}
          className={`px-3 py-1.5 rounded font-bold text-[10px] whitespace-nowrap uppercase tracking-wider shrink-0 cursor-pointer flex items-center gap-1 ${
            activeTab === 'hubspot' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-amber-50 text-amber-700 border border-amber-100'
          }`}
        >
          <Database size={11} />
          HubSpot CRM
        </button>
      </div>

      {/* Sub-Header / Tool Bar matching Geometric Balance */}
      {(activeTab === 'sprints' || activeTab === 'boletim') && (
        <div className="bg-slate-50 border-b border-slate-200 px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4" id="sub-header-bar">
          <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
            {/* Year selector */}
            <div className="flex items-center gap-2 bg-white px-3 py-1 border border-slate-200 rounded-md shadow-2xs text-xs">
              <span className="text-slate-400 font-medium whitespace-nowrap">Ano Letivo:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="font-bold text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer py-1 pr-1 outline-none text-xs"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
            </div>

            {/* Quarter selector */}
            <div className="flex items-center gap-2 bg-white px-3 py-1 border border-slate-200 rounded-md shadow-2xs text-xs">
              <span className="text-slate-400 font-medium whitespace-nowrap">Trimestre:</span>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="font-bold text-indigo-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer py-1 pr-1 outline-none text-xs"
              >
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>


            
            {/* Active stats indicators inside toolbar */}
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200/60 text-[11px] text-slate-500 font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              <span>{atelies.length} Ateliês</span>
              <span className="mx-1">•</span>
              <span>{turmas.length} Negócios</span>
              <span className="mx-1">•</span>
              <span>{partners.length} Parceiros</span>
            </div>

            {/* Database Cloud Sync Status Indicator */}
            {isDbConfigured ? (
              <div className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1.5 rounded border border-indigo-200/60 text-[11px] text-indigo-700 font-bold font-mono">
                <span className={`w-1.5 h-1.5 rounded-full ${isSavingDb ? 'bg-amber-500 animate-pulse' : 'bg-indigo-600'}`}></span>
                <span>{isLoadingDb ? 'Conectando Nuvem...' : isSavingDb ? 'Salvando...' : `Nuvem Ativa (${dbProvider || 'Banco'})`}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200/60 text-[11px] text-slate-500 font-medium">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                <span>Armazenamento Local</span>
              </div>
            )}
          </div>

          {/* Toolbar Utility Buttons with Geometric aesthetic */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportData}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Exportar arquivo JSON com todo o backup de dados"
            >
              <Download size={13} />
              Exportar Backup
            </button>

            <label
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Importar backup de arquivo JSON existente"
            >
              <Upload size={13} />
              Importar
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>

            {activeTab === 'sprints' && (
              <button
                onClick={handleAddRow}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <Layers size={13} />
                Nova Linha
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" id="main-content-area">
        {syncToast && (
          <div className={`mb-6 p-4 rounded-lg border flex items-center justify-between gap-3 shadow-xs transition-all duration-300 ${
            syncToast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
            syncToast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' :
            'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${
                syncToast.type === 'success' ? 'bg-emerald-500' :
                syncToast.type === 'error' ? 'bg-rose-500' :
                'bg-blue-500 animate-pulse'
              }`} />
              <p className="text-xs font-semibold">{syncToast.message}</p>
            </div>
            {syncToast.type !== 'info' && (
              <button 
                onClick={() => setSyncToast(null)}
                className="text-xs font-bold uppercase opacity-60 hover:opacity-100 cursor-pointer"
              >
                Fechar
              </button>
            )}
          </div>
        )}
        {dbWarning && (
          <div className="mb-6 p-5 bg-amber-50 border-l-4 border-amber-500 text-amber-900 rounded-r-lg shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-amber-100 text-amber-700 rounded-full shrink-0">
                <Database size={16} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                  Configuração Necessária do Banco de Dados
                </h4>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  Para habilitar a persistência em tempo real no Supabase, crie a tabela correspondente. 
                  Copie o código abaixo, acesse o painel do seu projeto no <strong>Supabase</strong>, vá em <strong>SQL Editor</strong>, clique em <strong>New Query</strong>, cole o código e execute clicando em <strong>Run</strong>:
                </p>
                <pre className="mt-3 p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-md overflow-x-auto border border-slate-800 select-all shadow-inner">
{`CREATE TABLE app_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);`}
                </pre>
                <div className="mt-3 flex gap-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`CREATE TABLE app_state (\n  id TEXT PRIMARY KEY,\n  data JSONB NOT NULL,\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL\n);`);
                    }}
                    className="px-2.5 py-1 bg-slate-800 text-white rounded text-[11px] font-semibold hover:bg-slate-900 transition-all cursor-pointer"
                  >
                    Copiar SQL
                  </button>
                  <button 
                    onClick={() => setDbWarning(null)}
                    className="px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    Fechar Aviso
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'sprints' && (
          <SprintBoard
            atelies={atelies}
            turmas={turmas}
            partners={partners}
            rows={rows}
            onAddRow={handleAddRow}
            onUpdateRow={handleUpdateRow}
            onDeleteRow={handleDeleteRow}
          />
        )}

        {activeTab === 'boletim' && (
          <BoletimEP
            atelies={atelies}
            turmas={turmas}
            partners={partners}
            rows={rows}
            selectedYear={selectedYear}
            selectedQuarter={selectedQuarter}
          />
        )}

        {activeTab === 'atelies' && (
          <AtelieManager
            atelies={atelies}
            onAddAtelie={handleAddAtelie}
            onUpdateAtelie={handleUpdateAtelie}
            onDeleteAtelie={handleDeleteAtelie}
            onClearAtelies={handleClearAllAtelies}
          />
        )}

        {activeTab === 'turmas' && (
          <TurmaManager
            turmas={turmas}
            partners={partners}
            onAddTurma={handleAddTurma}
            onAddMultipleTurmas={handleAddMultipleTurmas}
            onUpdateTurma={handleUpdateTurma}
            onDeleteTurma={handleDeleteTurma}
            onClearTurmas={handleClearAllTurmas}
          />
        )}

        {activeTab === 'partners' && (
          <PartnerManager
            partners={partners}
            onAddPartner={handleAddPartner}
            onUpdatePartner={handleUpdatePartner}
            onDeletePartner={handleDeletePartner}
            onClearPartners={handleClearAllPartners}
          />
        )}

        {activeTab === 'hubspot' && (
          <HubSpotSync
            atelies={atelies}
            turmas={turmas}
            partners={partners}
            onSyncData={({ atelies: syncedAtelies, turmas: syncedTurmas, partners: syncedPartners }) => {
              setAtelies(syncedAtelies);
              setTurmas(syncedTurmas);
              setPartners(syncedPartners);
            }}
          />
        )}
      </main>

      {/* Premium Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 mt-auto border-t border-slate-800 text-xs" id="main-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Controle de Ateliês e Sprints • Inteli Acadêmico</p>
          <div className="flex items-center gap-4">
            <span className="text-gray-500">Desenvolvido para Gestão Avançada de Espaços e Desafios</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
