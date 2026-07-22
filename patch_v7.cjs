const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

// Replace chunk logic again to prevent empty pages
const chunkRegex = /const MAX_PER_PAGE = 6;[\s\S]*?const getQuarterText/m;

const chunkLogic = `const MAX_PER_PAGE = 6;
  
  const ano1 = activeAllocations.filter((a: any) => String(a.academicYear) === '1');
  const ano3 = activeAllocations.filter((a: any) => String(a.academicYear) === '3');
  const ano2 = activeAllocations.filter((a: any) => String(a.academicYear) === '2');

  const chunkArray = (arr: any[]) => {
    if (!arr || arr.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < arr.length; i += MAX_PER_PAGE) {
      chunks.push(arr.slice(i, i + MAX_PER_PAGE));
    }
    return chunks;
  };

  const pages = [
    ...chunkArray(ano1),
    ...chunkArray(ano3),
    ...chunkArray(ano2)
  ];
  
  // If no allocations at all, just show one empty page
  if (pages.length === 0) {
    pages.push([]);
  }

  const getQuarterText`;

code = code.replace(chunkRegex, chunkLogic);

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Replaced chunk array empty handling');
