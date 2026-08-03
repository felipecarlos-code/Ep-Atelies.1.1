import React, { useState, useEffect } from 'react';
import { X, Folder, ChevronRight, HardDrive, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface Folder {
  id: string;
  name: string;
  isDrive?: boolean;
  driveId?: string;
}

interface FolderBrowserModalProps {
  token: string;
  onClose: () => void;
  onSelect: (folderId: string, folderName: string, isDrive?: boolean) => void;
}

export function FolderBrowserModal({ token, onClose, onSelect }: FolderBrowserModalProps) {
  const [history, setHistory] = useState<Folder[]>([{ id: 'root_drives', name: 'Meu Google Drive & Compartilhados' }]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentFolder = history[history.length - 1];

  useEffect(() => {
    fetchFolders(currentFolder.id, currentFolder.isDrive);
  }, [currentFolder.id]);

  const fetchFolders = async (parentId: string, isDrive?: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token, parentId, isDrive })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      
      // Sort alphabetically
      const sorted = (data.folders || []).sort((a: Folder, b: Folder) => a.name.localeCompare(b.name));
      setFolders(sorted);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar pastas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    if (history.length > 1) {
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const handleOpenFolder = (folder: Folder) => {
    setHistory(prev => [...prev, folder]);
  };

  const handleSelectCurrent = () => {
    if (currentFolder.id !== 'root_drives') {
      onSelect(currentFolder.id, currentFolder.name, currentFolder.isDrive, currentFolder.driveId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800 text-sm">Selecione uma Pasta do Drive</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-md text-slate-500">
            <X size={18} />
          </button>
        </div>

        {/* Breadcrumbs */}
        <div className="p-3 border-b border-slate-100 bg-white flex items-center gap-2 overflow-x-auto text-xs whitespace-nowrap">
          {history.length > 1 && (
            <button 
              onClick={handleGoBack}
              className="mr-2 p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors"
            >
              <ArrowLeft size={14} />
            </button>
          )}
          {history.map((step, idx) => (
            <div key={step.id + idx} className="flex items-center gap-1.5 text-slate-600">
              {idx > 0 && <ChevronRight size={12} className="text-slate-400" />}
              <span className={`\${idx === history.length - 1 ? 'font-bold text-indigo-700' : 'cursor-pointer hover:underline'}`}
                onClick={() => {
                  if (idx < history.length - 1) {
                    setHistory(prev => prev.slice(0, idx + 1));
                  }
                }}
              >
                {step.name}
              </span>
            </div>
          ))}
        </div>

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50 min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-xs">Carregando pastas...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-rose-500 text-xs">
              <p>Erro: {error}</p>
              <button onClick={() => fetchFolders(currentFolder.id)} className="mt-2 text-indigo-600 underline">Tentar novamente</button>
            </div>
          ) : folders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Esta pasta está vazia.
            </div>
          ) : (
            <div className="space-y-1">
              {folders.map(folder => (
                <div 
                  key={folder.id}
                  className="flex items-center justify-between p-2.5 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg cursor-pointer group transition-all"
                  onClick={() => handleOpenFolder(folder)}
                >
                  <div className="flex items-center gap-3">
                    {folder.isDrive || folder.name.includes('(Drive Compartilhado)') ? (
                      <HardDrive size={18} className="text-indigo-500" />
                    ) : (
                      <Folder size={18} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                    )}
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{folder.name}</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="text-[10px] text-slate-500">
            {currentFolder.id !== 'root_drives' && (
              <span>Pasta selecionada: <strong>{currentFolder.name}</strong></span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 transition-colors">
              Cancelar
            </button>
            <button 
              onClick={handleSelectCurrent}
              disabled={currentFolder.id === 'root_drives'}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              <CheckCircle2 size={14} />
              Selecionar esta pasta
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
