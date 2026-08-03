const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

// 1. Add import
if (!code.includes('FolderBrowserModal')) {
  code = code.replace(
    `import { DocumentReport } from './DocumentReport';`,
    `import { DocumentReport } from './DocumentReport';\nimport { FolderBrowserModal } from './FolderBrowserModal';`
  );
}

// 2. Add state
if (!code.includes('isFolderBrowserOpen')) {
  code = code.replace(
    `const [viewMode, setViewMode] = useState<'search' | 'report'>('search');`,
    `const [viewMode, setViewMode] = useState<'search' | 'report'>('search');\n  const [isFolderBrowserOpen, setIsFolderBrowserOpen] = useState(false);\n  const [folderName, setFolderName] = useState('');`
  );
}

// 3. Update the folder input
const folderInputHtml = `            {/* Folder ID / Shared Drive ID */}
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
            </div>`;

const newFolderInputHtml = `            {/* Folder Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Pasta do Drive <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
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
                    onClick={() => { setFolderId(''); setFolderName(''); }}
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
            </div>`;

if (code.includes(folderInputHtml)) {
  code = code.replace(folderInputHtml, newFolderInputHtml);
} else {
    console.log("Could not find folder input html");
}

// 4. Inject Modal before closing main div
// Look for closing tags of DocumentSearch.
//  )}
//     </div>
//   );
// }

const closingHtml = `      )}
    </div>
  );
}`;
const newClosingHtml = `      )}
      
      {isFolderBrowserOpen && token && (
        <FolderBrowserModal 
          token={token} 
          onClose={() => setIsFolderBrowserOpen(false)}
          onSelect={(id, name) => {
            setFolderId(id);
            setFolderName(name);
            setIsFolderBrowserOpen(false);
          }}
        />
      )}
    </div>
  );
}`;

if (code.includes(closingHtml)) {
  code = code.replace(closingHtml, newClosingHtml);
} else {
    console.log("Could not find closing html");
}

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
console.log('Patched DocumentSearch to include Folder Browser UI');
