const regex = /^(?:[1-4][a-zA-Z]{2,5}\d+)\s*(?:-\s*(.*))?$/i;
const cases = [
  "1AMD3 - Lógica para predição com Inteligência Artificial - 1º Ano",
  "2ESMD6 - Arquitetura e Modelagem de Software",
  "1CCMD2-Sistemas Inteligentes"
];
for(let c of cases) {
  const match = c.match(regex);
  let cleaned = (match && match[1]) ? match[1] : c;
  cleaned = cleaned.replace(/\s*-\s*[1-4]º\s*[a-zA-Z]*$/i, '').trim();
  console.log(`Original: ${c} \nCleaned:  ${cleaned}\n`);
}
