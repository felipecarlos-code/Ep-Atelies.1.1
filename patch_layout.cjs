const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

const tabsBlock = `      {/* Top connected bar & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 relative z-10">
          <div className="bg-[#1a162b] p-1.5 rounded-lg border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode('search')}
              className={\`flex items-center gap-2 px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer \${
                viewMode === 'search' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }\`}
            >
              <Search size={13} />
              Busca e Análise (IA)
            </button>
            <button
              onClick={() => setViewMode('report')}
              className={\`flex items-center gap-2 px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer \${
                viewMode === 'report' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }\`}
            >
              <Table size={13} />
              Relatório Incremental
            </button>
          </div>
        </div>
      </div>`;

// 1. We remove this block from its original position.
code = code.replace(tabsBlock, "");

// 2. We capture the unauthenticated return block.
const authReturnBlock = `  if (!user || !token) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-200">
            <img src="/google-drive-logo.svg" alt="Google Drive" className="w-8 h-8 opacity-50" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <HardDrive size={24} className="text-slate-400 absolute" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Análise de Documentos (IA)</h2>
          <p className="text-sm text-slate-500 mt-2">
            Conecte sua conta do Google Drive para buscar e analisar Termos de Parceria e TAPIs utilizando a Inteligência Artificial Gemini.
          </p>
        </div>

        <div className="space-y-4">
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
  }`;

const replacementAuthBlock = `  const renderTabs = () => (
${tabsBlock}
  );

  if (viewMode === 'report') {
    return (
      <div id="drive-integration-dashboard" className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {renderTabs()}
        <DocumentReport turmas={turmas} partners={partners} />
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div id="drive-integration-dashboard" className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {renderTabs()}
        <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-200">
              <img src="/google-drive-logo.svg" alt="Google Drive" className="w-8 h-8 opacity-50" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <HardDrive size={24} className="text-slate-400 absolute" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Análise de Documentos (IA)</h2>
            <p className="text-sm text-slate-500 mt-2">
              Conecte sua conta do Google Drive para buscar e analisar Termos de Parceria e TAPIs utilizando a Inteligência Artificial Gemini.
            </p>
          </div>

          <div className="space-y-4">
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
  }`;

code = code.replace(authReturnBlock, replacementAuthBlock);

const endReturnOld = `  return (
    <div id="drive-integration-dashboard" className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      

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

      {viewMode === 'report' ? (
        <DocumentReport turmas={turmas} partners={partners} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">`;

const endReturnNew = `  return (
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">`;

code = code.replace(endReturnOld, endReturnNew);

// Since we removed the viewMode ternary logic entirely, we must make sure there's no trailing `)}` from the old condition.
const endTernaryOld = `        </div>
      )}
    </div>`;
const endTernaryNew = `        </div>
    </div>`;
code = code.replace(endTernaryOld, endTernaryNew);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
