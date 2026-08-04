const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  /const analyzeData = await analyzeRes\.json\(\);\n\s*if \(analyzeData\.success && analyzeData\.analysis\) \{/g,
  `const analyzeData = await analyzeRes.json();
            if (analyzeRes.status === 429 || (!analyzeData.success && (analyzeData.error?.includes('cota') || analyzeData.error?.includes('quota')))) {
              setBatchSyncLogs(prev => [...prev, { message: \`Cota de IA atingida. Interrompendo sincronização.\`, type: 'error' }]);
              setIsBatchSyncing(false);
              return;
            }
            if (analyzeData.success && analyzeData.analysis) {`
);

code = code.replace(
  /\} catch \(err: any\) \{\n\s*setBatchSyncLogs\(prev => \[\.\.\.prev, \{ message: \`Erro na pasta \$\{subfolder\.name\}: \$\{err\.message\}\`, type: 'error' \}\]\);\n\s*\}/g,
  `} catch (err: any) {
          setBatchSyncLogs(prev => [...prev, { message: \`Erro na pasta \${subfolder.name}: \${err.message}\`, type: 'error' }]);
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between folders to avoid rate limit`
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
