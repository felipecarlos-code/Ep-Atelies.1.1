const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

const uiButton = `            {/* Folder Selection */}
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
              <div className="flex items-center gap-2">`;
code = code.replace(/            \{\/\* Folder Selection \*\/\}[\s\S]*?<div className="flex items-center gap-2">/, uiButton);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
