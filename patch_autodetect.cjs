const fs = require('fs');
let code = fs.readFileSync('./src/components/TurmaManager.tsx', 'utf8');

const newAutoDetect = `export function autoDetectCourse(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  
  if (trimmed.startsWith('1') && !trimmed.toUpperCase().includes('AMD') && !trimmed.toUpperCase().includes('CCMD') && !trimmed.toUpperCase().includes('ECMD') && !trimmed.toUpperCase().includes('ESMD') && !trimmed.toUpperCase().includes('SIMD')) {
    return '1º Ano';
  }
  
  const upper = trimmed.toUpperCase();
  
  if (upper.includes('ECMD') || upper.includes('INEC') || upper.includes('ENGENHARIA DE COMPUTAÇÃO') || upper.includes('ENGENHARIA DE COMPUTACAO')) return 'Engenharia de Computação';
  if (upper.includes('ESMD') || upper.includes('INSI') || upper.includes('INSF') || upper.includes('ENGENHARIA DE SOFTWARE')) return 'Engenharia de Software';
  if (upper.includes('SIMD') || upper.includes('SISTEMA DA INFORMAÇÃO') || upper.includes('SISTEMAS DA INFORMAÇÃO') || upper.includes('SISTEMA DE INFORMAÇÃO') || upper.includes('SISTEMAS DE INFORMAÇÃO') || upper.includes('SISTEMAS DE INFORMACAO')) return 'Sistemas de Informação';
  if (upper.includes('CCMD') || upper.includes('INCC') || upper.includes('CIÊNCIA DA COMPUTAÇÃO') || upper.includes('CIENCIA DA COMPUTACAO')) return 'Ciência da Computação';
  if (upper.includes('AMD') || upper.includes('ADM') || upper.includes('ADMINISTRAÇÃO') || upper.includes('ADMINISTRACAO')) return 'Adm Tech';

  if (/\\bEC\\b/.test(upper) || /\\[EC\\]/.test(upper)) return 'Engenharia de Computação';
  if (/\\bES\\b/.test(upper) || /\\[ES\\]/.test(upper)) return 'Engenharia de Software';
  if (/\\bSI\\b/.test(upper) || /\\[SI\\]/.test(upper)) return 'Sistemas de Informação';
  if (/\\bCC\\b/.test(upper) || /\\[CC\\]/.test(upper)) return 'Ciência da Computação';
  
  return null;
}`;

code = code.replace(
  /export function autoDetectCourse[\s\S]*?return null;\n\}/,
  newAutoDetect
);

fs.writeFileSync('./src/components/TurmaManager.tsx', code);
