const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

const regex = /<div className=\{`bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs \$\{viewMode === 'report' \? 'hidden' : ''\}`\}>\n      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">/g;

code = code.replace(regex, `<div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">`);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
