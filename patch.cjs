const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimEP.tsx', 'utf8');

const replacement = `      {/* Global CSS for physical paper print optimization */}
      {layoutMode === 'print_v3' ? (
        <style>{\`
          @media print {
            @page {
              size: 212mm 529mm !important;
              margin: 0 !important;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * { visibility: hidden; }
            #active-boletim-print-section, #active-boletim-print-section * { visibility: visible; }
            #active-boletim-print-section {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: white !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        \`}</style>
      ) : (
        <style>{\`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * { visibility: hidden; }
            #active-boletim-print-section, #active-boletim-print-section * { visibility: visible; }
            #active-boletim-print-section {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: white !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .boletim-print-page {
              width: 21cm !important;
              height: 29.6cm !important;
              max-height: 29.6cm !important;
              box-sizing: border-box !important;
              padding: 0.8cm 1cm !important;
              margin: 0 !important;
              page-break-after: always !important;
              break-after: page !important;
              overflow: hidden !important;
              display: flex !important;
              flex-direction: column !important;
              background: white !important;
              border: none !important;
              box-shadow: none !important;
            }
            .boletim-print-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
          }
        \`}</style>
      )}
    </div>
  );
}`;

const startRegex = /\{\/\* Global CSS for physical paper print optimization \*\/\}/;
const match = code.match(startRegex);
if (match) {
  const startIndex = match.index;
  const endIndex = code.lastIndexOf('</style>') + '</style>'.length + `\n      )}\n    </div>\n  );\n}`.length;
  // Let's just be careful and replace from startIndex to the end of the file since it's at the end.
  const replacedCode = code.substring(0, startIndex) + replacement;
  fs.writeFileSync('./src/components/BoletimEP.tsx', replacedCode);
  console.log('Replaced');
} else {
  console.log('Not found');
}
