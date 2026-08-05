import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { 
  Search, 
  FolderOpen, 
  FileText, 
  ExternalLink, 
  Sparkles, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileCheck,
  Building2,
  MoreVertical,
  Layers,
  ArrowRight,
  LogOut,
  X,
  Info,
  RotateCw,
  FileCode
} from 'lucide-react';
import { Table } from 'lucide-react';
import { DocumentReport } from './DocumentReport';
import { FolderBrowserModal } from './FolderBrowserModal';
import { Turma, Partner } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// In-memory module-level cache for Google OAuth token
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;

let searchStateCache: any = null;


interface DocumentSearchProps {
  turmas: Turma[];
  partners: Partner[];
  onUpdateTurma: (turma: Turma) => void;
  onUpdatePartner: (partner: Partner) => void;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
}

interface AnalysisResult {
  tituloProjeto: string | null;
  empresaParceira: string | null;
  dataAssinatura: string | null;
  dataValidade: string | null;
  resumoCritico: string;
  statusDoc: 'Ativo' | 'Expirado' | 'Revisão Necessária';
}

export default function DocumentSearch({
  turmas,
  partners,
  onUpdateTurma,
  onUpdatePartner
}: DocumentSearchProps) {
  // Auth states
  const [user, setUser] = useState<User | null>(cachedGoogleUser);
  const [token, setToken] = useState<string | null>(cachedAccessToken);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Scan & Search states
  const [searchQuery, setSearchQuery] = useState(searchStateCache?.searchQuery || '');
  const [folderId, setFolderId] = useState(searchStateCache?.folderId || '');
  const [files, setFiles] = useState<DriveFile[]>(searchStateCache?.files || []);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // AI Analysis states
  const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(searchStateCache?.selectedFile || null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(searchStateCache?.analysisResult || null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Link / Association states
  const [associationType, setAssociationType] = useState<'tapi' | 'termo' | 'partner' | null>(searchStateCache?.associationType || null);
  const [associationId, setAssociationId] = useState<string>(searchStateCache?.associationId || '');
  const [isLinkedSuccess, setIsLinkedSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'search' | 'report'>(searchStateCache?.viewMode || 'search');
  const [isFolderBrowserOpen, setIsFolderBrowserOpen] = useState(false);
  const [folderName, setFolderName] = useState(searchStateCache?.folderName || '');
  const [isDriveSelected, setIsDriveSelected] = useState(searchStateCache?.isDriveSelected || false);
  const [driveIdSelected, setDriveIdSelected] = useState<string | null>(searchStateCache?.driveIdSelected || null);

  useEffect(() => {
    searchStateCache = {
      searchQuery,
      folderId,
      files,
      selectedFile,
      analysisResult,
      associationType,
      associationId,
      viewMode,
      folderName,
      isDriveSelected,
      driveIdSelected
    };
  }, [searchQuery, folderId, files, selectedFile, analysisResult, associationType, associationId, viewMode, folderName, isDriveSelected, driveIdSelected]);

  const [turmaSearchTerm, setTurmaSearchTerm] = useState('');
  const [isTurmaDropdownOpen, setIsTurmaDropdownOpen] = useState(false);

  const validStagesCleanSearch = [
    'concluido',
    'concluidos', 
    'pendencia de projeto', 
    'patente', 
    'envio de prototipos', 
    'pre projeto',
    'pre-projeto',
    'pre projetos'
  ];

  const filteredTurmas = turmas.filter(t => {
    const ds = (t.dealstage || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    return validStagesCleanSearch.includes(ds);
  });

  const searchFilteredTurmas = filteredTurmas.filter(t => {
    const searchStr = `${t.name} ${t.projectTitle || ''}`.toLowerCase();
    return searchStr.includes(turmaSearchTerm.toLowerCase());
  });

  // Sync auth state listener on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (cachedAccessToken) {
          setToken(cachedAccessToken);
        }
      } else {
        setUser(null);
        setToken(null);
        cachedAccessToken = null;
        cachedGoogleUser = null;
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.readonly');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Falha ao obter token de acesso do Google.');
      }
      
      cachedAccessToken = credential.accessToken;
      cachedGoogleUser = result.user;
      
      setToken(credential.accessToken);
      setUser(result.user);
      setIsLoggingIn(false);
    } catch (err: any) {
      console.error('Google Sign-in Error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setAuthError('Domínio não autorizado. Por favor, adicione o link do site ao Firebase Console (Authentication > Settings > Authorized domains).');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('O login foi cancelado.');
      } else {
        setAuthError(err.message || 'Erro ao fazer login com o Google.');
      }
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setToken(null);
      setUser(null);
      cachedAccessToken = null;
      cachedGoogleUser = null;
      searchStateCache = null;
      setFiles([]);
      setSelectedFile(null);
      setAnalysisResult(null);
    } catch (err: any) {
      console.error('Sign-out Error:', err);
    }
  };

  // Batch Sync States
  const [isBatchSyncModalOpen, setIsBatchSyncModalOpen] = useState(false);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [batchSyncProgress, setBatchSyncProgress] = useState({ current: 0, total: 0 });
  const [batchSyncLogs, setBatchSyncLogs] = useState<{message: string, type: 'info'|'success'|'error'}[]>([]);

  const handleStartBatchSync = async () => {
    if (!token || !folderId) {
      setBatchSyncLogs([{ message: 'Por favor, selecione uma pasta raiz primeiro.', type: 'error' }]);
      return;
    }
    
    setIsBatchSyncing(true);
    setBatchSyncLogs([{ message: `Iniciando sincronização na pasta: ${folderName}...`, type: 'info' }]);
    setBatchSyncProgress({ current: 0, total: 0 });

    try {
      setBatchSyncLogs(prev => [...prev, { message: 'Buscando subpastas...', type: 'info' }]);
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,modifiedTime,webViewLink)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Erro ao listar subpastas.');
      const data = await response.json();
      
      const subfolders = data.files?.filter((f: any) => f.mimeType === 'application/vnd.google-apps.folder') || [];
      
      if (subfolders.length === 0) {
        setBatchSyncLogs(prev => [...prev, { message: 'Nenhuma subpasta encontrada.', type: 'error' }]);
        setIsBatchSyncing(false);
        return;
      }
      
      setBatchSyncProgress({ current: 0, total: subfolders.length });
      setBatchSyncLogs(prev => [...prev, { message: `Encontradas ${subfolders.length} subpastas. Iniciando análise...`, type: 'success' }]);

      let currentProgress = 0;
      for (const subfolder of subfolders) {
        currentProgress++;
        setBatchSyncProgress(prev => ({ ...prev, current: currentProgress }));
        setBatchSyncLogs(prev => [...prev, { message: `Analisando pasta [${currentProgress}/${subfolders.length}]: ${subfolder.name}`, type: 'info' }]);
        
        try {
          const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files?q='${subfolder.id}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,modifiedTime,webViewLink)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives`, { headers: { Authorization: `Bearer ${token}` } });
          const folderData = await folderRes.json();
          let items = folderData.files || [];
          
          const subSubFolders = items.filter((f: any) => f.mimeType === 'application/vnd.google-apps.folder');
          let directFiles = items.filter((f: any) => f.mimeType !== 'application/vnd.google-apps.folder');
          
          for (const ssf of subSubFolders) {
            const ssfRes = await fetch(`https://www.googleapis.com/drive/v3/files?q='${ssf.id}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,modifiedTime,webViewLink)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives`, { headers: { Authorization: `Bearer ${token}` } });
            const ssfData = await ssfRes.json();
            directFiles = [...directFiles, ...(ssfData.files?.filter((f:any) => f.mimeType !== 'application/vnd.google-apps.folder') || [])];
          }

          const supportedMimes = ['application/pdf', 'application/vnd.google-apps.document', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
          const processableFiles = directFiles.filter((f: any) => supportedMimes.includes(f.mimeType));
          
          const tapiFiles = processableFiles.filter((f: any) => f.name.toLowerCase().includes('tapi'));
          const termoFiles = processableFiles.filter((f: any) => f.name.toLowerCase().includes('termo') || f.name.toLowerCase().includes('contrato'));
          
          tapiFiles.sort((a: any, b: any) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
          termoFiles.sort((a: any, b: any) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
          
          const latestTapi = tapiFiles[0];
          const latestTermo = termoFiles[0];
          
          if (!latestTapi && !latestTermo) {
            setBatchSyncLogs(prev => [...prev, { message: `Nenhum TAPI ou Termo encontrado na pasta.`, type: 'error' }]);
            continue;
          }

          if (latestTapi) {
            setBatchSyncLogs(prev => [...prev, { message: `Analisando TAPI: ${latestTapi.name}...`, type: 'info' }]);
            const analyzeRes = await fetch('/api/drive/analyze-document', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken: token, fileId: latestTapi.id, mimeType: latestTapi.mimeType, fileName: latestTapi.name })
            });
            const analyzeData = await analyzeRes.json();
            if (analyzeRes.status === 429 || analyzeRes.status === 503 || (!analyzeData.success && (analyzeData.error?.includes('cota') || analyzeData.error?.includes('quota') || analyzeData.error?.includes('indisponível') || analyzeData.error?.includes('alta demanda')))) {
              setBatchSyncLogs(prev => [...prev, { message: `Cota de IA atingida. Interrompendo sincronização.`, type: 'error' }]);
              setIsBatchSyncing(false);
              return;
            }
            if (analyzeData.success && analyzeData.analysis) {
              const analysis = analyzeData.analysis;
              const partnerName = analysis.empresaParceira || '';
              const matchTurma = turmas.find(t => {
                const sName = (subfolder.name || '').toLowerCase();
                const pName = partnerName.toLowerCase();
                return (partnerName && t.name.toLowerCase().includes(pName)) || 
                       (t.projectTitle && sName.includes(t.projectTitle.toLowerCase())) ||
                       sName.includes(t.name.toLowerCase());
              });
              
              if (matchTurma) {
                const updatedTurma = {
                  ...matchTurma,
                  tapiLink: latestTapi.webViewLink,
                  tapiValidity: analysis.dataValidade || undefined,
                  tapiStatus: analysis.statusDoc,
                  tapiSummary: analysis.resumoCritico
                };
                onUpdateTurma(updatedTurma);
                setBatchSyncLogs(prev => [...prev, { message: `TAPI vinculado à turma: ${matchTurma.name}`, type: 'success' }]);
              } else {
                setBatchSyncLogs(prev => [...prev, { message: `Turma não encontrada para TAPI de ${partnerName}`, type: 'error' }]);
              }
            }
          }

          if (latestTermo) {
            setBatchSyncLogs(prev => [...prev, { message: `Analisando Termo: ${latestTermo.name}...`, type: 'info' }]);
            const analyzeRes = await fetch('/api/drive/analyze-document', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken: token, fileId: latestTermo.id, mimeType: latestTermo.mimeType, fileName: latestTermo.name })
            });
            const analyzeData = await analyzeRes.json();
            if (analyzeRes.status === 429 || analyzeRes.status === 503 || (!analyzeData.success && (analyzeData.error?.includes('cota') || analyzeData.error?.includes('quota') || analyzeData.error?.includes('indisponível') || analyzeData.error?.includes('alta demanda')))) {
              setBatchSyncLogs(prev => [...prev, { message: `Cota de IA atingida. Interrompendo sincronização.`, type: 'error' }]);
              setIsBatchSyncing(false);
              return;
            }
            if (analyzeData.success && analyzeData.analysis) {
              const analysis = analyzeData.analysis;
              const partnerName = analysis.empresaParceira || '';
              const matchPartner = partners.find(p => partnerName && (p.name.toLowerCase().includes(partnerName.toLowerCase()) || partnerName.toLowerCase().includes(p.name.toLowerCase())));
              
              if (matchPartner) {
                const updatedPartner = {
                  ...matchPartner,
                  partnershipTermLink: latestTermo.webViewLink,
                  partnershipTermValidity: analysis.dataValidade || undefined,
                  partnershipTermStatus: analysis.statusDoc,
                  partnershipTermSummary: analysis.resumoCritico
                };
                onUpdatePartner(updatedPartner);
                setBatchSyncLogs(prev => [...prev, { message: `Termo vinculado ao parceiro: ${matchPartner.name}`, type: 'success' }]);
              } else {
                setBatchSyncLogs(prev => [...prev, { message: `Parceiro não encontrado para Termo de ${partnerName}`, type: 'error' }]);
              }
            }
          }

        } catch (err: any) {
          setBatchSyncLogs(prev => [...prev, { message: `Erro na pasta ${subfolder.name}: ${err.message}`, type: 'error' }]);
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between folders to avoid rate limit
      }
      
      setBatchSyncLogs(prev => [...prev, { message: 'Sincronização em lote concluída!', type: 'success' }]);
      setTimeout(() => {
        setIsBatchSyncModalOpen(false);
        setViewMode('report');
      }, 2000);

    } catch (err: any) {
      setBatchSyncLogs(prev => [...prev, { message: `Erro na sincronização em lote: ${err.message}`, type: 'error' }]);
    } finally {
      setIsBatchSyncing(false);
    }
  };

  const handleSearchFiles = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) return;

    setIsSearching(true);
    setSearchError(null);
    setSelectedFile(null);
    setAnalysisResult(null);
    setIsLinkedSuccess(false);

    try {
      const response = await fetch('/api/drive/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: token,
          searchQuery: searchQuery.trim(),
          folderId: folderId.trim(),
          isDrive: isDriveSelected,
          driveId: driveIdSelected
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido ao listar arquivos.');
      }

      setFiles(data.files || []);
      if ((data.files || []).length === 0) {
        setSearchError('Nenhum documento de parceria ou TAPI foi encontrado com os parâmetros informados.');
      }
    } catch (err: any) {
      console.error('Search files error:', err);
      setSearchError(err.message || 'Erro ao conectar com a API do Google Drive.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAnalyzeDocument = async (file: DriveFile) => {
    if (!token) return;

    setSelectedFile(file);
    setAnalyzingFileId(file.id);
    setAnalysisError(null);
    setAnalysisResult(null);
    setIsLinkedSuccess(false);

    // Smart Suggestion for linking based on filename
    const suggestedTurma = turmas.find(t => 
      file.name.toLowerCase().includes(t.name.toLowerCase()) || 
      (t.projectTitle && file.name.toLowerCase().includes(t.projectTitle.toLowerCase()))
    );

    const suggestedPartner = partners.find(p => 
      file.name.toLowerCase().includes(p.name.toLowerCase())
    );

    if (suggestedTurma) {
      setAssociationType('tapi');
      setAssociationId(suggestedTurma.id);
    } else if (suggestedPartner) {
      setAssociationType('partner');
      setAssociationId(suggestedPartner.id);
    } else {
      setAssociationType('tapi');
      setAssociationId(''); setTurmaSearchTerm('');
    }

    try {
      const response = await fetch('/api/drive/analyze-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: token,
          fileId: file.id,
          mimeType: file.mimeType,
          fileName: file.name
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Erro ao analisar o documento.');
      }

      setAnalysisResult(data.analysis);
    } catch (err: any) {
      console.error('Document analysis error:', err);
      setAnalysisError(err.message || 'Erro na comunicação ou no processamento de IA do documento.');
    } finally {
      setAnalyzingFileId(null);
    }
  };

  const handleSaveAssociation = () => {
    if (!selectedFile || !analysisResult) return;

    if (associationType === 'tapi') {
      const targetTurma = turmas.find(t => t.id === associationId);
      if (!targetTurma) return;

      const updatedTurma: Turma = {
        ...targetTurma,
        tapiLink: selectedFile.webViewLink,
        tapiValidity: analysisResult.dataValidade || undefined,
        tapiStatus: analysisResult.statusDoc,
        tapiSummary: analysisResult.resumoCritico
      };

      onUpdateTurma(updatedTurma);
      setIsLinkedSuccess(true);
      setTimeout(() => {
        setIsLinkedSuccess(false);
        setViewMode('report');
      }, 1500);
    } else if (associationType === 'termo') {
      const targetTurma = turmas.find(t => t.id === associationId);
      if (!targetTurma) return;

      const updatedTurma: Turma = {
        ...targetTurma,
        partnershipTermLink: selectedFile.webViewLink,
        partnershipTermValidity: analysisResult.dataValidade || undefined,
        partnershipTermStatus: analysisResult.statusDoc,
        partnershipTermSummary: analysisResult.resumoCritico
      };

      onUpdateTurma(updatedTurma);
      setIsLinkedSuccess(true);
      setTimeout(() => {
        setIsLinkedSuccess(false);
        setViewMode('report');
      }, 1500);
    } else if (associationType === 'partner') {
      const targetPartner = partners.find(p => p.id === associationId);
      if (!targetPartner) return;

      const updatedPartner = {
        ...targetPartner,
        partnershipTermLink: selectedFile.webViewLink,
        partnershipTermValidity: analysisResult.dataValidade || undefined,
        partnershipTermStatus: analysisResult.statusDoc,
        partnershipTermSummary: analysisResult.resumoCritico
      };

      onUpdatePartner(updatedPartner);
      setIsLinkedSuccess(true);
      setTimeout(() => {
        setIsLinkedSuccess(false);
        setViewMode('report');
      }, 1500);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getMimeBadge = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.document') {
      return <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-100 flex items-center gap-1">Google Doc</span>;
    }
    if (mimeType === 'application/pdf') {
      return <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-rose-100 flex items-center gap-1">PDF</span>;
    }
    return <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-100 flex items-center gap-1">Documento</span>;
  };

  const renderTabs = () => (
    <>
      {/* Top connected bar & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 relative z-10">
          <div className="bg-[#1a162b] p-1.5 rounded-lg border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode('search')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer ${
                viewMode === 'search' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Search size={13} />
              Busca e Análise (IA)
            </button>
            <button
              onClick={() => setViewMode('report')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer ${
                viewMode === 'report' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Table size={13} />
              Relatório Incremental
            </button>
          </div>
        </div>
      </div>
    </>
  );

  if (viewMode === 'report') {
    return (
      <div id="drive-integration-dashboard" className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {renderTabs()}
        <DocumentReport turmas={turmas} partners={partners} />
      </div>
    );
  }

  // Render Login page if not authenticated
  if (!token) {
    return (
      <div id="drive-integration-dashboard" className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {renderTabs()}
        <div id="drive-auth-container" className="max-w-4xl mx-auto p-6 md:p-12 text-center">
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 shadow-xs max-w-lg mx-auto">
          <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6">
            <FolderOpen size={32} />
          </div>
          
          <h2 className="text-xl font-bold text-slate-800 mb-2">Conectar ao Google Drive</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Para realizar a busca e análise automatizada de <strong>TAPI (Termo de Abertura de Projeto Inteli)</strong> e <strong>Termos de Parceria</strong> de forma inteligente via IA, conecte o sistema ao seu Google Drive Compartilhado do Inteli.
          </p>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-8 text-left">
            <div className="flex gap-2 text-amber-800">
              <Info size={18} className="shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Como funciona?</h4>
                <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                  O sistema irá ler as pastas do Drive em busca do último documento oficial baseado em data. Com a IA do Gemini, nós extraímos automaticamente o escopo, as obrigações e as datas críticas de validade.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-slate-300 rounded-lg shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLoggingIn ? (
              <RotateCw size={18} className="animate-spin text-slate-400" />
            ) : (
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            )}
            <span className="font-bold">Conectar com Google Inteli</span>
          </button>

          {authError && (
            <div className="mt-4 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded">
              {authError}
            </div>
          )}
        </div>
      </div>
      </div>
    );
  }

  return (
    <div id="drive-integration-dashboard" className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {renderTabs()}

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || 'Google user'} className="w-9 h-9 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-9 h-9 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Google Drive Conectado</h4>
            <p className="text-[11px] text-slate-500 font-medium">{user?.email}</p>
          </div>
        </div>

        <button 
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <LogOut size={13} />
          Desconectar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Search and Scan Panel */}
        <div className="lg:col-span-4 space-y-6">
          <form onSubmit={handleSearchFiles} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Search size={16} className="text-[#0f4c5c]" />
                Buscar Documentos
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Busque TAPI, Termos de Parceria e Contratos</p>
            </div>

            {/* Folder Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-600">
                  Pasta do Drive <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                {folderId && (
                  <button 
                    type="button"
                    onClick={() => setIsBatchSyncModalOpen(true)}
                    className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded font-bold flex items-center gap-1 hover:bg-indigo-700 transition-colors"
                  >
                    <Layers size={10} />
                    Sincronização em Lote
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-600 truncate flex items-center gap-2">
                  <FolderOpen size={14} className="text-indigo-500 shrink-0" />
                  {folderId ? (
                    <span className="font-semibold text-slate-800 truncate" title={folderId}>
                      {folderName || folderId}
                    </span>
                  ) : (
                    <span className="text-slate-400">Todo o Google Drive (Não recomendado)</span>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => setIsFolderBrowserOpen(true)}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border border-indigo-200"
                >
                  Selecionar Pasta
                </button>
                {folderId && (
                  <button 
                    type="button"
                    onClick={() => { setFolderId(''); setFolderName(''); setIsDriveSelected(false); setDriveIdSelected(null); }}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                    title="Limpar seleção"
                  >
                    <XCircle size={14} />
                  </button>
                )}
              </div>
              <p className="text-[9px] text-slate-400 mt-1.5 leading-relaxed">
                Recomendado restringir a busca a uma pasta do <strong>Drive Compartilhado</strong>.
              </p>
            </div>

            {/* Search query input */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Palavra-chave do arquivo</label>
              <input 
                type="text"
                placeholder="Deixe em branco para buscar TAPI/Termo padrão"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
              />
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <RotateCw size={14} className="animate-spin" />
                  Buscando no Drive...
                </>
              ) : (
                <>
                  <Search size={14} />
                  Buscar no Google Drive
                </>
              )}
            </button>
          </form>

          {/* Quick instructions panel */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Info size={14} className="text-[#0f4c5c]" />
              Como obter o ID da Pasta?
            </h4>
            <ol className="list-decimal list-inside text-[10px] text-slate-500 space-y-1 mt-1 leading-relaxed">
              <li>Acesse o Google Drive na web</li>
              <li>Abra a pasta do projeto desejada</li>
              <li>Copie a sequência de caracteres ao final do link da barra de endereços</li>
              <li>Exemplo de URL: <code className="bg-white px-1 py-0.5 rounded border text-slate-600 border-slate-100 font-mono text-[9px] break-all">drive.google.com/drive/folders/<b>1A2b...</b></code></li>
            </ol>
          </div>
        </div>

        {/* Right Dashboard Files & Analysis Area */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Files List Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Resultados da Busca ({files.length})
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Clique em "Analisar" para ler e extrair dados críticos usando a Inteligência Artificial</p>
              </div>
              
              {files.length > 0 && (
                <button
                  onClick={() => handleSearchFiles()}
                  disabled={isSearching}
                  className="p-1.5 hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Atualizar lista"
                >
                  <RotateCw size={14} className={isSearching ? 'animate-spin' : ''} />
                </button>
              )}
            </div>

            {searchError && (
              <div className="p-8 text-center">
                <p className="text-xs text-slate-400 italic">{searchError}</p>
              </div>
            )}

            {files.length === 0 && !searchError && (
              <div className="p-12 text-center text-slate-400">
                <FileCode size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="text-xs font-medium">Insira parâmetros de busca ao lado e clique em buscar.</p>
                <p className="text-[10px] text-slate-400 mt-1">Sugerimos buscar em uma pasta de projetos para maior precisão.</p>
              </div>
            )}

            {files.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-3">Nome do Arquivo</th>
                      <th className="p-3">Mídia</th>
                      <th className="p-3">Modificação</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {files.map((file) => {
                      const isSelected = selectedFile?.id === file.id;
                      const isThisAnalyzing = analyzingFileId === file.id;

                      // Check client-side heuristics for suggested entity
                      const matchedTurma = turmas.find(t => 
                        file.name.toLowerCase().includes(t.name.toLowerCase()) || 
                        (t.projectTitle && file.name.toLowerCase().includes(t.projectTitle.toLowerCase()))
                      );

                      const matchedPartner = partners.find(p => 
                        file.name.toLowerCase().includes(p.name.toLowerCase())
                      );

                      return (
                        <tr 
                          key={file.id} 
                          className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}
                        >
                          <td className="p-3">
                            <div className="flex flex-col max-w-[280px] md:max-w-[340px]">
                              <span className="font-semibold text-slate-800 truncate" title={file.name}>
                                {file.name}
                              </span>
                              <div className="flex flex-wrap gap-1 items-center mt-1">
                                <a 
                                  href={file.webViewLink} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-[10px] text-[#0f4c5c] font-bold hover:underline inline-flex items-center gap-0.5"
                                >
                                  Abrir no Drive <ExternalLink size={10} />
                                </a>
                                {matchedTurma && (
                                  <span className="bg-indigo-50 text-indigo-700 text-[9px] font-medium px-1.5 py-0.2 rounded border border-indigo-100">
                                    Sugere: {matchedTurma.name}
                                  </span>
                                )}
                                {matchedPartner && (
                                  <span className="bg-emerald-50 text-emerald-700 text-[9px] font-medium px-1.5 py-0.2 rounded border border-emerald-100">
                                    Sugere: {matchedPartner.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            {getMimeBadge(file.mimeType)}
                          </td>
                          <td className="p-3 text-[11px] text-slate-500">
                            {formatDate(file.modifiedTime)}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleAnalyzeDocument(file)}
                              disabled={analyzingFileId !== null}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                isThisAnalyzing 
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100'
                              }`}
                            >
                              {isThisAnalyzing ? (
                                <>
                                  <RotateCw size={12} className="animate-spin" />
                                  Lendo...
                                </>
                              ) : (
                                <>
                                  <Sparkles size={12} className="text-indigo-500" />
                                  Analisar com IA
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* AI Analysis Result Board */}
          {selectedFile && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-md p-5 space-y-4 animate-fade-in">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-indigo-800 uppercase tracking-wider">
                      Painel de Extração Inteligente
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium break-all max-w-md md:max-w-xl">
                      Documento: <strong className="text-slate-700">{selectedFile.name}</strong>
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setAnalysisResult(null);
                  }}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {/* Loader */}
              {analyzingFileId === selectedFile.id && (
                <div className="py-12 text-center space-y-3">
                  <RotateCw size={36} className="mx-auto text-indigo-600 animate-spin" />
                  <div className="max-w-xs mx-auto">
                    <p className="text-xs font-bold text-slate-700">Fazendo download e analisando o termo...</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Estamos varrendo o arquivo com a IA do Gemini para localizar assinaturas, validades, escopo e status do contrato.
                      <br/><span className="text-amber-600 font-medium">Nota: Documentos longos (ex: PDFs com muitas páginas) podem levar até 60 segundos.</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {analysisError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg flex gap-3 text-rose-800">
                  <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Erro na análise do arquivo</h4>
                    <p className="text-[11px] text-rose-700 mt-1">{analysisError}</p>
                  </div>
                </div>
              )}

              {/* Analysis output UI */}
              {analysisResult && (
                <div className="space-y-4">
                  
                  {/* Cards Row: Status & Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    {/* Status Card */}
                    <div className="border border-slate-100 rounded-xl p-3.5 flex items-center justify-between bg-slate-50/50">
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Status do Termo</span>
                        <span className="text-sm font-bold text-slate-800 mt-1 block">
                          {analysisResult.statusDoc || 'Análise Pendente'}
                        </span>
                      </div>
                      <div>
                        {analysisResult.statusDoc === 'Ativo' && <CheckCircle2 size={24} className="text-emerald-500" />}
                        {analysisResult.statusDoc === 'Expirado' && <XCircle size={24} className="text-rose-500" />}
                        {analysisResult.statusDoc === 'Revisão Necessária' && <AlertTriangle size={24} className="text-amber-500" />}
                      </div>
                    </div>

                    {/* Signature Date Card */}
                    <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        Data de Assinatura
                      </span>
                      <span className="text-sm font-bold text-slate-800 mt-1 block">
                        {analysisResult.dataAssinatura || <span className="text-slate-400 font-normal">Não encontrada</span>}
                      </span>
                    </div>

                    {/* Expiration Date Card */}
                    <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        Data de Validade
                      </span>
                      <span className={`text-sm font-bold mt-1 block ${analysisResult.statusDoc === 'Expirado' ? 'text-rose-600' : 'text-slate-800'}`}>
                        {analysisResult.dataValidade || <span className="text-slate-400 font-normal">Sem data explícita</span>}
                      </span>
                    </div>

                  </div>

                  {/* Identified details section */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/30 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Projeto / Título do Projeto</h4>
                        <p className="text-xs font-semibold text-slate-700 mt-1">{analysisResult.tituloProjeto || 'Não especificado explicitamente'}</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Empresa Parceira</h4>
                        <p className="text-xs font-semibold text-slate-700 mt-1">{analysisResult.empresaParceira || 'Não especificado explicitamente'}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100/80 pt-3">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Resumo Crítico da Parceria (IA)</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                        {analysisResult.resumoCritico}
                      </p>
                    </div>
                  </div>

                  {/* Linking / Action Section */}
                  <div className="bg-indigo-50/40 border border-indigo-100/75 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-800">
                      <Link2 size={16} className="shrink-0" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider">Sincronizar dados com o Sistema</h4>
                    </div>

                    <p className="text-[11px] text-slate-600">
                      Você pode salvar automaticamente o link deste documento de parceria e a sua data de validade diretamente nas tabelas de <strong>Parceiros</strong> ou de <strong>Negócios (Turmas)</strong> do sistema.
                    </p>

                    <div className="flex flex-col md:flex-row gap-3 items-end">
                      {/* Select Association type */}
                      <div className="w-full md:w-1/3">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Onde salvar?</label>
                        <select 
                          value={associationType || ''}
                          onChange={(e) => {
                            setAssociationType(e.target.value as 'tapi' | 'termo' | 'partner');
                            setAssociationId(''); setTurmaSearchTerm('');
                          }}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                        >
                          <option value="tapi">Negócio / Turma (TAPI)</option>
                          <option value="termo">Negócio / Turma (Termo Parceria)</option>
                          <option value="partner">Empresa / Parceiro (Termo Parceria)</option>
                        </select>
                      </div>

                      {/* Select Association item ID */}
                      <div className="w-full md:w-2/3">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                          Selecione o correspondente
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder={associationType === 'partner' ? "Buscar Empresa..." : "Buscar Negócio/Turma..."}
                            value={associationId && !isTurmaDropdownOpen ? 
                              (associationType === 'partner' 
                                ? (partners.find(p => p.id === associationId)?.name || turmaSearchTerm)
                                : (filteredTurmas.find(t => t.id === associationId) ? `${filteredTurmas.find(t => t.id === associationId)?.name} ${filteredTurmas.find(t => t.id === associationId)?.projectTitle ? `- ${filteredTurmas.find(t => t.id === associationId)?.projectTitle}` : ''}` : turmaSearchTerm)
                              ) : turmaSearchTerm}
                            onChange={(e) => {
                              setTurmaSearchTerm(e.target.value);
                              setAssociationId('');
                              setIsTurmaDropdownOpen(true);
                            }}
                            onFocus={() => setIsTurmaDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setIsTurmaDropdownOpen(false), 200)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white font-medium text-slate-700"
                          />
                          {isTurmaDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {associationType === 'partner' ? (
                                <>
                                  {searchFilteredPartners.map(p => (
                                    <div
                                      key={p.id}
                                      className="px-3 py-2 text-xs hover:bg-indigo-50 cursor-pointer text-slate-700"
                                      onMouseDown={(e) => { e.preventDefault(); }}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setAssociationId(p.id);
                                        setTurmaSearchTerm(p.name);
                                        setIsTurmaDropdownOpen(false);
                                      }}
                                    >
                                      <div className="font-semibold">{p.name}</div>
                                    </div>
                                  ))}
                                  {searchFilteredPartners.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-slate-500">Nenhum parceiro encontrado.</div>
                                  )}
                                </>
                              ) : (
                                <>
                                  {searchFilteredTurmas.map(t => (
                                    <div
                                      key={t.id}
                                      className="px-3 py-2 text-xs hover:bg-indigo-50 cursor-pointer text-slate-700"
                                      onMouseDown={(e) => { e.preventDefault(); }}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setAssociationId(t.id);
                                        setTurmaSearchTerm(`${t.name} ${t.projectTitle ? `- ${t.projectTitle}` : ''}`);
                                        setIsTurmaDropdownOpen(false);
                                      }}
                                    >
                                      <div className="font-semibold">{t.name}</div>
                                      {t.projectTitle && <div className="text-[10px] text-slate-500 truncate">{t.projectTitle}</div>}
                                    </div>
                                  ))}
                                  {searchFilteredTurmas.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-slate-500">Nenhum resultado encontrado.</div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={handleSaveAssociation}
                        disabled={!associationId}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <FileCheck size={14} />
                        Sincronizar e Salvar Dados
                      </button>

                      {isLinkedSuccess && (
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-lg flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          Dados vinculados com sucesso!
                        </span>
                      )}
                    </div>

                  </div>

                </div>
              )}

            </div>
          )}

        </div>
      </div>
      
      {/* Batch Sync Modal */}
      {isBatchSyncModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Layers className="text-indigo-600" size={16} />
                Sincronização Automática em Lote
              </h3>
              <button 
                onClick={() => !isBatchSyncing && setIsBatchSyncModalOpen(false)}
                disabled={isBatchSyncing}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              {!isBatchSyncing && batchSyncProgress.total === 0 ? (
                <div className="text-center py-6">
                  <FolderOpen size={48} className="mx-auto text-indigo-200 mb-3" />
                  <p className="text-sm text-slate-600 font-medium mb-4">
                    Este processo irá analisar todas as subpastas dentro de <strong>{folderName}</strong>, extrair informações de TAPIs e Termos de Parceria usando IA, e associá-los automaticamente às Turmas e Parceiros.
                  </p>
                  <button
                    onClick={handleStartBatchSync}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Sparkles size={16} />
                    Iniciar Análise Automática
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                    <span>Progresso ({batchSyncProgress.current} de {batchSyncProgress.total})</span>
                    <span>{batchSyncProgress.total > 0 ? Math.round((batchSyncProgress.current / batchSyncProgress.total) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-6 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${batchSyncProgress.total > 0 ? (batchSyncProgress.current / batchSyncProgress.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                  
                  <div className="bg-slate-900 rounded-lg p-4 font-mono text-[10px] text-slate-300 h-64 overflow-y-auto flex flex-col gap-1.5 scroll-smooth" id="batch-logs-container">
                    {batchSyncLogs.map((log, i) => (
                      <div key={i} className={`flex items-start gap-2 ${log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'}`}>
                        <span className="opacity-50 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                        <span>{log.message}</span>
                      </div>
                    ))}
                    {isBatchSyncing && (
                      <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
                        <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                        <span>Processando...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isFolderBrowserOpen && token && (
        <FolderBrowserModal 
          token={token} 
          onClose={() => setIsFolderBrowserOpen(false)}
          onSelect={(id, name, isDrive, driveId) => {
            setFolderId(id);
            setFolderName(name);
            setIsDriveSelected(isDrive || false);
            setDriveIdSelected(driveId || null);
            setIsFolderBrowserOpen(false);
          }}
        />
      )}
    </div>
  );
}
