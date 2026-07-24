const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimEP.tsx', 'utf8');

const target = `<div className="bg-[#1a162b] p-1.5 rounded-lg border border-white/10 flex items-center gap-1">
            <button
              onClick={() => setLayoutMode('print')}
              className={\`flex items-center gap-2 px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer \${
                layoutMode === 'print' 
                  ? 'bg-[#ff4545] text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }\`}
            >
              <Printer size={13} />
              Boletim folha A4
            </button>
            <button
              onClick={() => setLayoutMode('print_alt')}
              className={\`flex items-center gap-2 px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer \${
                layoutMode === 'print_alt' 
                  ? 'bg-[#ff4545] text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }\`}
            >
              <Layers size={13} />
              Boletim A4 (Opção 2)
            </button>
            <button
              onClick={() => setLayoutMode('print_v3')}
              className={\`flex items-center gap-2 px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer \${
                layoutMode === 'print_v3' 
                  ? 'bg-[#ff4545] text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }\`}
            >
              <FileText size={13} />
              Boletim Oficial
            </button>
          </div>`;

const replacement = `<div className="bg-[#1a162b] p-1.5 rounded-lg border border-white/10 flex items-center gap-1">
            <button
              onClick={() => setLayoutMode('print_v3')}
              className={\`flex items-center gap-2 px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer \${
                layoutMode === 'print_v3' 
                  ? 'bg-[#ff4545] text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }\`}
            >
              <FileText size={13} />
              Boletim Oficial
            </button>
            <button
              onClick={() => setLayoutMode('print')}
              className={\`flex items-center gap-2 px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer \${
                layoutMode === 'print' 
                  ? 'bg-[#ff4545] text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }\`}
            >
              <Printer size={13} />
              Boletim folha A4
            </button>
            <button
              onClick={() => setLayoutMode('print_alt')}
              className={\`flex items-center gap-2 px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer \${
                layoutMode === 'print_alt' 
                  ? 'bg-[#ff4545] text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }\`}
            >
              <Layers size={13} />
              Boletim A4 (Opção 2)
            </button>
          </div>`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('./src/components/BoletimEP.tsx', code);
  console.log('Successfully reordered tabs');
} else {
  console.log('Target not found for reordering');
}
