import React, { useState, useEffect } from 'react';
import { Atelie, Turma, Partner } from '../types';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ExternalLink, 
  ArrowRight, 
  Settings2, 
  Sparkles, 
  MapPin, 
  Users, 
  Briefcase 
} from 'lucide-react';

interface HubSpotSyncProps {
  atelies: Atelie[];
  turmas: Turma[];
  partners: Partner[];
  onSyncData: (data: { atelies: Atelie[]; turmas: Turma[]; partners: Partner[] }) => void;
}

export default function HubSpotSync({
  atelies,
  turmas,
  partners,
  onSyncData
}: HubSpotSyncProps) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [availableSchemas, setAvailableSchemas] = useState<any[]>([]);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [successSummary, setSuccessSummary] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selector for sync target
  const [syncTarget, setSyncTarget] = useState<'all' | 'turmas' | 'partners'>('all');

  // Custom token configuration state
  const [customToken, setCustomToken] = useState<string>(() => {
    return localStorage.getItem('custom_hubspot_token') || '';
  });
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tempToken, setTempToken] = useState('');

  // Configuration mappings
  const [mappings, setMappings] = useState({
    partners: {
      objectType: 'companies',
      mapName: 'name',
      mapDescription: 'description',
      mapLogoUrl: 'domain'
    },
    turmas: {
      objectType: 'deals',
      mapName: 'dealname',
      mapCourse: 'dealtype',
      mapPeriod: 'pipeline'
    },
    atelies: {
      objectType: 'deals',
      mapName: '[EP] Ateliê',
      mapBlock: 'industry',
      mapCapacity: 'numberofemployees'
    }
  });

  // Fetch status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, [customToken]);

  const checkConnectionStatus = async (tokenOverride?: string) => {
    setCheckingConnection(true);
    setSyncLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: Verificando status da conexão com HubSpot...`]);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      const tokenToUse = tokenOverride !== undefined ? tokenOverride : customToken;
      if (tokenToUse.trim()) {
        headers['X-Hubspot-Token'] = tokenToUse.trim();
      }

      const res = await fetch('/api/hubspot/status', { headers });
      const data = await res.json();
      setIsConfigured(data.configured);
      if (data.configured) {
        fetchSchemas(tokenToUse);
        setSyncLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: Conexão com HubSpot estabelecida e ativa!`]);
      } else {
        setSyncLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: Nenhuma credencial HubSpot ativa encontrada.`]);
      }
    } catch (e) {
      setIsConfigured(false);
      setSyncLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: Erro ao conectar ao HubSpot.`]);
    } finally {
      setCheckingConnection(false);
    }
  };

  const fetchSchemas = async (tokenToUse?: string) => {
    setLoadingSchemas(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      const actualToken = tokenToUse !== undefined ? tokenToUse : customToken;
      if (actualToken.trim()) {
        headers['X-Hubspot-Token'] = actualToken.trim();
      }

      const res = await fetch('/api/hubspot/schemas', { headers });
      const data = await res.json();
      if (data.schemas) {
        setAvailableSchemas(data.schemas);
      }
    } catch (e) {
      console.error("Erro ao obter schemas do HubSpot", e);
    } finally {
      setLoadingSchemas(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setErrorMsg(null);
    setSuccessSummary(null);
    const targetLabel = syncTarget === 'all' ? 'Tudo (Pipeline B2B)' : syncTarget === 'turmas' ? 'Negócios' : 'Parceiros';
    setSyncLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: Iniciando sincronização de ${targetLabel} HubSpot...`]);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (customToken.trim()) {
        headers['X-Hubspot-Token'] = customToken.trim();
      }

      const res = await fetch('/api/hubspot/fetch', {
        method: 'POST',
        headers,
        body: JSON.stringify({ mappings, syncTarget })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro de comunicação com o HubSpot.');
      }

      const synced = data.data;
      
      // Update actual parent states
      onSyncData({
        atelies: atelies, // Sem sincronização de ateliês
        turmas: (syncTarget === 'all' || syncTarget === 'turmas') && synced.turmas && synced.turmas.length > 0 ? synced.turmas : turmas,
        partners: (syncTarget === 'all' || syncTarget === 'partners') && synced.partners && synced.partners.length > 0 ? synced.partners : partners
      });

      setSuccessSummary({
        ateliesCount: 0,
        turmasCount: (syncTarget === 'all' || syncTarget === 'turmas') ? (synced.turmas?.length || 0) : 0,
        partnersCount: (syncTarget === 'all' || syncTarget === 'partners') ? (synced.partners?.length || 0) : 0,
        target: syncTarget
      });

      const count = syncTarget === 'all'
        ? ((synced.turmas?.length || 0) + (synced.partners?.length || 0))
        : syncTarget === 'turmas' ? (synced.turmas?.length || 0) : (synced.partners?.length || 0);

      setSyncLogs(prev => [
        ...prev,
        `${new Date().toLocaleTimeString()}: Sincronização de ${targetLabel} concluída com sucesso!`,
        `${new Date().toLocaleTimeString()}: Importados ${count} registros extraídos do Pipeline B2B.`
      ]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Houve um problema durante a sincronização.');
      setSyncLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ERRO: ${err.message}`]);
    } finally {
      setSyncing(false);
    }
  };

  // Safe Mock Sync to allow previewing full functionality without Token instantly
  const handleSandboxSync = () => {
    setSyncing(true);
    setErrorMsg(null);
    setSuccessSummary(null);
    const targetLabel = syncTarget === 'all' ? 'Tudo (Pipeline B2B)' : syncTarget === 'turmas' ? 'Negócios' : 'Parceiros';
    setSyncLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: Iniciando sincronização de ${targetLabel} com HubSpot Sandbox (Simulado)...`]);

    setTimeout(() => {
      const sandboxTurmas: Turma[] = [
        { id: 'hs-t1', name: '2026-1B-T14', course: 'Engenharia de Software', period: 'Manhã', studentCount: 30 },
        { id: 'hs-t2', name: '2026-1B-T28', course: 'Engenharia de Software', period: 'Manhã', studentCount: 25 },
        { id: 'hs-t3', name: '2026-1B-T16', course: 'Engenharia de Computação', period: 'Manhã', studentCount: 32 },
        { id: 'hs-t4', name: '2026-1B-T18', course: 'Ciência da Computação', period: 'Manhã', studentCount: 28 },
        { id: 'hs-t5', name: '2026-1B-T11', course: 'Ciência da Computação', period: 'Manhã', studentCount: 35 }
      ];

      const sandboxPartners: Partner[] = [
        { id: 'hs-p1', name: 'IPT', description: 'Parceiro extraído de Deal do pipeline B2B - EP - Iniciativas', logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=IPT' },
        { id: 'hs-p2', name: 'Atvos', description: 'Parceiro extraído de Deal do pipeline B2B - EP - Iniciativas', logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Atvos' },
        { id: 'hs-p3', name: 'AMPARA ANIMAL', description: 'Parceiro extraído de Deal do pipeline B2B - EP - Iniciativas', logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=AMPARA' },
        { id: 'hs-p4', name: 'Pier', description: 'Parceiro extraído de Deal do pipeline B2B - EP - Iniciativas', logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Pier' },
        { id: 'hs-p5', name: 'Zamp', description: 'Parceiro extraído de Deal do pipeline B2B - EP - Iniciativas', logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Zamp' }
      ];

      onSyncData({
        atelies: atelies, // Sem sincronização de ateliês
        turmas: (syncTarget === 'all' || syncTarget === 'turmas') ? sandboxTurmas : turmas,
        partners: (syncTarget === 'all' || syncTarget === 'partners') ? sandboxPartners : partners
      });

      setSuccessSummary({
        ateliesCount: 0,
        turmasCount: (syncTarget === 'all' || syncTarget === 'turmas') ? sandboxTurmas.length : 0,
        partnersCount: (syncTarget === 'all' || syncTarget === 'partners') ? sandboxPartners.length : 0,
        isSandbox: true,
        target: syncTarget
      });

      const count = syncTarget === 'all'
        ? (sandboxTurmas.length + sandboxPartners.length)
        : syncTarget === 'turmas' ? sandboxTurmas.length : sandboxPartners.length;

      setSyncLogs(prev => [
        ...prev,
        `${new Date().toLocaleTimeString()}: Sincronização Simulação de ${targetLabel} concluída!`,
        `${new Date().toLocaleTimeString()}: Carregados ${count} registros simulados do pipeline B2B.`
      ]);
      setSyncing(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="hubspot-sync-panel">
      {/* Intro Hero Section */}
      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 p-12 opacity-5 translate-x-12 translate-y-[-12px]">
          <Database size={240} className="text-white" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles size={12} />
            HubSpot CRM Integration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Importação Direta do HubSpot
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Conecte o seu ambiente HubSpot e importe automaticamente as turmas letivas e os parceiros estratégicos diretamente da sua base de contatos, empresas e negócios do Pipeline B2B.
          </p>
        </div>
      </div>

      {/* Connection status card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 leading-none">
              <Settings2 size={15} />
              Status da Conexão
            </h3>

            {/* Target Item Selection tabs */}
            <div className="flex flex-wrap gap-1 p-0.5 bg-slate-100 rounded-lg w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setSyncTarget('all')}
                className={`flex-1 sm:flex-initial py-1 px-3.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  syncTarget === 'all'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Database size={11} />
                Tudo do Pipeline
              </button>
              <button
                type="button"
                onClick={() => setSyncTarget('turmas')}
                className={`flex-1 sm:flex-initial py-1 px-3.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  syncTarget === 'turmas'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users size={11} />
                Negócios
              </button>
              <button
                type="button"
                onClick={() => setSyncTarget('partners')}
                className={`flex-1 sm:flex-initial py-1 px-3.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  syncTarget === 'partners'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Briefcase size={11} />
                Parceiros
              </button>
            </div>
          </div>

          {isConfigured === null ? (
            <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
              <RefreshCw size={16} className="animate-spin text-indigo-600" />
              Verificando chaves de acesso...
            </div>
          ) : isConfigured ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-800">HubSpot Conectado com Sucesso!</h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    A chave secreta <code className="bg-emerald-100/60 px-1 py-0.5 rounded text-[10px] font-mono">HUBSPOT_ACCESS_TOKEN</code> foi detectada nas variáveis de ambiente e está pronta para uso.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  disabled={syncing}
                  onClick={handleSync}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-sm cursor-pointer transition-all uppercase tracking-wider"
                >
                  <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                  Sincronizar {syncTarget === 'all' ? 'Tudo' : syncTarget === 'turmas' ? 'Negócios' : 'Parceiros'} do HubSpot
                </button>
                <button
                  disabled={syncing || checkingConnection}
                  onClick={() => checkConnectionStatus()}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-all"
                >
                  <RefreshCw size={13} className={checkingConnection ? 'animate-spin text-slate-500' : ''} />
                  {checkingConnection ? 'Verificando...' : 'Recarregar Conexão'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-amber-50/80 border border-amber-200 p-4 rounded-lg">
                <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-800">Nenhuma Chave HubSpot Configurada</h4>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    Você ainda não inseriu o Token de Acesso Privado da API do HubSpot nas configurações. Siga as instruções ao lado para conectar sua conta real ou use a sincronização simulada.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  disabled={syncing || checkingConnection}
                  onClick={handleSandboxSync}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-xs cursor-pointer transition-all uppercase tracking-wider"
                >
                  <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                  Sincronizar {syncTarget === 'all' ? 'Tudo' : syncTarget === 'turmas' ? 'Negócios' : 'Parceiros'} (Simulado)
                </button>
                
                <span className="text-xs text-slate-400">ou</span>

                <button
                  disabled={syncing || checkingConnection}
                  onClick={() => checkConnectionStatus()}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-60 underline decoration-indigo-200 underline-offset-4 flex items-center gap-1.5 cursor-pointer"
                >
                  {checkingConnection ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      Testando...
                    </>
                  ) : (
                    'Já configurei, testar novamente'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Sync Success Summary */}
          {successSummary && (
            <div className="mt-5 bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl animate-fade-in">
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-indigo-600" />
                Sincronização de {successSummary.target === 'all' ? 'Todos os Dados' : successSummary.target === 'turmas' ? 'Negócios' : 'Parceiros'} Concluída
              </h4>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className={`p-2.5 rounded-lg shadow-3xs border transition-all ${(successSummary.target === 'all' || successSummary.target === 'turmas') ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-400 border-slate-150'}`}>
                  <span className={`font-extrabold text-lg block ${(successSummary.target === 'all' || successSummary.target === 'turmas') ? 'text-white' : 'text-slate-700'}`}>{successSummary.turmasCount}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide">Negócios</span>
                </div>
                <div className={`p-2.5 rounded-lg shadow-3xs border transition-all ${(successSummary.target === 'all' || successSummary.target === 'partners') ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-400 border-slate-150'}`}>
                  <span className={`font-extrabold text-lg block ${(successSummary.target === 'all' || successSummary.target === 'partners') ? 'text-white' : 'text-slate-700'}`}>{successSummary.partnersCount}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide">Parceiros</span>
                </div>
              </div>
              {successSummary.isSandbox && (
                <div className="text-[10px] text-indigo-500 font-medium mt-2.5 text-center flex items-center justify-center gap-1">
                  <Sparkles size={11} />
                  Estes dados foram populados utilizando a simulação de CRM acadêmico HubSpot.
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="mt-4 bg-rose-50 border border-rose-200 p-4 rounded-lg text-xs text-rose-700 font-medium space-y-2 animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
              {(errorMsg.toLowerCase().includes('forbidden') || errorMsg.toLowerCase().includes('403') || errorMsg.toLowerCase().includes('permissão')) && (
                <div className="bg-white border border-rose-100 p-3 rounded-md text-rose-800 mt-2 text-[11px] leading-relaxed space-y-1.5">
                  <p className="font-bold flex items-center gap-1">
                    <HelpCircle size={12} className="text-rose-600" />
                    Como resolver o erro de Permissão Negada (403/Forbidden):
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-700">
                    <li>Acesse as configurações do seu <strong>Private App (Aplicativo Privado)</strong> no HubSpot.</li>
                    <li>Navegue até a aba <strong>Escopos (Scopes)</strong>.</li>
                    <li>Certifique-se de que os seguintes escopos de leitura estão ativados:
                      <ul className="list-disc pl-4 mt-1 font-mono text-[10px] space-y-0.5 text-slate-600">
                        <li>Para Negócios (Deals): <code className="bg-slate-100 px-1 py-0.2 rounded text-rose-700">crm.objects.deals.read</code></li>
                        <li>Para Parceiros (Companies): <code className="bg-slate-100 px-1 py-0.2 rounded text-rose-700">crm.objects.companies.read</code></li>
                      </ul>
                    </li>
                    <li>Clique em <strong>Salvar atualizações (Save updates)</strong> no HubSpot e tente sincronizar novamente!</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Custom Token Configuration Panel */}
          <div className="mt-6 pt-5 border-t border-slate-100" id="hubspot-token-config-block">
            <button
              onClick={() => {
                setShowTokenInput(!showTokenInput);
                setTempToken(customToken);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <Settings2 size={13} />
              {customToken ? 'Alterar / Remover Token Customizado' : 'Configurar Token Customizado no Navegador'}
            </button>

            {showTokenInput && (
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                    Token de Acesso Privado do HubSpot (Access Token)
                  </label>
                  <p className="text-[10px] text-slate-400">
                    O token será salvo de forma segura localmente no seu navegador e anexado a cada requisição enviada ao servidor.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    value={tempToken}
                    onChange={(e) => setTempToken(e.target.value)}
                    placeholder="Cole seu token privado (pat-na1-...)"
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const sanitized = tempToken.trim();
                        if (sanitized) {
                          localStorage.setItem('custom_hubspot_token', sanitized);
                          setCustomToken(sanitized);
                          setSyncLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: Token customizado salvo no navegador!`]);
                          await checkConnectionStatus(sanitized);
                        } else {
                          localStorage.removeItem('custom_hubspot_token');
                          setCustomToken('');
                          setSyncLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: Token customizado removido. Usando chave padrão do sistema.`]);
                          await checkConnectionStatus('');
                        }
                        setShowTokenInput(false);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                    >
                      Salvar Token
                    </button>
                    {customToken && (
                      <button
                        onClick={async () => {
                          localStorage.removeItem('custom_hubspot_token');
                          setCustomToken('');
                          setTempToken('');
                          setSyncLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: Token customizado removido.`]);
                          await checkConnectionStatus('');
                          setShowTokenInput(false);
                        }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions Panel */}
        <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-6 shadow-2xs">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
            <HelpCircle size={15} />
            Como Configurar
          </h3>
          <ol className="space-y-3.5 text-xs text-slate-600 list-decimal pl-4 leading-relaxed">
            <li>
              Acesse o seu painel de desenvolvedor no <a href="https://app.hubspot.com/" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline flex inline-flex items-center gap-0.5">HubSpot CRM <ExternalLink size={10} /></a>.
            </li>
            <li>
              Crie um <strong>Aplicativo Privado (Private App)</strong> nas configurações de integrações.
            </li>
            <li>
              Conceda os escopos de leitura necessários: <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">crm.objects.companies.read</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">crm.objects.contacts.read</code> e <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">crm.objects.deals.read</code>.
            </li>
            <li>
              Copie o <strong>Access Token</strong> gerado.
            </li>
            <li>
              Abra o menu <strong>Settings / Secrets</strong> aqui no AI Studio e adicione a variável de ambiente <strong className="text-indigo-700 font-mono text-[11px]">HUBSPOT_ACCESS_TOKEN</strong> colando o seu token.
            </li>
          </ol>
        </div>
      </div>



      {/* Sync Console Logs */}
      {syncLogs.length > 0 && (
        <div className="bg-slate-900 text-slate-300 rounded-xl border border-slate-800 p-5 shadow-inner">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 font-sans">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>
            Terminal de Sincronização
          </h4>
          <div className="bg-slate-950 p-4 rounded-lg font-mono text-[11px] leading-relaxed max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
            {syncLogs.map((log, idx) => (
              <div 
                key={idx} 
                className={`${
                  log.includes('ERRO') ? 'text-rose-400' : 
                  log.includes('concluída') || log.includes('Importados') ? 'text-emerald-400' : 
                  'text-slate-400'
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
