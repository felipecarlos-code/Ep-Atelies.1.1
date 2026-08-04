const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(
  /\} catch \(err: any\) \{\n\s*console\.error\("\[Drive Document Analyze Error\]", err\);\n\s*return res\.status\(500\)\.json\(\{ success: false, error: err\.message \|\| "Erro desconhecido ao analisar o documento\." \}\);\n\s*\}/g,
  `} catch (err: any) {
      console.error("[Drive Document Analyze Error]", err);
      let errorMessage = err.message || "Erro desconhecido ao analisar o documento.";
      if (errorMessage.includes("quota") || errorMessage.includes("resource_exhausted") || errorMessage.includes("429")) {
        errorMessage = "A cota de uso da API (Gemini) foi atingida. Por favor, tente novamente mais tarde ou verifique os limites de uso na plataforma Google AI Studio.";
        return res.status(429).json({ success: false, error: errorMessage });
      }
      return res.status(500).json({ success: false, error: errorMessage });
    }`
);

fs.writeFileSync('./api/app.ts', code);
