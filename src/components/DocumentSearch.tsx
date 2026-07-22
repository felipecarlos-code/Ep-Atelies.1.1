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
  ShieldAlert, 
  Info, 
  RotateCw, 
  FileCode, 
  Link2, 
  FileCheck, 
  HelpCircle,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { Turma, Partner } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// In-memory module-level cache for Google OAuth token
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;

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
  const [searchQuery, setSearchQuery] = useState('');
  const [folderId, setFolderId] = useState('');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // AI Analysis states
  const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Link / Association states
  const [associationType, setAssociationType] = useState<'turma' | 'partner' | null>(null);
  const [associationId, setAssociationId] = useState<string>('');
  const [isLinkedSuccess, setIsLinkedSuccess] = useState(false);

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
      setAuthError(err.message || 'Erro ao fazer login com o Google.');
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
      setFiles([]);
      setSelectedFile(null);
      setAnalysisResult(null);
    } catch (err: any) {
      console.error('Sign-out Error:', err);
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
          folderId: folderId.trim()
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
      setAssociationType('turma');
      setAssociationId(suggestedTurma.id);
    } else if (suggestedPartner) {
      setAssociationType('partner');
      setAssociationId(suggestedPartner.id);
    } else {
      setAssociationType('turma');
      setAssociationId('');
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

    if (associationType === 'turma') {
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
    } else if (associationType === 'partner') {
      const targetPartner = partners.find(p => p.id === associationId);
      if (!targetPartner) return;

      const updatedPartner: Partner = {
        ...targetPartner,
        partnershipTermLink: selectedFile.webViewLink,
        partnershipTermValidity: analysisResult.dataValidade || undefined,
        partnershipTermStatus: analysisResult.statusDoc,
        partnershipTermSummary: analysisResult.resumoCritico
      };

      onUpdatePartner(updatedPartner);
      setIsLinkedSuccess(true);
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

  // Render Login page if not authenticated
  if (!token) {
    return (
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
    );
  }

  return (
    <div id="drive-integration-dashboard" className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top connected bar */}
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

            {/* Folder ID / Shared Drive ID */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                ID da Pasta ou Drive Compartilhado <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input 
                type="text"
                placeholder="Ex: 1A2b3C4d5E6f7G..."
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
              />
              <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                Recomendado para restringir a busca às pastas de projetos do <strong>Drive Compartilhado</strong> da coordenação.
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
                            setAssociationType(e.target.value as 'turma' | 'partner');
                            setAssociationId('');
                          }}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                        >
                          <option value="turma">Negócio / Turma (TAPI)</option>
                          <option value="partner">Empresa Parceira (Termo Parceria)</option>
                        </select>
                      </div>

                      {/* Select Association item ID */}
                      <div className="w-full md:w-2/3">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                          Selecione o {associationType === 'turma' ? 'Negócio/Turma' : 'Parceiro'} correspondente
                        </label>
                        <select 
                          value={associationId}
                          onChange={(e) => setAssociationId(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white font-medium text-slate-700"
                        >
                          <option value="">-- Selecione para vincular --</option>
                          {associationType === 'turma' ? (
                            turmas.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} {t.projectTitle ? ` - ${t.projectTitle}` : ''}
                              </option>
                            ))
                          ) : (
                            partners.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))
                          )}
                        </select>
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
    </div>
  );
}
