const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimEP.tsx', 'utf8');

// Change initial state
code = code.replace(/const \[layoutMode, setLayoutMode\] = useState<'ppt' \| 'print' \| 'print_alt' \| 'print_v3'>\('print'\);/g, 
  "const [layoutMode, setLayoutMode] = useState<'ppt' | 'print' | 'print_alt' | 'print_v3'>('print_v3');");

// Change labels
code = code.replace(/Boletim A4 Oficial/g, 'Boletim folha A4');
code = code.replace(/Boletim Vertical \(V3\)/g, 'Boletim Oficial');

fs.writeFileSync('./src/components/BoletimEP.tsx', code);
console.log('Patched layout names and default mode');
