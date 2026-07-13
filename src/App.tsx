import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Atelie, Turma, Partner, AllocationRow, PhaseKey, AppUser } from './types';
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
import UserManager from './components/UserManager';
import LoginPage from './components/LoginPage';

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
  CloudOff,
  X,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  ChevronDown,
  ShieldAlert
} from 'lucide-react';

function deduplicateArrayById<T extends { id: string }>(arr: T[]): T[] {
  if (!Array.isArray(arr)) return [];
  const uniqueMap = new Map<string, T>();
  arr.forEach((item) => {
    if (item && item.id) {
      uniqueMap.set(item.id, item);
    }
  });
  return Array.from(uniqueMap.values());
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'sprints' | 'boletim' | 'atelies' | 'turmas' | 'partners' | 'hubspot' | 'database' | 'users'>('sprints');
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const [isMobileAdminDropdownOpen, setIsMobileAdminDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Authentication & Access Control States
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; picture?: string } | null>(() => {
    const saved = localStorage.getItem('logged_in_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('app_users_data');
    return saved ? JSON.parse(saved) : [];
  });

  const renderInteliLogo = () => {
    return (
      <div className="relative inline-flex items-end select-none pt-4 pb-0.5" id="brand-logo-frame">
        {/* Wordmark in Manrope font */}
        <span className="font-sans font-extrabold tracking-tight text-xl leading-none text-[#2e2640]">
          {/* First "i" without standard dot - replaced with perfectly positioned Coral dot */}
          <span className="relative inline-block">
            ı
            <span className="absolute left-1/2 transform -translate-x-1/2 bg-[#ff4545] rounded-full top-[3px] w-[3.5px] h-[3.5px]"></span>
          </span>
          ntel
          {/* Second "i" with Coral dot and floating dot cluster sphere */}
          <span className="relative inline-block">
            ı
            <span className="absolute left-1/2 transform -translate-x-1/2 bg-[#ff4545] rounded-full top-[3px] w-[3.5px] h-[3.5px]"></span>
            
            {/* Dotted cluster floating above and to the right */}
            <div className="absolute pointer-events-none top-[-26px] left-[-11px] w-[34px] h-[34px]">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-12">
                <g fill="#ff4545">
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
          </span>
        </span>
      </div>
    );
  };

  // Load from LocalStorage or fall back to preloaded sample defaults
  const [atelies, setAtelies] = useState<Atelie[]>(() => {
    const saved = localStorage.getItem('atelies_data');
    return saved ? JSON.parse(saved) : DEFAULT_ATELIES;
  });

  const [turmas, setTurmas] = useState<Turma[]>(() => {
    const saved = localStorage.getItem('turmas_data');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_TURMAS;
    return deduplicateArrayById(parsed);
  });

  const [partners, setPartners] = useState<Partner[]>(() => {
    const saved = localStorage.getItem('partners_data');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_PARTNERS;
    return deduplicateArrayById(parsed);
  });

  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return localStorage.getItem('selected_year') || '2026';
  });

  const [selectedQuarter, setSelectedQuarter] = useState<string>(() => {
    return localStorage.getItem('selected_quarter') || 'Q1';
  });

  const [sprintDates, setSprintDates] = useState<Record<string, Record<string, string>>>(() => {
    const saved = localStorage.getItem('sprint_dates_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {};
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
  
  const [dbDiagnostics, setDbDiagnostics] = useState<{
    hasSupabaseUrl?: boolean;
    hasSupabaseKey?: boolean;
    hasTable?: boolean;
    connectionError?: string;
  } | null>(null);
  const [showDbHelp, setShowDbHelp] = useState(false);

  // Custom client-side Supabase credentials
  const [inputSupabaseUrl, setInputSupabaseUrl] = useState(() => localStorage.getItem("custom_supabase_url") || "");
  const [inputSupabaseKey, setInputSupabaseKey] = useState(() => localStorage.getItem("custom_supabase_key") || "");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingConn, setIsTestingConn] = useState(false);

  const getDbHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    const url = localStorage.getItem("custom_supabase_url");
    const key = localStorage.getItem("custom_supabase_key");
    if (url) headers["x-supabase-url"] = url;
    if (key) headers["x-supabase-key"] = key;
    return headers;
  };

  const loadDb = async (forceHeaders?: Record<string, string>) => {
    try {
      setIsLoadingDb(true);
      const res = await fetch("/api/db/load", {
        headers: forceHeaders || getDbHeaders()
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        setIsDbConfigured(false);
        return { 
          success: false, 
          message: `Erro do servidor (${res.status}): ${errorText || res.statusText}` 
        };
      }
      
      const resData = await res.json();
      
      if (resData.diagnostics) {
        setDbDiagnostics(resData.diagnostics);
      }
      
      if (resData.success && resData.configured) {
        setIsDbConfigured(true);
        if (resData.isSupabase) {
          setDbProvider('Supabase');
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
            selectedQuarter: dbQuarter,
            sprintDates: dbSprintDates,
            users: dbUsers
          } = resData.data;
          if (dbAtelies) setAtelies(dbAtelies);
          if (dbTurmas) setTurmas(deduplicateArrayById(dbTurmas));
          if (dbPartners) setPartners(deduplicateArrayById(dbPartners));
          if (dbSchedules) setSchedules(dbSchedules);
          if (dbYear) setSelectedYear(dbYear);
          if (dbQuarter) setSelectedQuarter(dbQuarter);
          if (dbSprintDates) setSprintDates(dbSprintDates);
          if (dbUsers) {
            setUsers(dbUsers);
            localStorage.setItem('app_users_data', JSON.stringify(dbUsers));
          }
        }
        return { success: true, message: "Conectado com sucesso!" };
      } else {
        setIsDbConfigured(false);
        return { success: false, message: resData.error || "Sem conexão ativa na nuvem." };
      }
    } catch (err: any) {
      console.error("Error loading database state:", err);
      setIsDbConfigured(false);
      return { success: false, message: err.message || "Erro de rede ao conectar." };
    } finally {
      setIsLoadingDb(false);
      setInitialLoadDone(true);
    }
  };

  // 1. Initial Load effect from database
  useEffect(() => {
    loadDb();
  }, []);

  const handleSaveCustomCredentials = async (e: FormEvent) => {
    e.preventDefault();
    setIsTestingConn(true);
    setTestResult(null);
    
    const cleanUrl = inputSupabaseUrl.trim();
    const cleanKey = inputSupabaseKey.trim();
    
    if (!cleanUrl || !cleanKey) {
      setTestResult({ success: false, message: "Por favor, preencha a URL e a Chave do Supabase." });
      setIsTestingConn(false);
      return;
    }
    
    // Temporarily save to local storage
    localStorage.setItem("custom_supabase_url", cleanUrl);
    localStorage.setItem("custom_supabase_key", cleanKey);
    
    // Test connection by calling loadDb with these headers
    const tempHeaders = {
      "Content-Type": "application/json",
      "x-supabase-url": cleanUrl,
      "x-supabase-key": cleanKey
    };
    
    const res = await loadDb(tempHeaders);
    if (res.success) {
      setTestResult({ success: true, message: "Conectado e sincronizado com sucesso!" });
      // Keep it open briefly to show success
      setTimeout(() => {
        setTestResult(null);
      }, 3000);
    } else {
      setTestResult({ 
        success: false, 
        message: `Não foi possível conectar: ${res.message}` 
      });
      // Rollback local storage
      localStorage.removeItem("custom_supabase_url");
      localStorage.removeItem("custom_supabase_key");
    }
    setIsTestingConn(false);
  };

  const handleDisconnectDb = async () => {
    localStorage.removeItem("custom_supabase_url");
    localStorage.removeItem("custom_supabase_key");
    setInputSupabaseUrl("");
    setInputSupabaseKey("");
    setTestResult(null);
    setIsDbConfigured(false);
    setDbProvider(null);
    await loadDb({ "Content-Type": "application/json" });
  };

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

  useEffect(() => {
    localStorage.setItem('sprint_dates_data', JSON.stringify(sprintDates));
  }, [sprintDates]);

  // Sync users list to LocalStorage
  useEffect(() => {
    localStorage.setItem('app_users_data', JSON.stringify(users));
  }, [users]);

  // Auth & User Management Handlers
  const handleAddUser = (user: Omit<AppUser, 'id'>) => {
    const newUser: AppUser = {
      ...user,
      id: `user-${Date.now()}`
    };
    setUsers([...users, newUser]);
  };

  const handleUpdateUser = (updatedUser: AppUser) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleDeleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const handleLoginSuccess = (user: { name: string; email: string; picture?: string }) => {
    setCurrentUser(user);
    localStorage.setItem('logged_in_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('logged_in_user');
    setActiveTab('sprints');
  };

  // Find current logged-in user in registered list
  const currentUserReg = currentUser 
    ? users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase())
    : null;

  // Auto-seed first user if list is empty, making them Super Admin
  useEffect(() => {
    if (currentUser && users.length === 0) {
      const firstAdmin: AppUser = {
        id: `user-admin-${Date.now()}`,
        name: currentUser.name,
        email: currentUser.email.toLowerCase(),
        allowedTabs: ['sprints', 'boletim', 'atelies', 'turmas', 'partners', 'hubspot', 'database', 'users'],
        isAdmin: true
      };
      setUsers([firstAdmin]);
    }
  }, [currentUser, users.length]);

  // Access Control Policy Checker
  const hasAccessToTab = (tab: string): boolean => {
    if (!currentUser) return false;
    if (users.length === 0) return true; // Empty database bypass during seeding
    if (!currentUserReg) return false;
    if (currentUserReg.isAdmin) return true;
    return currentUserReg.allowedTabs?.includes(tab) || false;
  };

  // Redirect users if they navigate to an unauthorized tab
  useEffect(() => {
    if (currentUser && currentUserReg) {
      if (!hasAccessToTab(activeTab)) {
        const allowed = ['sprints', 'boletim', 'atelies', 'turmas', 'partners', 'hubspot', 'database', 'users']
          .find(t => hasAccessToTab(t));
        if (allowed) {
          setActiveTab(allowed as any);
        }
      }
    }
  }, [activeTab, currentUser, currentUserReg]);

  // Handle click outside for Admin Dropdown
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const adminButton = document.getElementById('tab-admin');
      const adminMenu = document.getElementById('admin-dropdown-menu');
      if (
        adminButton && 
        !adminButton.contains(event.target as Node) && 
        (!adminMenu || !adminMenu.contains(event.target as Node))
      ) {
        setIsAdminDropdownOpen(false);
      }
    };

    if (isAdminDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isAdminDropdownOpen]);

  // Handle click outside for Mobile Admin Dropdown
  useEffect(() => {
    const handleOutsideClickMobile = (event: MouseEvent) => {
      const mobileAdminButton = document.getElementById('mobile-tab-admin');
      const mobileAdminMenu = document.getElementById('mobile-admin-dropdown-menu');
      if (
        mobileAdminButton && 
        !mobileAdminButton.contains(event.target as Node) && 
        (!mobileAdminMenu || !mobileAdminMenu.contains(event.target as Node))
      ) {
        setIsMobileAdminDropdownOpen(false);
      }
    };

    if (isMobileAdminDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClickMobile);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClickMobile);
    };
  }, [isMobileAdminDropdownOpen]);

  // 2. Autosave to database on state change
  useEffect(() => {
    if (!initialLoadDone || !isDbConfigured) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        setIsSavingDb(true);
        const res = await fetch("/api/db/save", {
          method: "POST",
          headers: getDbHeaders(),
          body: JSON.stringify({ 
            atelies, 
            turmas, 
            partners, 
            schedules, 
            selectedYear, 
            selectedQuarter,
            sprintDates,
            users
          })
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Erro ao salvar no servidor (${res.status}):`, errorText || res.statusText);
          return;
        }
        
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
  }, [atelies, turmas, partners, schedules, selectedYear, selectedQuarter, sprintDates, users, initialLoadDone, isDbConfigured, dbWarning]);

  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleForceDbSave = async () => {
    try {
      setIsSavingDb(true);
      setSyncToast({ message: "Sincronizando os dados locais atuais com a nuvem (Supabase)...", type: 'info' });
      const res = await fetch("/api/db/save", {
        method: "POST",
        headers: getDbHeaders(),
        body: JSON.stringify({ 
          atelies, 
          turmas, 
          partners, 
          schedules, 
          selectedYear, 
          selectedQuarter,
          sprintDates,
          users
        })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        setSyncToast({ message: `Erro do servidor (${res.status}): ${errorText || res.statusText}`, type: 'error' });
        return;
      }
      
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
            setTurmas(deduplicateArrayById(parsed.turmas));
            setPartners(deduplicateArrayById(parsed.partners));
            
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

  // 1. Unauthenticated view -> Render LoginPage
  if (!currentUser) {
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess}
        currentUserEmail={null}
      />
    );
  }

  // 2. Authenticated but not registered whitelisted user -> Render Access Denied View
  if (users.length > 0 && !currentUserReg) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert size={32} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-800">Acesso Não Autorizado</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Sua conta Google (<strong className="text-slate-700">{currentUser.email}</strong>) não está cadastrada nesta plataforma.
            </p>
            <p className="text-xs text-slate-400">
              Por favor, solicite ao administrador da coordenação que cadastre seu e-mail no Controle de Acessos.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-slate-800 hover:bg-slate-950 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-lg transition-all cursor-pointer"
          >
            Fazer Logout / Trocar de Conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans flex flex-col">
      
      {/* Header Navigation matching Geometric Balance */}
      <header className="flex items-center justify-between px-6 sm:px-8 h-16 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs" id="main-header">
        <div className="flex items-center gap-3">
          {renderInteliLogo()}
          <div className="h-6 w-[1px] bg-slate-200 hidden md:block"></div>
          <h1 className="text-sm font-black tracking-tight text-[#2e2640] uppercase leading-none hidden md:block">Sistema Ateliês</h1>
        </div>

        {/* Tab Navigation directly in Header for clean Geometric layout */}
        <nav className="hidden xl:flex gap-2 items-center" id="header-nav">
          {hasAccessToTab('sprints') && (
            <button
              id="tab-sprints"
              onClick={() => {
                setActiveTab('sprints');
                setIsAdminDropdownOpen(false);
              }}
              className={`px-4 py-1.5 rounded font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer border ${
                activeTab === 'sprints'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              Sprints
            </button>
          )}

          {hasAccessToTab('boletim') && (
            <button
              id="tab-boletim"
              onClick={() => {
                setActiveTab('boletim');
                setIsAdminDropdownOpen(false);
              }}
              className={`px-4 py-1.5 rounded font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer border ${
                activeTab === 'boletim'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              Boletim EP
            </button>
          )}

          {hasAccessToTab('turmas') && (
            <button
              id="tab-turmas"
              onClick={() => {
                setActiveTab('turmas');
                setIsAdminDropdownOpen(false);
              }}
              className={`px-4 py-1.5 rounded font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer border ${
                activeTab === 'turmas'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              Negócios
            </button>
          )}

          {hasAccessToTab('partners') && (
            <button
              id="tab-partners"
              onClick={() => {
                setActiveTab('partners');
                setIsAdminDropdownOpen(false);
              }}
              className={`px-4 py-1.5 rounded font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer border ${
                activeTab === 'partners'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              Parceiros
            </button>
          )}

          {/* Admin Dropdown tab matching deep teal color from diagram */}
          {(hasAccessToTab('atelies') || hasAccessToTab('hubspot') || hasAccessToTab('database') || hasAccessToTab('users')) && (
            <div className="relative">
              <button
                id="tab-admin"
                onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                className={`px-4 py-1.5 rounded font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1.5 ${
                  ['atelies', 'hubspot', 'database', 'users'].includes(activeTab) || isAdminDropdownOpen
                    ? 'bg-[#0f4c5c] text-white border-[#0f4c5c] shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                <span>Admin</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isAdminDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isAdminDropdownOpen && (
                <div 
                  id="admin-dropdown-menu"
                  className="absolute right-0 mt-2 w-56 bg-[#0f4c5c] rounded shadow-lg z-50 animate-fade-in border border-[#0b3a47] overflow-hidden flex flex-col"
                >
                  {hasAccessToTab('atelies') && (
                    <button
                      onClick={() => {
                        setActiveTab('atelies');
                        setIsAdminDropdownOpen(false);
                      }}
                      className={`w-full text-center px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b border-[#145d70] ${
                        activeTab === 'atelies' ? 'bg-[#155e75] text-white' : 'text-[#e2f1f5] hover:bg-[#155e75]/60 hover:text-white'
                      }`}
                    >
                      Cadastro de Ateliê
                    </button>
                  )}
                  {hasAccessToTab('hubspot') && (
                    <button
                      onClick={() => {
                        setActiveTab('hubspot');
                        setIsAdminDropdownOpen(false);
                      }}
                      className={`w-full text-center px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b border-[#145d70] ${
                        activeTab === 'hubspot' ? 'bg-[#155e75] text-white' : 'text-[#e2f1f5] hover:bg-[#155e75]/60 hover:text-white'
                      }`}
                    >
                      Conexão CRM
                    </button>
                  )}
                  {hasAccessToTab('database') && (
                    <button
                      onClick={() => {
                        setActiveTab('database');
                        setIsAdminDropdownOpen(false);
                      }}
                      className={`w-full text-center px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        hasAccessToTab('users') ? 'border-b border-[#145d70]' : ''
                      } ${
                        activeTab === 'database' ? 'bg-[#155e75] text-white' : 'text-[#e2f1f5] hover:bg-[#155e75]/60 hover:text-white'
                      }`}
                    >
                      Conexão de banco de dados
                    </button>
                  )}
                  {hasAccessToTab('users') && (
                    <button
                      onClick={() => {
                        setActiveTab('users');
                        setIsAdminDropdownOpen(false);
                      }}
                      className={`w-full text-center px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        activeTab === 'users' ? 'bg-[#155e75] text-white' : 'text-[#e2f1f5] hover:bg-[#155e75]/60 hover:text-white'
                      }`}
                    >
                      Controle de Acessos
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Database & Cloud Sync + Coordinator Profile */}
        <div className="flex items-center gap-4">
          {/* Minimalist Status Dot - Only the green/gray dot in everyone's view */}
          <button 
            onClick={() => {
              setActiveTab('database');
              setIsAdminDropdownOpen(false);
            }}
            title={isDbConfigured ? `Sincronizado com o Supabase (${dbProvider}). Clique para ver detalhes.` : "Utilizando Armazenamento Local. Clique para conectar à nuvem."}
            className="flex items-center justify-center hover:bg-slate-50 border border-slate-200/60 rounded-full transition-all cursor-pointer h-8 w-8"
          >
            <span className="relative flex h-2.5 w-2.5">
              {isDbConfigured ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400"></span>
              )}
            </span>
          </button>

          {/* Admin Coordinator Profile Badge */}
          <div className="relative flex items-center pl-4 border-l border-slate-200">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-3 h-9 text-left cursor-pointer group focus:outline-none"
              title="Menu do Usuário"
            >
              <div className="text-right hidden sm:block">
                <p className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest leading-none">
                  {currentUserReg?.isAdmin ? 'ADMINISTRADOR' : 'MEMBRO'}
                </p>
                <p className="text-xs font-bold text-slate-700 leading-tight group-hover:text-indigo-600 transition-colors">
                  {currentUser.name}
                </p>
              </div>
              {currentUser.picture ? (
                <img 
                  src={currentUser.picture} 
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-full border border-slate-200 group-hover:border-indigo-400 transition-colors object-cover shadow-2xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200 shadow-2xs flex items-center justify-center font-bold text-sm select-none uppercase">
                  {currentUser.name.slice(0, 2)}
                </div>
              )}
            </button>

            {isProfileDropdownOpen && (
              <div 
                className="absolute right-0 top-11 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-50 animate-fade-in flex flex-col space-y-3"
                onMouseLeave={() => setIsProfileDropdownOpen(false)}
              >
                <div className="border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-bold text-slate-800 block truncate">{currentUser.name}</span>
                  <span className="text-[11px] text-slate-400 block truncate">{currentUser.email}</span>
                </div>
                
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Acessos Disponíveis:</div>
                  <div className="flex flex-wrap gap-1">
                    {currentUserReg?.isAdmin ? (
                      <span className="bg-[#0f4c5c]/10 text-[#0f4c5c] text-[9.5px] font-bold px-1.5 py-0.5 rounded">
                        Acesso Total (Admin)
                      </span>
                    ) : currentUserReg?.allowedTabs && currentUserReg.allowedTabs.length > 0 ? (
                      currentUserReg.allowedTabs.map(tab => (
                        <span key={tab} className="bg-slate-100 text-slate-600 text-[9px] font-medium px-1 py-0.5 rounded uppercase">
                          {tab}
                        </span>
                      ))
                    ) : (
                      <span className="bg-rose-50 text-rose-600 text-[9.5px] font-bold px-1.5 py-0.5 rounded">
                        Sem abas liberadas
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] uppercase tracking-wider py-2 rounded-lg transition-all cursor-pointer border border-rose-100 text-center flex items-center justify-center gap-1"
                >
                  Sair da Conta
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Tab Navigation */}
      <div 
        className={`bg-white border-b border-slate-200 flex xl:hidden py-2 px-4 gap-2 sticky top-16 z-20 shadow-2xs items-center ${
          isMobileAdminDropdownOpen ? 'overflow-visible' : 'overflow-x-auto scrollbar-none'
        }`}
      >
        {hasAccessToTab('sprints') && (
          <button
            onClick={() => {
              setActiveTab('sprints');
              setIsMobileAdminDropdownOpen(false);
            }}
            className={`px-3 py-1.5 rounded font-bold text-[10px] whitespace-nowrap uppercase tracking-wider shrink-0 cursor-pointer ${
              activeTab === 'sprints' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Sprints
          </button>
        )}
        {hasAccessToTab('boletim') && (
          <button
            onClick={() => {
              setActiveTab('boletim');
              setIsMobileAdminDropdownOpen(false);
            }}
            className={`px-3 py-1.5 rounded font-bold text-[10px] whitespace-nowrap uppercase tracking-wider shrink-0 cursor-pointer ${
              activeTab === 'boletim' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Boletim EP
          </button>
        )}
        {hasAccessToTab('turmas') && (
          <button
            onClick={() => {
              setActiveTab('turmas');
              setIsMobileAdminDropdownOpen(false);
            }}
            className={`px-3 py-1.5 rounded font-bold text-[10px] whitespace-nowrap uppercase tracking-wider shrink-0 cursor-pointer ${
              activeTab === 'turmas' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Negócios
          </button>
        )}
        {hasAccessToTab('partners') && (
          <button
            onClick={() => {
              setActiveTab('partners');
              setIsMobileAdminDropdownOpen(false);
            }}
            className={`px-3 py-1.5 rounded font-bold text-[10px] whitespace-nowrap uppercase tracking-wider shrink-0 cursor-pointer ${
              activeTab === 'partners' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Parceiros
          </button>
        )}

        {/* Mobile Admin Dropdown */}
        {(hasAccessToTab('atelies') || hasAccessToTab('hubspot') || hasAccessToTab('database') || hasAccessToTab('users')) && (
          <div className="relative shrink-0">
            <button
              id="mobile-tab-admin"
              onClick={() => setIsMobileAdminDropdownOpen(!isMobileAdminDropdownOpen)}
              className={`px-3 py-1.5 rounded font-bold text-[10px] whitespace-nowrap uppercase tracking-wider cursor-pointer flex items-center gap-1 border ${
                ['atelies', 'hubspot', 'database', 'users'].includes(activeTab) || isMobileAdminDropdownOpen
                  ? 'bg-[#0f4c5c] text-white border-[#0f4c5c] shadow-xs'
                  : 'border-transparent bg-slate-100 text-slate-600'
              }`}
            >
              <span>Admin</span>
              <ChevronDown size={10} className={`transition-transform duration-200 ${isMobileAdminDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMobileAdminDropdownOpen && (
              <div 
                id="mobile-admin-dropdown-menu"
                className="absolute right-0 mt-2 w-52 bg-[#0f4c5c] rounded shadow-lg z-50 animate-fade-in border border-[#0b3a47] overflow-hidden flex flex-col"
              >
                {hasAccessToTab('atelies') && (
                  <button
                    onClick={() => {
                      setActiveTab('atelies');
                      setIsMobileAdminDropdownOpen(false);
                    }}
                    className={`w-full text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border-b border-[#145d70] ${
                      activeTab === 'atelies' ? 'bg-[#155e75] text-white' : 'text-[#e2f1f5] hover:bg-[#155e75]/60 hover:text-white'
                    }`}
                  >
                    Cadastro de Ateliê
                  </button>
                )}
                {hasAccessToTab('hubspot') && (
                  <button
                    onClick={() => {
                      setActiveTab('hubspot');
                      setIsMobileAdminDropdownOpen(false);
                    }}
                    className={`w-full text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border-b border-[#145d70] ${
                      activeTab === 'hubspot' ? 'bg-[#155e75] text-white' : 'text-[#e2f1f5] hover:bg-[#155e75]/60 hover:text-white'
                    }`}
                  >
                    Conexão CRM
                  </button>
                )}
                {hasAccessToTab('database') && (
                  <button
                    onClick={() => {
                      setActiveTab('database');
                      setIsMobileAdminDropdownOpen(false);
                    }}
                    className={`w-full text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      hasAccessToTab('users') ? 'border-b border-[#145d70]' : ''
                    } ${
                      activeTab === 'database' ? 'bg-[#155e75] text-white' : 'text-[#e2f1f5] hover:bg-[#155e75]/60 hover:text-white'
                    }`}
                  >
                    Conexão de banco de dados
                  </button>
                )}
                {hasAccessToTab('users') && (
                  <button
                    onClick={() => {
                      setActiveTab('users');
                      setIsMobileAdminDropdownOpen(false);
                    }}
                    className={`w-full text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      activeTab === 'users' ? 'bg-[#155e75] text-white' : 'text-[#e2f1f5] hover:bg-[#155e75]/60 hover:text-white'
                    }`}
                  >
                    Controle de Acessos
                  </button>
                )}
              </div>
            )}
          </div>
        )}
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
                <option value="2026">2026</option>
                <option value="2027">2027</option>
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
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8" id="main-content-area">
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
);

-- Desabilitar RLS para permitir acesso de leitura/escrita com chave anon sem politicas complexas
ALTER TABLE app_state DISABLE ROW LEVEL SECURITY;`}
                </pre>
                <div className="mt-3 flex gap-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`CREATE TABLE app_state (\n  id TEXT PRIMARY KEY,\n  data JSONB NOT NULL,\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL\n);\n\nALTER TABLE app_state DISABLE ROW LEVEL SECURITY;`);
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
            sprintDates={sprintDates[currentKey] || {}}
            selectedYear={selectedYear}
            selectedQuarter={selectedQuarter}
            onUpdateSprintDates={(dates) => setSprintDates(prev => ({ ...prev, [currentKey]: dates }))}
            onAddRow={handleAddRow}
            onUpdateRow={handleUpdateRow}
            onDeleteRow={handleDeleteRow}
            onUpdateAllRows={updateActiveRows}
          />
        )}

        {activeTab === 'boletim' && (
          <BoletimEP
            atelies={atelies}
            turmas={turmas}
            partners={partners}
            rows={rows}
            sprintDates={sprintDates[currentKey] || {}}
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
            atelies={atelies}
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
              
              // Preservar propriedades locais editadas pelos usuários, especialmente studentCount
              setTurmas((prevTurmas) => {
                const merged = syncedTurmas.map((synced) => {
                  const existing = prevTurmas.find((t) => t.id === synced.id);
                  if (existing) {
                    return {
                      ...synced,
                      // Preservar studentCount se ele existir localmente e o valor sincronizado não contiver um novo valor numérico válido
                      studentCount: synced.studentCount !== undefined ? synced.studentCount : existing.studentCount,
                    };
                  }
                  return synced;
                });
                return deduplicateArrayById(merged);
              });

              setPartners(deduplicateArrayById(syncedPartners));
            }}
          />
        )}

        {activeTab === 'database' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-4xl mx-auto overflow-hidden animate-fade-in" id="database-dashboard-view">
            {/* Header */}
            <div className="border-b border-slate-200 px-6 sm:px-8 py-5 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Database className="text-indigo-600" size={20} />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                    Sincronização & Banco de Dados Supabase (Nuvem)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Gerencie as conexões em nuvem, salve dados remotamente ou configure novas chaves.</p>
                </div>
              </div>
              
              {/* Cloud Sync Status Badge */}
              <div className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isDbConfigured ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isDbConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span>{isDbConfigured ? 'Conectado e Sincronizado' : 'Modo Local Offline'}</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 space-y-8">
              {/* Status Banner */}
              <div className="p-5 rounded-lg flex flex-col sm:flex-row items-start gap-4 border" style={{
                backgroundColor: isDbConfigured ? '#ecfdf5' : '#f8fafc',
                borderColor: isDbConfigured ? '#a7f3d0' : '#e2e8f0'
              }}>
                <div className={`p-2.5 rounded-full shrink-0 ${isDbConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  {isDbConfigured ? <Cloud size={24} /> : <CloudOff size={24} />}
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                    Status de Operação: {isDbConfigured ? `Sincronizado via Nuvem (${dbProvider})` : 'Modo Local (LocalStorage)'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                    {isDbConfigured 
                      ? 'Seus dados estão sendo guardados e sincronizados de forma segura e imediata em tempo real. Você pode acessar este painel de qualquer computador ou navegador sem perder seu progresso.'
                      : 'O aplicativo está salvando as alterações de forma segura apenas neste navegador local. Se você limpar o cache ou trocar de computador, os dados voltarão ao estado padrão. Para conectá-lo permanentemente ao seu banco de dados Supabase, configure a conexão abaixo.'
                    }
                  </p>
                </div>
              </div>

              {/* Force Save / Sync section */}
              {isDbConfigured && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                      Salvar Manualmente na Nuvem
                    </h5>
                    <p className="text-xs text-indigo-700 leading-relaxed max-w-lg">
                      O sistema salva suas alterações automaticamente, mas você pode forçar uma sincronização manual imediata do estado local se desejar.
                    </p>
                  </div>
                  <button
                    onClick={handleForceDbSave}
                    disabled={isSavingDb || isLoadingDb}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-700 rounded transition-all cursor-pointer disabled:opacity-50 shadow-sm shrink-0"
                    title="Forçar salvamento imediato do estado atual para o Supabase"
                  >
                    <Database size={14} className={isSavingDb ? "animate-spin" : ""} />
                    <span>{isSavingDb ? "Salvando..." : "Sincronizar Agora"}</span>
                  </button>
                </div>
              )}

              {/* Two Column Layout for Diagnostics & Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Connection Form */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-950 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                    <Database size={14} className="text-indigo-600" />
                    Configurar Credenciais do Supabase
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Insira os dados do seu banco Supabase abaixo. As credenciais ficam salvas de forma segura em seu navegador para conectar imediatamente.
                  </p>

                  <form onSubmit={handleSaveCustomCredentials} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        URL do Projeto (Project URL)
                      </label>
                      <input 
                        type="url"
                        placeholder="https://xxxx.supabase.co"
                        value={inputSupabaseUrl}
                        onChange={(e) => setInputSupabaseUrl(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Chave de API (anon public ou service_role)
                      </label>
                      <input 
                        type="password"
                        placeholder="eyJhbGciOi..."
                        value={inputSupabaseKey}
                        onChange={(e) => setInputSupabaseKey(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                        required
                      />
                    </div>

                    {testResult && (
                      <div className={`p-3 rounded text-xs leading-relaxed flex items-start gap-2 ${
                        testResult.success 
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                          : 'bg-rose-50 border border-rose-200 text-rose-800'
                      }`}>
                        <div className="mt-0.5 shrink-0">
                          {testResult.success ? <CheckCircle2 size={14} className="text-emerald-700" /> : <XCircle size={14} className="text-rose-700" />}
                        </div>
                        <span className="font-semibold">{testResult.message}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2.5 pt-1">
                      <button
                        type="submit"
                        disabled={isTestingConn}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isTestingConn ? "Conectando..." : "Salvar e Conectar"}
                      </button>

                      {(localStorage.getItem("custom_supabase_url") || localStorage.getItem("custom_supabase_key")) && (
                        <button
                          type="button"
                          onClick={handleDisconnectDb}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Desconectar
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Diagnostics Report */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-950 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                    <Database size={14} className="text-[#ff4545]" />
                    Relatório Diagnóstico
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Verifique se o servidor está configurado corretamente com as variáveis ou conexão local.
                  </p>

                  <div className="space-y-3">
                    <div className="p-3 bg-white border border-slate-150 rounded flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Variável SUPABASE_URL:</span>
                      <span className="flex items-center gap-1.5 font-bold">
                        {dbDiagnostics?.hasSupabaseUrl ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 font-mono">
                            <CheckCircle2 size={10} /> Configurado
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 font-mono">
                            <XCircle size={10} /> Ausente
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-slate-150 rounded flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Variável SUPABASE_KEY:</span>
                      <span className="flex items-center gap-1.5 font-bold">
                        {dbDiagnostics?.hasSupabaseKey ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 font-mono">
                            <CheckCircle2 size={10} /> Configurado
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 font-mono">
                            <XCircle size={10} /> Ausente
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-slate-150 rounded flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Origem da Conexão:</span>
                      <span className="font-bold text-slate-800 uppercase tracking-wider font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                        {dbDiagnostics?.provider || 'Nenhum'}
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-slate-150 rounded flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Ping do Banco de Dados:</span>
                      <span className={`font-bold font-mono px-2 py-0.5 rounded text-[10px] ${dbDiagnostics?.isHealthy ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                        {dbDiagnostics?.isHealthy ? ' Saudável (Online)' : ' Offline'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* SQL script and setup guide */}
              <div className="border-t border-slate-200 pt-6 space-y-4">
                <h4 className="text-xs font-bold text-slate-950 uppercase tracking-widest">
                  Guia Prático: Como configurar as Tabelas do Supabase
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Para que a sincronização funcione perfeitamente, você deve criar a tabela no seu painel Supabase. Siga os passos:
                </p>

                <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <strong className="text-slate-900">Acesse o painel Supabase e abra o SQL Editor</strong>
                      <p className="mt-0.5 text-slate-600">
                        Entre no seu projeto no <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">Supabase <ExternalLink size={10} /></a>, localize o menu lateral esquerdo e clique no ícone do **SQL Editor** (um ícone de terminal com o símbolo `&gt;_`).
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-slate-950 text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <strong className="text-slate-900">Crie uma nova consulta (New Query) e cole o SQL abaixo:</strong>
                      <pre className="mt-2.5 p-3.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-md overflow-x-auto border border-slate-800 select-all shadow-inner relative group">
{`CREATE TABLE app_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Desabilitar RLS para permitir acesso de leitura/escrita com chave anon sem politicas complexas
ALTER TABLE app_state DISABLE ROW LEVEL SECURITY;`}
                      </pre>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`CREATE TABLE app_state (\n  id TEXT PRIMARY KEY,\n  data JSONB NOT NULL,\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL\n);\n\nALTER TABLE app_state DISABLE ROW LEVEL SECURITY;`);
                          alert('SQL copiado para a área de transferência!');
                        }}
                        className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-950 text-white rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Copy size={12} />
                        Copiar Script SQL
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <strong className="text-slate-900">Execute o comando</strong>
                      <p className="mt-0.5 text-slate-600">
                        Clique no botão **Run** no painel superior direito do editor SQL do Supabase. O banco de dados estará pronto para sincronizar imediatamente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <UserManager
            users={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            currentUserEmail={currentUser ? currentUser.email : null}
          />
        )}
      </main>

      {/* Premium Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 mt-auto border-t border-slate-800 text-xs" id="main-footer">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Controle de Ateliês e Sprints • Inteli</p>
          <div className="flex items-center gap-4">
            <span className="text-gray-500">Desenvolvido para Gestão Avançada de Espaços e Desafios</span>
          </div>
        </div>
      </footer>

      {/* Supabase Connection & Vercel Setup Guide Modal */}
      {showDbHelp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto" id="db-help-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <Database className="text-indigo-600" size={18} />
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Status de Conexão & Banco de Dados Nuvem
                </h3>
              </div>
              <button 
                onClick={() => setShowDbHelp(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/60 rounded-full transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Status Section */}
              <div className="p-4 rounded-lg flex items-start gap-3.5 border" style={{
                backgroundColor: isDbConfigured ? '#ecfdf5' : '#f8fafc',
                borderColor: isDbConfigured ? '#a7f3d0' : '#e2e8f0'
              }}>
                <div className={`p-2 rounded-full ${isDbConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  {isDbConfigured ? <Cloud size={20} /> : <CloudOff size={20} />}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                    Modo Atual: {isDbConfigured ? `Sincronizado via Nuvem (${dbProvider})` : 'Modo Offline / Local (LocalStorage)'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {isDbConfigured 
                      ? 'Seus dados estão sendo guardados e sincronizados de forma segura e imediata em tempo real. Você pode acessar este painel de qualquer computador ou navegador sem perder seu progresso.'
                      : 'O aplicativo está salvando as alterações de forma segura apenas neste navegador local. Se você limpar o cache ou trocar de computador, os dados voltarão ao estado padrão. Para conectá-lo permanentemente ao seu banco de dados Supabase na Vercel, siga o guia abaixo.'
                    }
                  </p>
                </div>
              </div>

              {/* Diagnostics Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-950 uppercase tracking-widest mb-3">
                  Relatório Diagnóstico do Servidor
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Variável SUPABASE_URL:</span>
                    <span className="flex items-center gap-1.5 font-bold">
                      {dbDiagnostics?.hasSupabaseUrl ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                          <CheckCircle2 size={10} /> Configurado
                        </span>
                      ) : (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                          <XCircle size={10} /> Ausente
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-150 rounded flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Variável SUPABASE_KEY:</span>
                    <span className="flex items-center gap-1.5 font-bold">
                      {dbDiagnostics?.hasSupabaseKey ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                          <CheckCircle2 size={10} /> Configurado
                        </span>
                      ) : (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                          <XCircle size={10} /> Ausente
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-150 rounded flex items-center justify-between text-xs sm:col-span-2">
                    <span className="font-semibold text-slate-700">Status da Tabela "app_state":</span>
                    <span className="flex items-center gap-1.5 font-bold">
                      {isDbConfigured && dbProvider === 'Supabase' && (dbDiagnostics?.hasTable !== false) ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                          <CheckCircle2 size={10} /> Ativa e Criada
                        </span>
                      ) : !isDbConfigured && !dbDiagnostics?.hasSupabaseUrl ? (
                        <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">
                          Aguardando credenciais
                        </span>
                      ) : (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                          <XCircle size={10} /> Tabela inexistente no Supabase
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {dbDiagnostics?.connectionError && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs font-mono">
                    <strong>Erro de Conexão do Servidor:</strong> {dbDiagnostics.connectionError}
                  </div>
                )}
              </div>

              {/* Quick Connection Form */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <h4 className="text-xs font-bold text-slate-950 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Database size={14} className="text-indigo-600" />
                  Conexão Direta e Rápida (Sem alterar o Vercel)
                </h4>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed font-medium">
                  Insira os dados do seu banco Supabase abaixo. Suas credenciais ficam salvas de forma segura em seu navegador e o sistema fará a conexão imediatamente.
                </p>

                <form onSubmit={handleSaveCustomCredentials} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      URL do Projeto (Project URL)
                    </label>
                    <input 
                      type="url"
                      placeholder="https://xxxx.supabase.co"
                      value={inputSupabaseUrl}
                      onChange={(e) => setInputSupabaseUrl(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Chave de API (anon public ou service_role)
                    </label>
                    <input 
                      type="password"
                      placeholder="eyJhbGciOi..."
                      value={inputSupabaseKey}
                      onChange={(e) => setInputSupabaseKey(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>

                  {testResult && (
                    <div className={`p-3 rounded text-xs leading-relaxed flex items-start gap-2 ${
                      testResult.success 
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}>
                      <div className="mt-0.5">
                        {testResult.success ? <CheckCircle2 size={14} className="text-emerald-700" /> : <XCircle size={14} className="text-rose-700" />}
                      </div>
                      <span className="font-semibold">{testResult.message}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button
                      type="submit"
                      disabled={isTestingConn}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isTestingConn ? "Testando e Conectando..." : "Salvar e Sincronizar Agora"}
                    </button>

                    {(localStorage.getItem("custom_supabase_url") || localStorage.getItem("custom_supabase_key")) && (
                      <button
                        type="button"
                        onClick={handleDisconnectDb}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Desconectar Banco
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Step-by-Step Guide */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-xs font-bold text-slate-950 uppercase tracking-widest mb-4">
                  Guia Alternativo: Conectar via Variáveis de Ambiente no Vercel
                </h4>

                <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                  {/* Step 1 */}
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <strong className="text-slate-900">Copie as credenciais de API no Supabase</strong>
                      <p className="mt-0.5 text-slate-600">
                        Acesse seu painel no <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">Supabase <ExternalLink size={10} /></a>, entre em seu Projeto, vá em <strong>Project Settings</strong> (engrenagem inferior) &gt; <strong>API</strong>. Copie a <strong>Project URL</strong> e a chave <strong>anon public</strong> (ou a <em>service_role</em>).
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <strong className="text-slate-900">Cadastre as Variáveis de Ambiente na Vercel</strong>
                      <p className="mt-0.5 text-slate-600">
                        Abra o dashboard da sua conta <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">Vercel <ExternalLink size={10} /></a>, clique no projeto deste aplicativo, vá em <strong>Settings</strong> &gt; <strong>Environment Variables</strong> e adicione as seguintes variáveis:
                      </p>
                      <ul className="list-disc ml-5 mt-1.5 space-y-1 text-slate-600">
                        <li>Nome: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-800 text-[11px]">SUPABASE_URL</code> • Valor: <em>(Cole a URL do projeto Supabase)</em></li>
                        <li>Nome: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-800 text-[11px]">SUPABASE_KEY</code> • Valor: <em>(Cole a chave anon ou service_role)</em></li>
                      </ul>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <strong className="text-slate-900">Recarregue o Servidor (Redeploy)</strong>
                      <p className="mt-0.5 text-slate-600">
                        Para que o servidor do Vercel leia as novas variáveis cadastradas, você precisa fazer um novo deploy das variáveis. Na Vercel, clique na aba <strong>Deployments</strong> do projeto, clique nos três pontinhos (<strong className="font-bold">...</strong>) ao lado do último deploy ativo e clique em <strong className="text-indigo-600">Redeploy</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <strong className="text-slate-900">Crie a tabela no SQL Editor do seu Supabase</strong>
                      <p className="mt-0.5 text-slate-600">
                        No menu esquerdo do painel do Supabase, clique em <strong>SQL Editor</strong>. Clique em <strong>New Query</strong> (ou "Quickstarts"), cole o código SQL de criação da tabela abaixo e execute clicando no botão verde <strong className="text-emerald-600 uppercase">Run</strong>:
                      </p>
                      <pre className="mt-2.5 p-3 bg-slate-900 text-slate-200 font-mono text-[10.5px] rounded border border-slate-800 select-all relative group shadow-inner">
{`CREATE TABLE app_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Desabilitar RLS para permitir acesso de leitura/escrita com chave anon sem politicas complexas
ALTER TABLE app_state DISABLE ROW LEVEL SECURITY;`}
                      </pre>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`CREATE TABLE app_state (\n  id TEXT PRIMARY KEY,\n  data JSONB NOT NULL,\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL\n);\n\nALTER TABLE app_state DISABLE ROW LEVEL SECURITY;`);
                          alert("SQL Copiado com sucesso!");
                        }}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all"
                      >
                        <Copy size={11} />
                        <span>Copiar Código SQL</span>
                      </button>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-6 py-4 flex justify-end bg-slate-50 rounded-b-xl">
              <button 
                onClick={() => setShowDbHelp(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
