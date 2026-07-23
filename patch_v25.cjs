const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimEP.tsx', 'utf8');

// replace items-center with items-stretch for the cards grid
code = code.replace(/className="relative grid grid-cols-1 md:grid-cols-2 gap-4 my-4 flex-1 items-center z-10"/g, 'className="relative grid grid-cols-1 md:grid-cols-2 gap-4 my-4 flex-1 items-stretch z-10"');

// also replace min-h-[170px] with h-full or similar
code = code.replace(/className="bg-white rounded-lg p-4 flex items-stretch gap-4 hover:shadow-md transition-all shadow-sm border-l-4 relative min-h-\[170px\]"/g, 'className="bg-white rounded-lg p-4 flex items-stretch gap-4 hover:shadow-md transition-all shadow-sm border-l-4 relative h-full min-h-[170px]"');

// also for empty slot
code = code.replace(/className="border border-dashed border-white\/10 rounded-lg p-6 flex flex-col items-center justify-center text-slate-400 bg-white\/5 min-h-\[170px\]"/g, 'className="border border-dashed border-white/10 rounded-lg p-6 flex flex-col items-center justify-center text-slate-400 bg-white/5 h-full min-h-[170px]"');

fs.writeFileSync('./src/components/BoletimEP.tsx', code);
console.log('Patched grid in EP');
