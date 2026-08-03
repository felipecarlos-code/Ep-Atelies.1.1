const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

// 1. Insert renderTabs before `if (!user || !token)`
if (!code.includes('const renderTabs = () =>')) {
  code = code.replace(
    '  if (!user || !token) {',
    `  const renderTabs = () => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-2 mb-6">
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
    </div>
  );

  if (viewMode === 'report') {
    return (
      <div id="drive-integration-dashboard" className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {renderTabs()}
        <DocumentReport turmas={turmas} partners={partners} />
      </div>
    );
  }

  if (!user || !token) {`
  );
}

// 2. Wrap the not-authenticated return in the container and add {renderTabs()}
code = code.replace(
  '<div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">',
  '<div id="drive-integration-dashboard" className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">\n        {renderTabs()}\n        <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">'
);
code = code.replace(
  /        <\/div>\n      <\/div>\n    \);\n  }\n\n  return \(\n    <div id="drive-integration-dashboard"/,
  '        </div>\n      </div>\n      </div>\n    );\n  }\n\n  return (\n    <div id="drive-integration-dashboard"'
);

// 3. Add {renderTabs()} in the authenticated return
code = code.replace(
  '  return (\n    <div id="drive-integration-dashboard" className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">\n      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">',
  '  return (\n    <div id="drive-integration-dashboard" className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">\n      {renderTabs()}\n      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">'
);

// 4. Remove the `{viewMode === 'report' ? (...) : (` logic
code = code.replace(
  /      \{viewMode === 'report' \? \([\s\S]*?<DocumentReport turmas=\{turmas\} partners=\{partners\} \/>\n      \) : \(\n        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">/,
  '      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">'
);

// 5. Remove the closing `)}` of the ternary at the end of the component
code = code.replace(
  /        <\/div>\n      \)\}\n    <\/div>\n  \);\n\}/,
  '        </div>\n    </div>\n  );\n}'
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
